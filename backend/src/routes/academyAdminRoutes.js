import {Router} from 'express';import {requireAuth,requireRole} from '../middleware/auth.js';
import {pagination,businessError,escapeRegex} from '../utils/business.js';import {objectId} from '../services/businessRead.js';
import Course from '../models/Course.js';import TeamMember from '../models/TeamMember.js';import Event from '../models/Event.js';
import Notification from '../models/Notification.js';import CourseCompletion from '../models/CourseCompletion.js';
import {rateLimit} from '../middleware/rateLimit.js';
import {academyOverview} from '../services/academyOverview.js';
import {subscriptionFilters} from '../utils/adminSubscriptions.js';
import {subscriptionDisplay} from '../utils/subscriptionDisplay.js';
import Subscription from '../models/Subscription.js';import User from '../models/User.js';import SiteContent from '../models/SiteContent.js';import ContactMessage from '../models/ContactMessage.js';import Review from '../models/Review.js';import AdminNavState from '../models/AdminNavState.js';
const r=Router();r.use(requireAuth,requireRole('client_admin'));
const notificationFilter={type:{$in:['course_completed','certificate_issued','course_retry','certificate_revoked']}};
r.get('/overview',async(req,res)=>res.json(await academyOverview(true)));
const navSections={students:'studentsSeenAt',forms:'formsSeenAt',reviews:'reviewsSeenAt',subscriptions:'subscriptionsSeenAt',certificates:'certificatesSeenAt',notifications:'notificationsSeenAt'};
function after(date){return date?{$gt:new Date(date)}:{$gt:new Date(0)};}
r.get('/nav-counts',async(req,res)=>{
 const state=await AdminNavState.findOne({user:req.user._id}).lean();
 const [students,forms,reviews,subscriptions,certificates,notifications]=await Promise.all([
  User.countDocuments({role:'student',$or:[{createdAt:after(state?.studentsSeenAt)},{lastLoginAt:after(state?.studentsSeenAt)}]}),
  ContactMessage.countDocuments({createdAt:after(state?.formsSeenAt)}),
  Review.countDocuments({createdAt:after(state?.reviewsSeenAt)}),
  Subscription.countDocuments({createdAt:after(state?.subscriptionsSeenAt)}),
  CourseCompletion.countDocuments({completedAt:after(state?.certificatesSeenAt)}),
  Notification.countDocuments({...notificationFilter,createdAt:after(state?.notificationsSeenAt)})
 ]);
 res.json({success:true,counts:{students,forms,reviews,subscriptions,certificates,notifications}});
});
r.post('/nav-seen/:section',rateLimit('academy-nav-seen',120,60000,{authenticated:true}),async(req,res)=>{
 const field=navSections[req.params.section];if(!field)throw businessError('Unknown admin section.',400);
 await AdminNavState.findOneAndUpdate({user:req.user._id},{$set:{[field]:new Date()}},{upsert:true,new:true,setDefaultsOnInsert:true});
 res.json({success:true});
});
r.get('/students',async(req,res)=>{
 const {page,pageSize,skip}=pagination(req.query),filter={role:'student'};if(req.query.q){const q=String(req.query.q).slice(0,120).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');filter.$or=[{name:{$regex:q,$options:'i'}},{email:{$regex:q,$options:'i'}}];}
 const [items,total]=await Promise.all([User.find(filter).select('name email status createdAt lastLoginAt loginCount').sort({createdAt:-1,_id:-1}).skip(skip).limit(pageSize).lean(),User.countDocuments(filter)]);
 res.json({success:true,items,total,page,pageSize});
});
r.get('/forms',async(req,res)=>{
 const {page,pageSize,skip}=pagination(req.query),filter={};if(req.query.status){if(!['new','responded','closed'].includes(String(req.query.status)))throw businessError('Invalid form status.',400);filter.status=String(req.query.status);}if(req.query.q){const q=String(req.query.q).slice(0,120).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');filter.$or=[{name:{$regex:q,$options:'i'}},{email:{$regex:q,$options:'i'}},{topic:{$regex:q,$options:'i'}},{message:{$regex:q,$options:'i'}}];}
 const [items,total,newCount]=await Promise.all([ContactMessage.find(filter).sort({createdAt:-1,_id:-1}).skip(skip).limit(pageSize).lean(),ContactMessage.countDocuments(filter),ContactMessage.countDocuments({status:'new'})]);
 res.json({success:true,items,total,newCount,page,pageSize});
});
r.get('/reviews',async(req,res)=>{
 const {page,pageSize,skip}=pagination(req.query),filter={};
 if(req.query.q){const q=String(req.query.q).slice(0,120);const regex={$regex:escapeRegex(q),$options:'i'};filter.$or=[{name:regex},{message:regex}];}
 if(req.query.status){const status=String(req.query.status);if(!['approved','rejected'].includes(status))throw businessError('Invalid review visibility.',400);filter.status=status;}
 if(req.query.rating){const rating=Number(req.query.rating);if(!Number.isInteger(rating)||rating<1||rating>5)throw businessError('Invalid review rating.',400);filter.rating=rating;}
 const [items,total]=await Promise.all([Review.find(filter).select('name rating message status createdAt updatedAt').sort({updatedAt:-1,createdAt:-1,_id:-1}).skip(skip).limit(pageSize).lean(),Review.countDocuments(filter)]);
 res.set('Cache-Control','private, no-store');res.json({success:true,items,total,page,pageSize});
});
r.patch('/forms/:id/status',rateLimit('academy-form-status',60,60000,{authenticated:true}),async(req,res)=>{
 const status=String(req.body?.status||'');if(!['new','responded','closed'].includes(status))throw businessError('Choose new, responded or closed.',400);
 const item=await ContactMessage.findOneAndUpdate({_id:objectId(req.params.id)},{$set:{status,updatedBy:req.user._id}},{new:true});if(!item)throw businessError('Form submission not found.',404);res.json({success:true,item});
});

r.get('/notifications',async(req,res)=>{const {page,pageSize,skip}=pagination(req.query),filter={...notificationFilter};if(req.query.unread==='true')filter.read=false;const [items,total,unread]=await Promise.all([Notification.find(filter).select('title message type user entityId link read createdAt').sort({createdAt:-1,_id:-1}).skip(skip).limit(pageSize).lean(),Notification.countDocuments(filter),Notification.countDocuments({...notificationFilter,read:false})]);res.json({success:true,items,total,page,pageSize,unread});});
r.patch('/notifications/:id/read',rateLimit('academy-notification',100,60000,{authenticated:true}),async(req,res)=>{const item=await Notification.findOneAndUpdate({_id:objectId(req.params.id),...notificationFilter},{$set:{read:true}},{new:true});if(!item)throw businessError('Notification not found.',404);res.json({success:true});});
r.get('/subscriptions',async(req,res)=>{
 const {page,pageSize,skip}=pagination(req.query),now=new Date(),{filter,search}=subscriptionFilters(req.query,now);
 let searchTruncated=false;
 if(search){const users=await User.find({role:'student',$or:[{name:search},{email:search}]}).select('_id').limit(1001).lean();searchTruncated=users.length>1000;const match={$or:[{plan:search},{user:{$in:users.slice(0,1000).map(u=>u._id)}}]};filter.$and=[match];}
 const [items,total,site]=await Promise.all([Subscription.find(filter).select('user plan status startsAt endsAt durationMonths invoice createdAt testMode currency priceMinor').populate('user','name email status').populate('invoice','number paidAt totalMinor currency').sort({createdAt:-1,_id:-1}).skip(skip).limit(pageSize).lean(),Subscription.countDocuments(filter),SiteContent.findOne({key:'membershipPlans'}).select('value').lean()]);
 res.json({success:true,items:items.map(t=>({...t,...subscriptionDisplay(t,now),entryDate:t.createdAt,subscriptionDate:t.invoice?.paidAt||null})),total,page,pageSize,plans:(Array.isArray(site?.value)?site.value:[]).map(p=>p.name),serverNow:now,searchLimit:1000,searchTruncated});
});
export default r;
