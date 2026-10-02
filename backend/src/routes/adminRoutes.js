import {validateWebsiteContent} from '../utils/websiteContent.js';
import {cmsAudit} from '../services/audit.js';
import {academyOverview} from '../services/academyOverview.js';
import {Router} from 'express';
import {uploadSingle,uploadAdmission,storeUpload} from '../services/uploads.js';
import {rateLimit} from '../middleware/rateLimit.js';
import {pagination,searchTerm,escapeRegex} from '../utils/business.js';
import {requireAuth,requireRole,normalizeRole} from '../middleware/auth.js';
import mongoose from 'mongoose';
import CourseAttempt from '../models/CourseAttempt.js';
import CourseCompletion from '../models/CourseCompletion.js';
import Progress from '../models/Progress.js';
import {httpError,payloadFor,siteValue} from '../utils/cmsValidation.js';
import {deleteUnusedMedia,lessonMediaIds} from '../utils/media.js';
import Invoice from '../models/Invoice.js';import User from '../models/User.js';import Course from '../models/Course.js';import Enrollment from '../models/Enrollment.js';import Subscription from '../models/Subscription.js';import Payment from '../models/Payment.js';import TeamMember from '../models/TeamMember.js';import SiteContent from '../models/SiteContent.js';import Event from '../models/Event.js';import Review from '../models/Review.js';import Notification from '../models/Notification.js';import Module from '../models/Module.js';import Lesson from '../models/Lesson.js';
const r=Router();
r.use(requireAuth,requireRole('client_admin','super_admin','admin','administrator','client-admin','superadmin'));
r.get('/system-overview',requireRole('super_admin'),async(req,res)=>res.json(await academyOverview(false)));
r.use(cmsAudit);
r.get('/reviews',requireRole('super_admin'),async(req,res)=>{
 const {page,pageSize,skip}=pagination(req.query),q=searchTerm(req.query.q),filter={};
 if(q){const regex={$regex:escapeRegex(q),$options:'i'};filter.$or=[{name:regex},{message:regex}];}
 if(req.query.status){const status=String(req.query.status);if(!['approved','rejected'].includes(status))throw httpError(400,'Invalid review visibility.');filter.status=status;}
 if(req.query.rating){const rating=Number(req.query.rating);if(!Number.isInteger(rating)||rating<1||rating>5)throw httpError(400,'Invalid review rating.');filter.rating=rating;}
 const [items,total]=await Promise.all([Review.find(filter).select('name rating message status createdAt updatedAt').sort({updatedAt:-1,createdAt:-1,_id:-1}).skip(skip).limit(pageSize).lean(),Review.countDocuments(filter)]);
 res.set('Cache-Control','private, no-store');res.json({success:true,items,total,page,pageSize});
});
r.patch('/reviews/:id',requireRole('super_admin'),rateLimit('super-review-edit',60,60000,{authenticated:true}),async(req,res)=>{
 const item=await Review.findById(id(req.params.id));if(!item)throw httpError(404,'Review not found.');
 const body=payloadFor('reviews',req.body,{previous:item});
 if('name' in body){body.name=String(body.name).trim();if(body.name.length<2||body.name.length>120)throw httpError(400,'Reviewer name must be 2–120 characters.');}
 if('message' in body){body.message=String(body.message).trim();if(body.message.length<10||body.message.length>2000)throw httpError(400,'Review must be 10–2000 characters.');}
 if('rating' in body&&(!Number.isInteger(body.rating)||body.rating<1||body.rating>5))throw httpError(400,'Choose a rating from 1 to 5.');
 if('status' in body&&!['approved','rejected'].includes(body.status))throw httpError(400,'Choose visible or hidden.');
 item.set(body);await item.save();res.json({success:true,item});
});
r.delete('/reviews/:id',requireRole('super_admin'),rateLimit('super-review-delete',30,60000,{authenticated:true}),async(req,res)=>{
 const item=await Review.findByIdAndDelete(id(req.params.id));if(!item)throw httpError(404,'Review not found.');res.json({success:true});
});
// Restrict the client at the API as well as the sidebar. No access via a manually typed URL.
r.use('/content/:kind',(req,res,next)=>{
 if(normalizeRole(req.user.role)==='client_admin'&&!['courses','team','events'].includes(req.params.kind))return next(httpError(403,'This content is managed by the website administrator.'));
 next();
});

