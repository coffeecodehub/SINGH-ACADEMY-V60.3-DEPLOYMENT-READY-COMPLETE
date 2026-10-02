import {Router} from 'express';
import {requireAuth,requireRole} from '../middleware/auth.js';
import {rateLimit} from '../middleware/rateLimit.js';
import {dashboard,listRecords,customerDetail,billingOptions,exportCsv,objectId,capabilities} from '../services/businessRead.js';
import {createInvoice,recordPayment,recordRefund,updateCustomer,accountAction,membershipAction,invoiceAction,enrollmentAction} from '../services/businessWrite.js';
import {businessError,text,invoiceBalance,toCsv} from '../utils/business.js';
import {audit} from '../services/audit.js';
import {confirmIdentity} from '../services/identity.js';
import {sendAcademyEmail} from '../utils/mailer.js';
import Invoice from '../models/Invoice.js';
import PurchaseRequest from '../models/PurchaseRequest.js';
import ContactMessage from '../models/ContactMessage.js';
import {transaction} from '../services/businessWrite.js';
import {pagination,searchTerm,escapeRegex} from '../utils/business.js';
import Notification from '../models/Notification.js';
const r=Router();
// Builder-team Super Admin is intentionally NOT allowed into operational business APIs.
r.use(requireAuth,requireRole('client_admin'));
r.get('/messages',async(req,res)=>{
 const {page,pageSize,skip}=pagination(req.query),filter={};
 if(req.query.status){if(!['new','responded','closed'].includes(req.query.status))throw businessError('Invalid message status.');filter.status=req.query.status;}
 const [items,total]=await Promise.all([ContactMessage.find(filter).sort({createdAt:-1,_id:-1}).skip(skip).limit(pageSize).lean(),ContactMessage.countDocuments(filter)]);
 res.json({success:true,items,total,page,pageSize});
});
r.get('/requests',async(req,res)=>{
 const {page,pageSize,skip}=pagination(req.query),q=searchTerm(req.query.q),filter={};
 if(req.query.status){if(!['new','contacted','invoiced','closed'].includes(req.query.status))throw businessError('Invalid request status.');filter.status=req.query.status;}
 if(q)filter.title={$regex:escapeRegex(q),$options:'i'};
 const [items,total]=await Promise.all([PurchaseRequest.find(filter).select('-activeKey').populate('user','name email').populate('invoice','number status').sort({createdAt:-1,_id:-1}).skip(skip).limit(pageSize).lean(),PurchaseRequest.countDocuments(filter)]);
 res.json({success:true,items,total,page,pageSize});
});
r.get('/overview',async(req,res)=>res.json(await dashboard(req.query)));
r.get('/capabilities',async(req,res)=>res.json({success:true,...await capabilities()}));
r.get('/options',async(req,res)=>res.json(await billingOptions(req.query)));
r.get('/customers/:id',async(req,res)=>res.json(await customerDetail(req.params.id)));
r.get('/records/:kind',async(req,res)=>res.json(await listRecords(req.params.kind,req.query)));
r.get('/exports/:kind',async(req,res)=>{
 const {rows}=await listRecords(req.params.kind,req.query,{exporting:true});
 await audit(req,{scope:'business',action:'report.exported',entityType:req.params.kind,reason:'Authorized CSV export',changes:{rows:rows.length}});
 res.json({success:true,filename:`singh-academy-${req.params.kind}-${new Date().toISOString().slice(0,10)}.csv`,csv:exportCsv(req.params.kind,rows),rows:rows.length});
});
r.get('/reports/export',async(req,res)=>{
 const data=await dashboard(req.query),rows=data.trend.map(d=>[d.date,(d.grossMinor/100).toFixed(2),(d.refundMinor/100).toFixed(2),(d.netMinor/100).toFixed(2),data.currency]);
 await audit(req,{scope:'business',action:'report.exported',entityType:'daily_collections',changes:{from:data.range.fromDate,to:data.range.toDate,currency:data.currency,rows:rows.length}});
 res.json({success:true,filename:`singh-academy-daily-collections-${data.currency}.csv`,csv:toCsv(['Date UTC','Recorded gross collections','Recorded refunds','Net collections','Currency'],rows)});
});
r.use(rateLimit('business-write-ip',60,900000),rateLimit('business-write-account',60,900000,{authenticated:true}));
const created=fn=>async(req,res)=>{const result=await fn(req);res.status(result.replayed?200:201).json({success:true,...result});};
r.post('/messages/:id/actions',async(req,res)=>{
 const status=req.body?.status;if(!['new','responded','closed'].includes(status))throw businessError('Choose a valid message status.');
 const item=await transaction(async session=>{
  const updated=await ContactMessage.findByIdAndUpdate(objectId(req.params.id),{$set:{status,updatedBy:req.user._id}},{new:true,runValidators:true,session});
  if(!updated)throw businessError('Message not found.',404);
  await audit(req,{scope:'business',action:'contact.'+status,entityType:'contact_message',entityId:String(updated._id)},session);return updated;
 });res.json({success:true,item});
});
r.post('/requests/:id/actions',async(req,res)=>{
 await confirmIdentity(req);const reason=text(req.body?.reason,'Reason',500,5),action=req.body?.action;
 if(!['contacted','closed'].includes(action))throw businessError('Choose contacted or closed.');
 const item=await transaction(async session=>{
  const request=await PurchaseRequest.findById(objectId(req.params.id)).session(session);
  if(!request)throw businessError('Enrollment request not found.',404);
  if(request.status==='invoiced'&&action!=='closed')throw businessError('An invoice already exists for this request.',409);
  request.status=action;request.updatedBy=req.user._id;if(action==='closed'){request.activeKey=undefined;request.closedAt=new Date();}await request.save({session});
  await audit(req,{scope:'business',action:'request.'+action,targetUser:request.user,entityType:'enrollment_request',entityId:String(request._id),reason},session);return request;
 });
 res.json({success:true,item,message:'Request updated. No payment or access was created.'});
});
r.post('/invoices',created(createInvoice));
r.post('/payments',created(recordPayment));
r.post('/refunds',created(recordRefund));
r.patch('/customers/:id',async(req,res)=>res.json({success:true,...await updateCustomer(req,req.params.id)}));
r.post('/customers/:id/actions',async(req,res)=>res.json({success:true,...await accountAction(req,req.params.id)}));
r.post('/subscriptions/:id/actions',async(req,res)=>res.json({success:true,...await membershipAction(req,req.params.id)}));
r.post('/invoices/:id/actions',async(req,res)=>res.json({success:true,...await invoiceAction(req,req.params.id)}));
r.post('/enrollments',async(req,res)=>res.status(201).json({success:true,...await enrollmentAction(req)}));
r.post('/enrollments/:id/actions',async(req,res)=>res.json({success:true,...await enrollmentAction(req,req.params.id)}));
r.patch('/notifications/:id/read',async(req,res)=>{const item=await Notification.findByIdAndUpdate(objectId(req.params.id),{$set:{read:true}},{new:true});if(!item)throw businessError('Notification not found.',404);res.json({success:true,item});});
r.post('/notifications/read-all',async(req,res)=>{await Notification.updateMany({read:false},{$set:{read:true}});res.json({success:true,message:'Shared business inbox marked as read.'});});
r.post('/invoices/:id/remind',rateLimit('invoice-reminder-ip',8,3600000),async(req,res)=>{
 await confirmIdentity(req);const reason=text(req.body?.reason,'Reason',500,5);
 const invoice=await Invoice.findById(objectId(req.params.id)).populate('user','name email emailVerified');
 if(!invoice||invoice.status!=='open'||invoiceBalance(invoice)<=0)throw businessError('Only outstanding invoices can receive a reminder.',409);
 if(!invoice.user?.emailVerified)throw businessError('Verify the student email before sending billing reminders.',409);
 const now=new Date(),lock=await Invoice.updateOne({_id:invoice._id,status:'open',$or:[{lastReminderAt:null},{lastReminderAt:{$lt:new Date(now.getTime()-86400000)}}]},{$set:{lastReminderAt:now}});
 if(lock.modifiedCount!==1)throw businessError('A reminder for this invoice was already requested in the last 24 hours.',409);
 let mailAccepted=false;
 try{
  await audit(req,{scope:'business',action:'invoice.reminder_requested',targetUser:invoice.user._id,entityType:'invoice',entityId:String(invoice._id),reason});
  const result=await sendAcademyEmail({to:invoice.user.email,subject:`Singh Academy — invoice ${invoice.number}`,text:`Hello ${invoice.user.name},\n\nInvoice: ${invoice.number}\nItem: ${invoice.title}\nOutstanding: ${invoice.currency} ${(invoiceBalance(invoice)/100).toFixed(2)}\nDue date: ${invoice.dueAt.toISOString().slice(0,10)} (UTC)\n\nPlease contact the Academy to arrange payment. This message does not charge your account.\n\nSingh Academy`});
  mailAccepted=true;
  await audit(req,{scope:'business',action:result.dev?'invoice.reminder_previewed':'invoice.reminder_sent',targetUser:invoice.user._id,entityType:'invoice',entityId:String(invoice._id)});
  res.json({success:true,message:result.dev?'Development email preview written to the backend console. No email was sent.':'Reminder submitted to the configured mail server.'});
 }catch(e){if(!mailAccepted)await Invoice.updateOne({_id:invoice._id,lastReminderAt:now},{$unset:{lastReminderAt:1}});throw businessError('Reminder delivery was not confirmed. Check SMTP and the business activity log before retrying.',503);}
});
export default r;
