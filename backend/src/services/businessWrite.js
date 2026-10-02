import mongoose from 'mongoose';
import crypto from 'node:crypto';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';
import PurchaseRequest from '../models/PurchaseRequest.js';
import Payment from '../models/Payment.js';
import Refund from '../models/Refund.js';
import Subscription from '../models/Subscription.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import SiteContent from '../models/SiteContent.js';
import Notification from '../models/Notification.js';
import {confirmIdentity} from './identity.js';
import {revokeUserSessions} from './sessions.js';
import {syncMembershipCourseEnrollments} from './membershipEnrollments.js';
import {audit} from './audit.js';
import {objectId,capabilities} from './businessRead.js';
import {hashToken} from '../utils/security.js';
import {businessError,text,currency,toMinor,strictDate,dueDate,addMonths,afterDays,requestKey,stableJson,invoiceBalance,subscriptionState,enrollmentState} from '../utils/business.js';
export async function transaction(work){
 if(!(await capabilities()).transactions)throw businessError('Payment and course-review writes require MongoDB Atlas or a replica set. No changes were written. See START-HERE-V48.md.',503);
 try{return await mongoose.connection.transaction(work,{readPreference:'primary',writeConcern:{w:'majority'}});}
 catch(e){if(e.code===20||/Transaction numbers are only allowed/.test(e.message||''))throw businessError('MongoDB transactions require Atlas or a replica set. No changes were written.',503);if(e.code===11000)throw businessError('This request or payment reference already exists. Refresh the records before retrying.',409);throw e;}
}
async function student(id,session){const user=await User.findOne({_id:objectId(id),role:'student'}).session(session);if(!user)throw businessError('Student account not found.',404);return user;}
const reason=req=>text(req.body?.reason,'Reason',500,5);
function fingerprint(req,action,payload){return hashToken(stableJson({actor:String(req.user._id),action,payload}));}
async function existing(Model,key,fp,session){const doc=await Model.findOne({requestKey:key}).session(session);if(doc&&doc.requestFingerprint!==fp)throw businessError('This request key was already used for different data. Open a fresh form.',409);return doc;}
async function notify(session,user,type,title,message){await Notification.create([{user,type,title,message}],{session});}
const createOne=async(Model,body,session)=>(await Model.create([body],{session}))[0];
function receivedDate(value,label='Received date'){
 const date=strictDate(value,label),today=new Date();today.setUTCHours(23,59,59,999);
 if(date>today)throw businessError(`${label} cannot be in the future.`);if(date.getUTCFullYear()<2000)throw businessError(`${label} must be in 2000 or later.`);return date;
}
function safeEnd(existing,start,days){
 if(existing&&enrollmentState(existing)==='scheduled')throw businessError('Scheduled course access already exists. Resolve that record before another purchase.',409);
 const now=new Date();const active=existing&&enrollmentState(existing,now)==='active';
 if(active&&!existing.accessExpiresAt)throw businessError('This student already has course access with no expiry. Do not record a duplicate purchase.',409);
 if(active&&start>existing.accessExpiresAt)throw businessError('A renewal cannot bridge a future access gap. Set the renewal start to the current course expiry.',409);
 const renewalStart=active&&existing.accessExpiresAt>start?existing.accessExpiresAt:start;
 return {startsAt:active?existing.accessStartsAt:start,endsAt:afterDays(renewalStart,days)};
}
export async function createInvoice(req){
 await confirmIdentity(req);const key=requestKey(req),why=reason(req),body=req.body||{};
 const kind=text(body.kind,'Product type',20,1);if(!['course','membership'].includes(kind))throw businessError('Choose a course or membership.');
 const userId=text(body.userId,'Student',24,24),startsAt=strictDate(body.startDate,'Access start'),dueAt=dueDate(body.dueDate);
 const fp=fingerprint(req,'invoice.create',{userId,kind,product:body.product,amount:body.amount,currency:body.currency,startDate:body.startDate,dueDate:body.dueDate,accessDays:body.accessDays,renewalOf:body.renewalOf||null,purchaseRequestId:body.purchaseRequestId||null,why});
 return transaction(async session=>{
  const previous=await existing(Invoice,key,fp,session);if(previous)return {item:previous,replayed:true};
  let purchaseRequest=null;
  if(body.purchaseRequestId){
   purchaseRequest=await PurchaseRequest.findOne({_id:objectId(body.purchaseRequestId),user:objectId(userId),kind,product:body.product,status:{$in:['new','contacted']}}).session(session);
   if(!purchaseRequest)throw businessError('This request has changed, is closed, or already has an invoice. Refresh it first.',409);
  }
  const user=await student(userId,session);if(user.status==='blocked')throw businessError('Unblock the student before issuing new access.',409);
  let title,courseSlug,planName,durationMonths,accessDays,baseCurrency='USD',baseAmount;
  if(kind==='course'){
   courseSlug=text(body.product,'Course',180,1);const course=await Course.findOne({slug:courseSlug,published:true}).session(session);if(!course)throw businessError('Published course not found.',404);
   title=course.title;baseCurrency=course.currency||'USD';baseAmount=course.salePrice??course.price;
   accessDays=Number(body.accessDays);afterDays(startsAt,accessDays);
   const current=await Enrollment.findOne({user:user._id,courseSlug}).session(session);safeEnd(current,startsAt,accessDays);
  }else{
   planName=text(body.product,'Membership plan',200,1);const settings=await SiteContent.findOne({key:'membershipPlans'}).session(session);
   const plan=(Array.isArray(settings?.value)?settings.value:[]).find(p=>p.name===planName&&p.active!==false);
   if(!plan)throw businessError('Active membership plan not found. Add it in Academy Plans first.',404);
   title=planName;durationMonths=Number(plan.durationMonths||(plan.period==='year'?12:1));addMonths(startsAt,durationMonths);baseAmount=plan.price;
  }
  let renewalOf;
  if(body.renewalOf){if(kind!=='membership')throw businessError('Only memberships use a membership renewal link.');
   const term=await Subscription.findOne({_id:objectId(body.renewalOf),user:user._id}).session(session);if(!term)throw businessError('Original membership was not found.',404);
   if(term.stripeSubscriptionId)throw businessError('Manage this provider subscription in its payment provider until verified billing integration is installed.',409);
   if(await Invoice.exists({renewalOf:term._id,status:'open'}).session(session))throw businessError('An open renewal invoice already exists for this term.',409);
   if(term.endsAt>new Date()&&startsAt<term.endsAt){startsAt.setTime(term.endsAt.getTime());}
   renewalOf=term._id;
  }
  const c=currency(body.currency||baseCurrency),totalMinor=toMinor(body.amount==null||body.amount===''?baseAmount:body.amount);
  const invoice=await createOne(Invoice,{number:`SA-${new Date().getUTCFullYear()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,user:user._id,kind,title,courseSlug,planName,durationMonths,accessDays,accessStartsAt:startsAt,currency:c,totalMinor,paidMinor:0,dueAt,status:'open',createdBy:req.user._id,notes:why,renewalOf,requestKey:key,requestFingerprint:fp},session);
  await audit(req,{scope:'business',action:'invoice.created',targetUser:user._id,entityType:'invoice',entityId:String(invoice._id),reason:why,changes:{number:invoice.number,totalMinor,currency:c,dueAt}},session);
  if(purchaseRequest){purchaseRequest.status='invoiced';purchaseRequest.invoice=invoice._id;purchaseRequest.updatedBy=req.user._id;await purchaseRequest.save({session});}
  await notify(session,user._id,'invoice','Invoice created',`${invoice.number} was issued for ${title}.`);
  return {item:invoice,replayed:false};
 });
}
async function fulfill(invoice,session,actorId){
 if(invoice.fulfillmentAt)return;
 const latest=await Payment.findOne({invoice:invoice._id,status:'paid'}).sort({paidAt:-1}).session(session);
 invoice.paidAt=latest.paidAt;
 const start=new Date(Math.max(new Date(invoice.accessStartsAt).getTime(),new Date(latest.paidAt).getTime()));
 if(invoice.kind==='membership'){
  const endsAt=addMonths(start,invoice.durationMonths);
  await createOne(Subscription,{user:invoice.user,plan:invoice.planName,status:'active',startsAt:start,endsAt,dueAt:invoice.dueAt,durationMonths:invoice.durationMonths,priceMinor:invoice.totalMinor,currency:invoice.currency,invoice:invoice._id,source:'manual_payment'},session);
  await syncMembershipCourseEnrollments({userId:invoice.user,startsAt:start,endsAt,invoice:invoice._id,testMode:false,session,reason:`Academy membership: ${invoice.planName}`});
 }else{
  const current=await Enrollment.findOne({user:invoice.user,courseSlug:invoice.courseSlug}).session(session),period=safeEnd(current,start,invoice.accessDays);
  await Enrollment.findOneAndUpdate({user:invoice.user,courseSlug:invoice.courseSlug},{$set:{status:'active',accessStartsAt:period.startsAt,accessExpiresAt:period.endsAt,source:'manual_payment',invoice:invoice._id,grantedBy:actorId,reason:`Paid invoice ${invoice.number}`}},{upsert:true,new:true,runValidators:true,session});
 }
 invoice.fulfillmentAt=new Date();
}
export async function recordPayment(req){
 await confirmIdentity(req);const key=requestKey(req),body=req.body||{},why=reason(req),invoiceId=text(body.invoiceId,'Invoice',24,24),amountMinor=toMinor(body.amount),reference=text(body.reference,'Payment reference',180,3),method=text(body.method,'Payment method',30,1),paidAt=receivedDate(body.receivedDate);
 if(!['bank_transfer','cash','cheque','other'].includes(method))throw businessError('Select a supported offline payment method.');
 const fp=fingerprint(req,'payment.record',{invoiceId,amountMinor,reference,method,paidAt,why});
 return transaction(async session=>{
  const prior=await existing(Payment,key,fp,session);if(prior)return {item:prior,replayed:true};
  const invoice=await Invoice.findById(objectId(invoiceId)).session(session);if(!invoice)throw businessError('Invoice not found.',404);
  const user=await student(String(invoice.user),session);if(user.status==='blocked')throw businessError('This account is blocked. Resolve its status before granting paid access.',409);
  if(invoice.status!=='open'||invoiceBalance(invoice)<=0)throw businessError('This invoice is already settled or void.',409);
  if(amountMinor>invoiceBalance(invoice))throw businessError('Payment exceeds the outstanding invoice balance.',409);
  const payment=await createOne(Payment,{user:invoice.user,invoice:invoice._id,courseSlug:invoice.courseSlug,kind:invoice.kind,provider:'manual',status:'paid',amountMinor,amount:amountMinor/100,currency:invoice.currency,verifiedAt:new Date(),paidAt,verificationSource:'admin_recorded',method,reference,referenceKey:hashToken(`receipt:${method}:${reference.toLowerCase()}`),refundedMinor:0,recordedBy:req.user._id,notes:why,requestKey:key,requestFingerprint:fp},session);
  invoice.paidMinor+=amountMinor;
  if(invoice.paidMinor===invoice.totalMinor){invoice.status='paid';invoice.paidAt=paidAt;await fulfill(invoice,session,req.user._id);}
  await invoice.save({session});
  await audit(req,{scope:'business',action:'payment.recorded',targetUser:invoice.user,entityType:'payment',entityId:String(payment._id),reason:why,changes:{invoice:invoice.number,amountMinor,currency:invoice.currency,reference,method,remainingMinor:invoiceBalance(invoice)}},session);
  await notify(session,invoice.user,'payment','Offline payment recorded',`${invoice.number}: ${invoice.currency} ${(amountMinor/100).toFixed(2)} recorded. ${invoice.status==='paid'?'Invoice settled.':'A balance remains.'}`);
  return {item:payment,invoice,replayed:false};
 });
}
export async function recordRefund(req){
 await confirmIdentity(req);const key=requestKey(req),body=req.body||{},why=reason(req),paymentId=text(body.paymentId,'Payment',24,24),amountMinor=toMinor(body.amount),reference=text(body.reference,'Refund reference',180,3),refundedAt=receivedDate(body.refundedDate,'Refund date'),revokeAccess=body.revokeAccess===true;
 const fp=fingerprint(req,'refund.record',{paymentId,amountMinor,reference,refundedAt,revokeAccess,why});
 return transaction(async session=>{
  const prior=await existing(Refund,key,fp,session);if(prior)return {item:prior,replayed:true};
  const payment=await Payment.findById(objectId(paymentId)).session(session);
  if(!payment)throw businessError('Payment not found.',404);
  if(payment.provider!=='manual'||payment.verificationSource!=='admin_recorded'||payment.status!=='paid'||!Number.isSafeInteger(payment.amountMinor))throw businessError('Only recorded offline payments can be refunded here. Provider refunds require provider integration.',409);
  if(refundedAt<payment.paidAt)throw businessError('Refund date cannot be before the payment date.');
  if(amountMinor>payment.amountMinor-Number(payment.refundedMinor||0))throw businessError('Refund exceeds the remaining refundable amount.',409);
  const refund=await createOne(Refund,{payment:payment._id,invoice:payment.invoice,user:payment.user,amountMinor,currency:payment.currency,refundedAt,reference,referenceKey:hashToken(`refund:${reference.toLowerCase()}`),reason:why,recordedBy:req.user._id,revokeAccess,requestKey:key,requestFingerprint:fp},session);
  payment.refundedMinor=Number(payment.refundedMinor||0)+amountMinor;await payment.save({session});
  if(payment.invoice)await Invoice.updateOne({_id:payment.invoice},{$inc:{creditedMinor:amountMinor}},{session});
  if(revokeAccess&&payment.invoice){await Subscription.updateMany({invoice:payment.invoice},{$set:{status:'cancelled',cancelledAt:new Date(),cancellationReason:why}},{session});await Enrollment.updateMany({invoice:payment.invoice},{$set:{status:'cancelled',reason:why}},{session});}
  await audit(req,{scope:'business',action:'refund.recorded',targetUser:payment.user,entityType:'refund',entityId:String(refund._id),reason:why,changes:{payment:String(payment._id),amountMinor,currency:payment.currency,reference,revokeAccess}},session);
  await notify(session,payment.user,'refund','Offline refund recorded',`${payment.currency} ${(amountMinor/100).toFixed(2)} returned; reference ${reference}.`);
  return {item:refund,replayed:false};
 });
}
export async function updateCustomer(req,id){
 await confirmIdentity(req);const why=reason(req),body=req.body||{};
 const values={name:text(body.name,'Student name',120,2),phone:text(body.phone||'','Phone',40),country:text(body.country||'','Country',80),adminNotes:text(body.adminNotes||'','Internal notes',3000)};
 return transaction(async session=>{const user=await student(id,session);const before={name:user.name,phone:user.phone||'',country:user.country||''};user.set(values);await user.save({session});await audit(req,{scope:'business',action:'customer.updated',targetUser:user._id,entityType:'user',entityId:id,reason:why,changes:{before,after:{name:values.name,phone:values.phone,country:values.country},notesUpdated:true}},session);return {message:'Student details saved. Email and role were not changed.'};});
}
export async function accountAction(req,id){
 await confirmIdentity(req);const why=reason(req),action=req.body?.action;if(!['block','unblock','revoke_sessions'].includes(action))throw businessError('Invalid account action.');
 return transaction(async session=>{const user=await User.findOne({_id:objectId(id),role:'student'}).select('+tokenVersion').session(session);if(!user)throw businessError('Student account not found.',404);
  if(action==='block'){user.status='blocked';user.blockedReason=why;}if(action==='unblock'){user.status='active';user.blockedReason=null;}
  user.tokenVersion=Number(user.tokenVersion||0)+1;await user.save({session});await revokeUserSessions(user._id,session);
  await audit(req,{scope:'business',action:'customer.'+action,targetUser:user._id,entityType:'user',entityId:id,reason:why},session);
  return {message:action==='block'?'Student blocked and existing sessions revoked.':action==='unblock'?'Student unblocked. They must sign in again.':'Student sessions revoked.'};
 });
}
export async function membershipAction(req,id){
 await confirmIdentity(req);const why=reason(req),action=req.body?.action;if(!['cancel_now','cancel_at_end','resume','adjust_dates'].includes(action))throw businessError('Invalid membership action.');
 return transaction(async session=>{const term=await Subscription.findById(objectId(id)).session(session);if(!term)throw businessError('Membership not found.',404);if(term.stripeSubscriptionId)throw businessError('This is a provider-managed subscription. Change it in the provider until verified billing integration exists.',409);
  const before={status:term.status,cancelAtPeriodEnd:term.cancelAtPeriodEnd,startsAt:term.startsAt,endsAt:term.endsAt};
  if(action==='adjust_dates'){
   const starts=strictDate(req.body.startDate,'Membership starts'),ends=strictDate(req.body.endDate,'Membership expiry');
   if(ends<=starts)throw businessError('Membership expiry must be after its start.');
   term.startsAt=starts;term.endsAt=ends;if(term.status!=='cancelled')term.status=ends<=new Date()?'expired':'active';
  }else if(action==='cancel_now'){term.status='cancelled';term.cancelledAt=new Date();term.cancellationReason=why;term.cancelAtPeriodEnd=false;}
  else{if(!term.endsAt||term.endsAt<=new Date())throw businessError('This term has expired or needs valid dates. Issue a renewal invoice instead.',409);if(action==='resume'){term.status='active';term.cancelAtPeriodEnd=false;term.cancelledAt=null;}else{if(!['active','scheduled'].includes(subscriptionState(term)))throw businessError('Only an active or scheduled term can be marked non-renewing.',409);term.cancelAtPeriodEnd=true;}}
  await term.save({session});await audit(req,{scope:'business',action:'membership.'+action,targetUser:term.user,entityType:'subscription',entityId:id,reason:why,changes:{before,after:{status:term.status,cancelAtPeriodEnd:term.cancelAtPeriodEnd,startsAt:term.startsAt,endsAt:term.endsAt}}},session);
  return {item:term,message:'Access settings updated. No automatic charge, refund or provider cancellation was performed.'};
 });
}
export async function invoiceAction(req,id){
 await confirmIdentity(req);const why=reason(req),action=req.body?.action;if(!['void','change_due_date'].includes(action))throw businessError('Invalid invoice action.');
 return transaction(async session=>{const invoice=await Invoice.findById(objectId(id)).session(session);if(!invoice)throw businessError('Invoice not found.',404);if(invoice.status==='void')throw businessError('Invoice is already void.',409);
  if(action==='change_due_date'){if(invoice.status!=='open')throw businessError('Only open invoices can have their due date changed.',409);invoice.dueAt=dueDate(req.body.dueDate);}
  else{const payments=await Payment.find({invoice:invoice._id,status:'paid'}).session(session);const returned=payments.reduce((s,p)=>s+Number(p.refundedMinor||0),0);if(invoice.paidMinor>returned)throw businessError('Refund all recorded collections before voiding this invoice.',409);invoice.status='void';invoice.voidedAt=new Date();invoice.voidReason=why;await Subscription.updateMany({invoice:invoice._id},{$set:{status:'cancelled',cancelledAt:new Date(),cancellationReason:why}},{session});await Enrollment.updateMany({invoice:invoice._id},{$set:{status:'cancelled',reason:why}},{session});}
  await invoice.save({session});await audit(req,{scope:'business',action:'invoice.'+action,targetUser:invoice.user,entityType:'invoice',entityId:id,reason:why,changes:{status:invoice.status,dueAt:invoice.dueAt}},session);return {item:invoice,message:'Invoice updated. Its financial history has been retained.'};
 });
}
export async function enrollmentAction(req,id=null){
 await confirmIdentity(req);const why=reason(req),action=req.body?.action;if(!['grant','extend','revoke'].includes(action))throw businessError('Invalid course-access action.');
 return transaction(async session=>{
  let enrollment;
  if(action==='grant'){
   const user=await student(req.body.userId,session);if(user.status==='blocked')throw businessError('Unblock this student before granting access.',409);
   const course=await Course.findOne({slug:text(req.body.courseSlug,'Course',180,1),published:true}).session(session);if(!course)throw businessError('Published course not found.',404);
   const starts=strictDate(req.body.startDate,'Access starts'),ends=strictDate(req.body.endDate,'Access expiry');if(ends<=starts)throw businessError('Expiry must be after the access start.');
   const previous=await Enrollment.findOne({user:user._id,courseSlug:course.slug}).session(session);if(previous&&['active','scheduled'].includes(enrollmentState(previous)))throw businessError('An access record already exists. Extend or revoke that record instead.',409);
   enrollment=await Enrollment.findOneAndUpdate({user:user._id,courseSlug:course.slug},{$set:{status:'active',accessStartsAt:starts,accessExpiresAt:ends,source:'complimentary',invoice:null,grantedBy:req.user._id,reason:why}},{upsert:true,new:true,runValidators:true,session});
  }else{
   enrollment=await Enrollment.findById(objectId(id)).session(session);if(!enrollment)throw businessError('Enrollment not found.',404);
   if(action==='revoke')enrollment.status='cancelled';
   else{const ends=strictDate(req.body.endDate,'New expiry');if(ends<=new Date()||ends<=enrollment.accessStartsAt||(enrollment.accessExpiresAt&&ends<=enrollment.accessExpiresAt))throw businessError('The new expiry must extend access beyond the current expiry and today.');if(!enrollment.accessExpiresAt)throw businessError('This course access has no expiry and does not need an extension.');enrollment.accessExpiresAt=ends;enrollment.status='active';}
   enrollment.reason=why;await enrollment.save({session});
  }
  await audit(req,{scope:'business',action:'course_access.'+action,targetUser:enrollment.user,entityType:'enrollment',entityId:String(enrollment._id),reason:why,changes:{startsAt:enrollment.accessStartsAt,endsAt:enrollment.accessExpiresAt,status:enrollment.status,source:enrollment.source}},session);
  return {item:enrollment,message:'Course access updated. No payment or revenue was created. Academy membership may independently grant access.'};
 });
}