const teamRank={founder:0,faculty:1,board:2,core:3};
const sortTeam=(a,b)=>(teamRank[a.category]??9)-(teamRank[b.category]??9)||(Number(a.order)||0)-(Number(b.order)||0)||String(a.name||'').localeCompare(String(b.name||''));
const models = {courses:Course, team:TeamMember, events:Event};
function model(kind) { if (!models[kind]) throw httpError(404,'Unknown content type.'); return models[kind]; }
function id(value) { if (!mongoose.isValidObjectId(value)) throw httpError(400,'Invalid record identifier.'); return value; }
async function record(Model, value) { const item=await Model.findById(id(value)); if(!item) throw httpError(404,'Record not found.'); return item; }
async function nextOrder(Model, query) { const last=await Model.findOne(query).sort({order:-1}).lean(); return (Number(last?.order)||0)+1; }
function contentMedia(kind,item) { return kind==='courses'?[item.thumbnailFileId,...(item.gallery||[]).map(g=>g.fileId)]:[item.imageFileId,item.imageOriginalFileId]; }
r.get('/content/:kind',async(req,res)=>{
 const kind=req.params.kind,M=model(kind),{page,pageSize,skip}=pagination(req.query),q=searchTerm(req.query.q),filter={};
 if(kind==='courses')filter.archivedAt=null;
 if(q){const regex={$regex:escapeRegex(q),$options:'i'};filter.$or=(kind==='team'?['name','slug','role']:['title','slug']).map(f=>({[f]:regex}));}
 const state=req.query.status;
 if(state&&state!=='all'){
  const options={courses:['draft','published'],team:['active','hidden'],events:['draft','published']};
  if(!options[kind].includes(state))throw httpError(400,'Invalid content status.');
  if(kind==='courses')filter.published=state==='published';else if(kind==='team')filter.active=state==='active';else filter.status=state;
 }
 let items,total;if(kind==='team'){const all=(await M.find(filter).lean()).sort(sortTeam);total=all.length;items=all.slice(skip,skip+pageSize);}else [items,total]=await Promise.all([M.find(filter).sort({createdAt:-1,_id:-1}).skip(skip).limit(pageSize).lean(),M.countDocuments(filter)]);
 res.json({success:true,items,total,page,pageSize});
});
r.post('/content/:kind',async(req,res)=>{
  const kind=req.params.kind;
  if(kind==='reviews')throw httpError(405,'Learner reviews can only be created by students.');
  const M=model(kind);
  const body=payloadFor(kind,req.body,{creating:true});
  res.status(201).json({success:true,item:await M.create(body)});
});
r.patch('/content/:kind/:id',async(req,res)=>{
  const kind=req.params.kind, M=model(kind), before=await record(M,req.params.id);
  const body=payloadFor(kind,req.body,{previous:before});
  const item=await M.findByIdAndUpdate(before._id,{$set:body},{new:true,runValidators:true});
  await deleteUnusedMedia(contentMedia(kind,before));
  res.json({success:true,item});
});
r.delete('/content/:kind/:id',async(req,res)=>{
  const kind=req.params.kind,M=model(kind),item=await record(M,req.params.id);
  let media=contentMedia(kind,item);
  if(kind==='courses'){
    // Never destroy paid/enrollment/certificate history. From the admin UI, Delete
    // behaves as a safe archive when history exists: it disappears from CMS/public
    // listings immediately while audit/payment/progress records remain intact.
    const hasHistory=Boolean(await CourseAttempt.exists({course:item._id}) || await CourseCompletion.exists({course:item._id}) || await Enrollment.exists({courseSlug:item.slug}) || await Payment.exists({courseSlug:item.slug}) || await Invoice.exists({courseSlug:item.slug}));
    if(hasHistory){
      await Course.updateOne({_id:item._id},{$set:{published:false,featured:false,archivedAt:new Date(),archivedBy:req.user._id||null}});
      return res.json({success:true,archived:true});
    }
    const modules=await Module.find({course:item._id}).lean();
    const lessons=await Lesson.find({module:{$in:modules.map(m=>m._id)}}).lean();
    media.push(...lessons.flatMap(lessonMediaIds));
    await Progress.deleteMany({course:item._id});
    await Lesson.deleteMany({module:{$in:modules.map(m=>m._id)}});
    await Module.deleteMany({course:item._id});
  }
  await M.deleteOne({_id:item._id}); await deleteUnusedMedia(media); res.json({success:true,archived:false});
});
r.get('/site',async(req,res)=>{
  const role=normalizeRole(req.user.role||req.user.normalizedRole);
  const query={key:{$in:role==='super_admin'?['membershipPlans','footerSocial','websiteContent']:['membershipPlans']}};
  res.json({success:true,items:await SiteContent.find(query).lean()});
});
r.put('/site/:key',async(req,res)=>{
  if(normalizeRole(req.user.role||req.user.normalizedRole)!=='super_admin'&&req.params.key!=='membershipPlans')throw httpError(403,'Only Academy Plans can be edited from this client workspace.');
  if(req.params.key==='websiteContent'){
    const revision=req.body.revision;if(!Number.isInteger(revision)||revision<0)throw httpError(400,'Reload the website editor before saving.');
    const value=validateWebsiteContent(req.body.value),before=await SiteContent.findOne({key:'websiteContent'}).lean();
    if((before?.revision||0)!==revision)throw httpError(409,'Website content changed in another session. Reload before saving.');
    let item;if(!before){try{item=await SiteContent.create({key:'websiteContent',value,revision:1});}catch(e){if(e.code===11000)throw httpError(409,'Website content changed. Reload before saving.');throw e;}}
    else{item=await SiteContent.findOneAndUpdate({_id:before._id,...(revision===0?{$or:[{revision:0},{revision:{$exists:false}}]}:{revision})},{$set:{value},$inc:{revision:1}},{new:true,runValidators:true});if(!item)throw httpError(409,'Website content changed. Reload before saving.');}
    return res.json({success:true,item});
  }
  const value=siteValue(req.params.key,req.body.value);
  const item=await SiteContent.findOneAndUpdate({key:req.params.key},{$set:{value}},{upsert:true,new:true,runValidators:true});
  res.json({success:true,item});
});
r.get('/course-builder/:id',async(req,res)=>{
  const course=await record(Course,req.params.id);
  const modules=await Module.find({course:course._id}).sort({order:1,_id:1}).lean();
  const lessons=await Lesson.find({module:{$in:modules.map(m=>m._id)}}).sort({order:1,_id:1}).lean();
  res.json({success:true,course,modules:modules.map(m=>({...m,lessons:lessons.filter(l=>String(l.module)===String(m._id))}))});
});
r.post('/course-builder/:courseId/modules',async(req,res)=>{
  const course=await record(Course,req.params.courseId);
  const body=payloadFor('modules',{title:'New Module',...req.body},{creating:true});
  res.status(201).json({success:true,item:await Module.create({...body,course:course._id,order:await nextOrder(Module,{course:course._id})})});
});
r.patch('/modules/:id',async(req,res)=>{ const item=await record(Module,req.params.id); item.set(payloadFor('modules',req.body)); await item.save(); res.json({success:true,item}); });
r.delete('/modules/:id',async(req,res)=>{
  const item=await record(Module,req.params.id), lessons=await Lesson.find({module:item._id}).lean();
  await Progress.deleteMany({lesson:{$in:lessons.map(l=>l._id)}}); await Lesson.deleteMany({module:item._id}); await item.deleteOne();
  await deleteUnusedMedia(lessons.flatMap(lessonMediaIds)); res.json({success:true});
});
r.post('/modules/:moduleId/lessons',async(req,res)=>{
  const module=await record(Module,req.params.moduleId);
  const body=payloadFor('lessons',{title:'New Lesson',...req.body},{creating:true});
  res.status(201).json({success:true,item:await Lesson.create({...body,published:body.published===true,module:module._id,order:await nextOrder(Lesson,{module:module._id})})});
});
r.patch('/lessons/:id',async(req,res)=>{
  const item=await record(Lesson,req.params.id),media=lessonMediaIds(item);
  item.set(payloadFor('lessons',req.body)); await item.save(); await deleteUnusedMedia(media); res.json({success:true,item});
});
r.post('/lessons/:id/duplicate',async(req,res)=>{
  const original=await record(Lesson,req.params.id),body=original.toObject();
  for(const key of ['_id','__v','createdAt','updatedAt']) delete body[key];
  body.title=`${body.title} (copy)`; body.published=false; body.order=await nextOrder(Lesson,{module:body.module});
  body.contentBlocks=(body.contentBlocks||[]).map(({_id,...block})=>block);
  res.status(201).json({success:true,item:await Lesson.create(body)});
});
r.delete('/lessons/:id',async(req,res)=>{
  const item=await record(Lesson,req.params.id); await Progress.deleteMany({lesson:item._id}); await item.deleteOne();
  await deleteUnusedMedia(lessonMediaIds(item)); res.json({success:true});
});
// Reorder only a complete set belonging to this parent; reject cross-course identifiers.
async function reorder(Model,parentField,parentId,ids){
  if(!Array.isArray(ids)||ids.some(x=>typeof x!=='string'||!mongoose.isValidObjectId(x))||new Set(ids).size!==ids.length) throw httpError(400,'Invalid item order.');
  const existing=await Model.find({[parentField]:parentId}).select('_id').lean();
  if(existing.length!==ids.length||existing.some(x=>!ids.includes(String(x._id)))) throw httpError(409,'The curriculum changed. Reload it before reordering.');
  if(ids.length) await Model.bulkWrite(ids.map((value,index)=>({updateOne:{filter:{_id:value,[parentField]:parentId},update:{$set:{order:index+1}}}})));
}
r.put('/course-builder/:id/module-order',async(req,res)=>{ await record(Course,req.params.id); await reorder(Module,'course',req.params.id,req.body.ids); res.json({success:true}); });
r.put('/modules/:id/lesson-order',async(req,res)=>{ await record(Module,req.params.id); await reorder(Lesson,'module',req.params.id,req.body.ids); res.json({success:true}); });
r.post('/upload',rateLimit('media-upload',20,60000),uploadAdmission,uploadSingle,storeUpload);
export default r;
