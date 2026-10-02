import {gatewayConfiguration} from '../utils/commerce.js';
import {completionProgress} from '../utils/completion.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Refund from '../models/Refund.js';
import Invoice from '../models/Invoice.js';
import Subscription from '../models/Subscription.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';
import Progress from '../models/Progress.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import SiteContent from '../models/SiteContent.js';
import {CURRENCIES,businessError,currency,dateRange,pagination,searchTerm,escapeRegex,subscriptionState,enrollmentState,invoiceState,invoiceBalance,daysRemaining,amountOf,isRecognized,toCsv} from '../utils/business.js';
export const objectId=value=>{if(typeof value!=='string'||!/^[a-fA-F0-9]{24}$/.test(value))throw businessError('Invalid record identifier.');return new mongoose.Types.ObjectId(value);};
export const customerFields='name email phone country role status emailVerified lastLoginAt loginCount createdAt updatedAt';
const customerJoin=[{$lookup:{from:'users',localField:'user',foreignField:'_id',pipeline:[{$project:{name:1,email:1,status:1,emailVerified:1}}],as:'_customer'}},{$set:{user:{$ifNull:[{$first:'$_customer'},null]}}},{$unset:'_customer'}];
const courseJoin=[{$lookup:{from:'courses',localField:'courseSlug',foreignField:'slug',pipeline:[{$project:{title:1,slug:1}}],as:'_course'}},{$set:{courseTitle:{$first:'$_course.title'}}},{$unset:'_course'}];
const amountExpression={$cond:[{$isNumber:'$amountMinor'},'$amountMinor',{$cond:[{$isNumber:'$amount'},{$floor:{$add:[{$multiply:['$amount',100]},0.5]}},null]}]};
export const paymentFields = [
  {$set: {
    displayMinor: amountExpression,
    displayCurrency: {$toUpper: {$ifNull: ['$currency', 'USD']}},
    collectionDate: {$ifNull: ['$paidAt', '$verifiedAt']}
  }},
  {$set: {
    recognized: {$and: [{$ne:[{$ifNull:['$testMode',false]},true]},
      {$eq: ['$status', 'paid']},
      {$ne: [{$ifNull: ['$verifiedAt', null]}, null]},
      {$ne: ['$displayMinor', null]}, {$gte: ['$displayMinor', 0]},
      {$lte: ['$displayMinor', Number.MAX_SAFE_INTEGER]},
      {$eq: [{$mod: [{$ifNull: ['$displayMinor', -1]}, 1]}, 0]},
      {$or: [
        {$in: ['$provider', ['stripe', 'paypal']]},
        {$and: [{$eq: ['$provider', 'manual']}, {$eq: ['$verificationSource', 'admin_recorded']}]}
      ]}
    ]},
    legacyAmount: {$eq: [{$ifNull: ['$amountMinor', null]}, null]}
  }}
];

const invoiceFields = now => [{ $set: {
  balanceMinor: { $cond: [
    { $eq: ['$status', 'void'] }, 0,
    { $max: [0, { $subtract: ['$totalMinor', { $ifNull: ['$paidMinor', 0] }] }] }
  ]},
  effectiveStatus: { $switch: {
    branches: [
      {case: {$eq: ['$status', 'void']}, then: 'void'},
      {case: {$gte: [{$ifNull: ['$paidMinor', 0]}, '$totalMinor']}, then: 'paid'},
      {case: {$lt: ['$dueAt', now]}, then: 'overdue'},
      {case: {$gt: ['$paidMinor', 0]}, then: 'partial'}
    ], default: 'open'
  }}
}}];
const subscriptionFields = now => [{ $set: {
  effectiveStatus: {$switch: {
    branches: [
      {case: {$eq: ['$status', 'cancelled']}, then: 'cancelled'},
      {case: {$or: [
        {$eq: [{$ifNull: ['$endsAt', null]}, null]},
        {$eq: [{$ifNull: ['$startsAt', null]}, null]},
        {$lte: ['$endsAt', '$startsAt']}
      ]}, then: 'needs_review'},
      {case: {$or: [{$eq: ['$status', 'expired']}, {$lte: ['$endsAt', now]}]}, then: 'expired'},
      {case: {$eq: ['$status', 'past_due']}, then: 'past_due'},
      {case: {$gt: ['$startsAt', now]}, then: 'scheduled'}
    ], default: 'active'
  }}
}}];
const enrollmentFields = now => [{ $set: {
  effectiveStatus: {$switch: {
    branches: [
      {case: {$eq: ['$status', 'cancelled']}, then: 'cancelled'},
      {case: {$or:[{$eq: [{$ifNull: ['$accessStartsAt', null]}, null]},{$and:[{$ne:[{$ifNull:['$accessExpiresAt',null]},null]},{$lte:['$accessExpiresAt','$accessStartsAt']}]}]}, then: 'needs_review'},
      {case: {$or: [
        {$eq: ['$status', 'expired']},
        {$and: [{$ne: [{$ifNull: ['$accessExpiresAt', null]}, null]}, {$lte: ['$accessExpiresAt', now]}]}
      ]}, then: 'expired'},
      {case: {$gt: ['$accessStartsAt', now]}, then: 'scheduled'}
    ], default: 'active'
  }}
}}];
function compact(row,kind,now=new Date()){
 if(kind==='subscriptions')return {...row,effectiveStatus:subscriptionState(row,now),daysRemaining:daysRemaining(row.endsAt,now)};
 if(kind==='enrollments')return {...row,effectiveStatus:enrollmentState(row,now)};
 if(kind==='invoices')return {...row,effectiveStatus:invoiceState(row,now),balanceMinor:invoiceBalance(row)};
 if(kind==='payments')return {...row,displayMinor:amountOf(row),displayCurrency:String(row.currency||'USD').toUpperCase(),recognized:isRecognized(row),collectionDate:row.paidAt||row.verifiedAt||null,legacyAmount:row.amountMinor==null};
 return row;
}
function dateFilter(query,field='createdAt') {if(!query.from&&!query.to)return {};const range=dateRange(query);return {[field]:{$gte:range.from,$lt:range.to}};}
function qFilter(q,fields){return q?{$or:fields.map(field=>({[field]:{$regex:escapeRegex(q),$options:'i'}}))}:{};}
function strictStatus(value,allowed){if(!value||value==='all')return '';if(typeof value!=='string'||!allowed.includes(value))throw businessError('Invalid status filter.');return value;}
export async function listRecords(kind,query={}, {exporting=false}={}){
 const {page,pageSize,skip}=pagination(query),q=searchTerm(query.q),now=new Date(),pipeline=[];let Model;
 const match={...dateFilter(query)};
 if(query.userId)match[kind==='users'?'_id':'user']=objectId(query.userId);
 if(kind==='users'){
  Model=User;Object.assign(match,{role:'student'},qFilter(q,['name','email','phone']));
  const status=strictStatus(query.status,['active','blocked','unverified']);if(status==='active')match.status={$ne:'blocked'};if(status==='blocked')match.status='blocked';if(status==='unverified')match.emailVerified={$ne:true};
  pipeline.push({$match:match},{$project:{name:1,email:1,phone:1,country:1,status:{$ifNull:['$status','active']},role:1,emailVerified:1,lastLoginAt:1,loginCount:1,createdAt:1,updatedAt:1}});
 }else if(kind==='activity'){
  Model=AuditLog;delete match.user;if(query.userId)match.targetUser=objectId(query.userId);
  match.scope={$in:['business','student_auth','client_auth']};const status=strictStatus(query.status,['success','denied']);if(status)match.outcome=status;
  pipeline.push({$match:match},{$lookup:{from:'users',localField:'actor',foreignField:'_id',pipeline:[{$project:{name:1,email:1}}],as:'_actor'}},{$lookup:{from:'users',localField:'targetUser',foreignField:'_id',pipeline:[{$project:{name:1,email:1}}],as:'_target'}},{$set:{actor:{$first:'$_actor'},targetUser:{$first:'$_target'}}},{$unset:['_actor','_target']},{$match:qFilter(q,['actor.name','actor.email','targetUser.email','action','reason'])});
 }else if(kind==='notifications'){
  Model=Notification;const status=strictStatus(query.status,['read','unread']);if(status)match.read=status==='read';pipeline.push({$match:match},...customerJoin,{$match:qFilter(q,['title','message','user.name','user.email'])});
 }else{
  const models={payments:Payment,refunds:Refund,invoices:Invoice,subscriptions:Subscription,enrollments:Enrollment};Model=models[kind];if(!Model)throw businessError('Unknown business section.',404);
  if(kind==='payments'){Object.assign(match,dateFilter(query,'recordDate'));delete match.createdAt;pipeline.push(...paymentFields,{$set:{recordDate:{$ifNull:['$collectionDate','$createdAt']}}});if(query.currency)match.displayCurrency=currency(query.currency);}
  if(kind==='refunds'){Object.assign(match,dateFilter(query,'refundedAt'));delete match.createdAt;if(query.currency)match.currency=currency(query.currency);}
  if(kind==='invoices'&&query.currency)match.currency=currency(query.currency);
  pipeline.push({$match:match});
  if(kind==='invoices')pipeline.push(...invoiceFields(now));
  if(kind==='subscriptions')pipeline.push(...subscriptionFields(now));
  if(kind==='enrollments')pipeline.push(...enrollmentFields(now));
  pipeline.push(...customerJoin);
  if(['payments','invoices','enrollments'].includes(kind))pipeline.push(...courseJoin);
  pipeline.push({$match:qFilter(q,['user.name','user.email','number','title','plan','courseSlug','courseTitle','reference'])});
  const statuses={payments:['paid','pending','failed','cancelled','needs_review'],refunds:[],invoices:['open','partial','paid','overdue','void'],subscriptions:['active','scheduled','expired','past_due','cancelled','needs_review','expiring'],enrollments:['active','scheduled','expired','cancelled','needs_review']};
  const status=strictStatus(query.status,statuses[kind]);
  if(status==='expiring')pipeline.push({$match:{effectiveStatus:'active',endsAt:{$gt:now,$lte:new Date(now.getTime()+30*86400000)}}});
  else if(kind==='payments'&&status==='needs_review')pipeline.push({$match:{testMode:{$ne:true},status:'paid',recognized:false}});
  else if(status)pipeline.push({$match:{[['subscriptions','invoices','enrollments'].includes(kind)?'effectiveStatus':'status']:status}});
 }
 const sort=kind==='subscriptions'?{endsAt:1,_id:-1}:kind==='invoices'?{dueAt:-1,_id:-1}:kind==='payments'?{collectionDate:-1,createdAt:-1,_id:-1}:{createdAt:-1,_id:-1};
 if(exporting){const rows=await Model.aggregate([...pipeline,{$sort:sort},{$limit:5001}]);if(rows.length>5000)throw businessError('This export exceeds 5,000 rows. Narrow the search, status or date range.',413);const enriched=kind==='subscriptions'?await attachRenewals(rows):rows;return {rows:enriched.map(row=>compact(row,kind,now)),total:rows.length};}
 const [result]=await Model.aggregate([...pipeline,{$facet:{rows:[{$sort:sort},{$skip:skip},{$limit:pageSize}],total:[{$count:'count'}]}}]);
 const total=result?.total[0]?.count||0;
 const rows=kind==='subscriptions'?await attachRenewals(result?.rows||[]):result?.rows||[];
 return {success:true,rows:rows.map(row=>compact(row,kind,now)),pagination:{page,pageSize,total,pages:Math.ceil(total/pageSize)},timezone:'UTC'};
}

/** Attach only an actual outstanding renewal invoice. Never invent a due date from access expiry. */
async function attachRenewals(rows){
 if(!rows.length)return rows;
 const invoices=await Invoice.find({renewalOf:{$in:rows.map(r=>r._id)},status:'open',$expr:{$gt:['$totalMinor',{$ifNull:['$paidMinor',0]}]}}).select('renewalOf number currency dueAt totalMinor paidMinor').sort({dueAt:1}).lean();
 return rows.map(row=>{const invoice=invoices.find(i=>String(i.renewalOf)===String(row._id));return {...row,nextDueAt:invoice?.dueAt||null,renewalInvoice:invoice?{_id:invoice._id,number:invoice.number,currency:invoice.currency,dueAt:invoice.dueAt,balanceMinor:invoiceBalance(invoice)}:null};});
}

let capabilityCache=null;
export async function capabilities(){
 if(capabilityCache&&Date.now()-capabilityCache.at<60000)return capabilityCache.value;
 let transactions=false;try{const hello=await mongoose.connection.db.admin().command({hello:1});transactions=Boolean(hello.setName||hello.msg==='isdbgrid');}catch{}
 const methods=gatewayConfiguration();const value={transactions,onlinePayments:Object.values(methods).some(m=>m.enabled),paymentMethods:methods,automaticBilling:false,emailConfigured:Boolean(process.env.SMTP_HOST)};capabilityCache={at:Date.now(),value};return value;
}
export async function dashboard(query={}){
 const range=dateRange(query),c=currency(query.currency||'USD'),now=new Date();
 const paid=[...paymentFields,{$match:{recognized:true,displayCurrency:c,collectionDate:{$gte:range.from,$lt:range.to}}}];
 const refundMatch={testMode:{$ne:true},currency:c,refundedAt:{$gte:range.from,$lt:range.to}};
 const [collections,refunds,dues,students,newStudents,blockedStudents,activeTerms,expiringCount,loginCount,failedLogins,reviewCount,courseCount,expiring,recentPayments,overdue,caps]=await Promise.all([
  Payment.aggregate([...paid,{$facet:{total:[{$group:{_id:null,amount:{$sum:'$displayMinor'},count:{$sum:1},legacy:{$sum:{$cond:['$legacyAmount',1,0]}}}}],trend:[{$group:{_id:{$dateToString:{date:'$collectionDate',format:'%Y-%m-%d',timezone:'UTC'}},grossMinor:{$sum:'$displayMinor'}}}],products:[{$group:{_id:{$ifNull:['$courseSlug','Academy membership']},grossMinor:{$sum:'$displayMinor'},count:{$sum:1}}},{$sort:{grossMinor:-1}},{$limit:8}]}}]),
  Refund.aggregate([{$match:refundMatch},{$facet:{total:[{$group:{_id:null,amount:{$sum:'$amountMinor'},count:{$sum:1}}}],trend:[{$group:{_id:{$dateToString:{date:'$refundedAt',format:'%Y-%m-%d',timezone:'UTC'}},refundMinor:{$sum:'$amountMinor'}}}]}}]),
  Invoice.aggregate([{$match:{testMode:{$ne:true},currency:c,status:'open'}},...invoiceFields(now),{$group:{_id:null,balance:{$sum:'$balanceMinor'},overdue:{$sum:{$cond:[{$lt:['$dueAt',now]},'$balanceMinor',0]}},count:{$sum:1}}}]),
  User.countDocuments({role:'student'}),User.countDocuments({role:'student',createdAt:{$gte:range.from,$lt:range.to}}),User.countDocuments({role:'student',status:'blocked'}),
  Subscription.aggregate([{$match:{testMode:{$ne:true},status:'active',startsAt:{$lte:now},endsAt:{$gt:now}}},...customerJoin,{$match:{'user.status':{$ne:'blocked'},'user._id':{$ne:null}}},{$group:{_id:'$user._id'}},{$count:'count'}]),
  Subscription.countDocuments({testMode:{$ne:true},status:'active',startsAt:{$lte:now},endsAt:{$gt:now,$lte:new Date(now.getTime()+30*86400000)}}),
  AuditLog.countDocuments({scope:'student_auth',action:'auth.login',outcome:'success',createdAt:{$gte:range.from,$lt:range.to}}),
  AuditLog.countDocuments({scope:'client_auth',outcome:'denied',createdAt:{$gte:range.from,$lt:range.to}}),
  Payment.aggregate([...paymentFields,{$match:{testMode:{$ne:true},status:'paid',recognized:false}},{$count:'count'}]),Course.countDocuments({published:true}),
  Subscription.find({testMode:{$ne:true},status:'active',startsAt:{$lte:now},endsAt:{$gt:now,$lte:new Date(now.getTime()+30*86400000)}}).sort({endsAt:1}).limit(6).populate('user','name email').lean(),
  Payment.aggregate([...paymentFields,{$match:{displayCurrency:c}},...customerJoin,...courseJoin,{$sort:{createdAt:-1}},{$limit:6}]),
  Invoice.find({testMode:{$ne:true},currency:c,status:'open',dueAt:{$lt:now}}).sort({dueAt:1}).limit(6).populate('user','name email').lean(),capabilities()
 ]);
 const collection=collections[0]||{},refund=refunds[0]||{},gross=collection.total?.[0]?.amount||0,returned=refund.total?.[0]?.amount||0;
 const trend=[];for(let d=new Date(range.from);d<range.to;d=new Date(d.getTime()+86400000)){const date=d.toISOString().slice(0,10),g=collection.trend?.find(x=>x._id===date)?.grossMinor||0,r=refund.trend?.find(x=>x._id===date)?.refundMinor||0;trend.push({date,grossMinor:g,refundMinor:r,netMinor:g-r});}
 const products=collection.products||[];const titles=await Course.find({slug:{$in:products.map(x=>x._id)}}).select('slug title').lean();
 return {success:true,generatedAt:new Date(),currency:c,currencies:CURRENCIES,range,capabilities:caps,
  stats:{grossMinor:gross,refundMinor:returned,netMinor:gross-returned,collectionCount:collection.total?.[0]?.count||0,refundCount:refund.total?.[0]?.count||0,outstandingMinor:dues[0]?.balance||0,overdueMinor:dues[0]?.overdue||0,openInvoices:dues[0]?.count||0,students,newStudents,blockedStudents,activeMembers:activeTerms[0]?.count||0,expiringCount,loginCount,failedLogins,reviewCount:reviewCount[0]?.count||0,legacyPaymentCount:collection.total?.[0]?.legacy||0,courseCount},
  trend,products:products.map(p=>({...p,title:titles.find(t=>t.slug===p._id)?.title||p._id})),expiring:(await attachRenewals(expiring)).map(s=>compact(s,'subscriptions',now)),recentPayments:recentPayments.map(p=>compact(p,'payments',now)),overdue:overdue.map(i=>compact(i,'invoices',now))};
}
async function progressMap(userId,enrollments){
 const courses=await Course.find({slug:{$in:enrollments.map(e=>e.courseSlug)}}).select('_id slug title').lean();
 const modules=await Module.find({course:{$in:courses.map(c=>c._id)}}).select('_id course').lean();
 const lessons=await Lesson.find({module:{$in:modules.map(m=>m._id)},published:{$ne:false}}).select('_id module published completionRequired').lean();
 const completed=await Progress.find({user:userId,completed:true,lesson:{$in:lessons.map(l=>l._id)}}).select('lesson').lean();
 const set=new Set(completed.map(p=>String(p.lesson)));
 return Object.fromEntries(courses.map(c=>{const mids=new Set(modules.filter(m=>String(m.course)===String(c._id)).map(m=>String(m._id))),ls=lessons.filter(l=>mids.has(String(l.module))),n=completionProgress(ls,[...set]);return [c.slug,{title:c.title,total:n.total,completed:n.done,percent:n.percent}];}));
}
export async function customerDetail(id){
 const uid=objectId(id),user=await User.findOne({_id:uid,role:'student'}).select(customerFields+' +adminNotes +blockedReason').lean();if(!user)throw businessError('Student account not found.',404);
 const [subscriptions,payments,invoices,enrollments,activity,refunds,totals]=await Promise.all([
  Subscription.find({user:uid}).sort({createdAt:-1}).limit(101).lean(),Payment.find({user:uid}).sort({createdAt:-1}).limit(101).lean(),Invoice.find({user:uid}).sort({createdAt:-1}).limit(101).lean(),Enrollment.find({user:uid}).sort({createdAt:-1}).limit(101).lean(),
  AuditLog.find({targetUser:uid,scope:{$in:['business','student_auth']}}).sort({createdAt:-1}).limit(40).select('action outcome reason createdAt').lean(),Refund.find({user:uid}).sort({createdAt:-1}).limit(101).lean(),
  Payment.aggregate([{$match:{user:uid}},...paymentFields,{$match:{recognized:true}},{$group:{_id:'$displayCurrency',grossMinor:{$sum:'$displayMinor'},refundMinor:{$sum:{$ifNull:['$refundedMinor',0]}}}}])
 ]);
 const progress=await progressMap(uid,enrollments.slice(0,100));
 return {success:true,user,subscriptions:(await attachRenewals(subscriptions.slice(0,100))).map(x=>compact(x,'subscriptions')),payments:payments.slice(0,100).map(x=>compact(x,'payments')),invoices:invoices.slice(0,100).map(x=>compact(x,'invoices')),enrollments:enrollments.slice(0,100).map(x=>({...compact(x,'enrollments'),progress:progress[x.courseSlug]||null})),activity,refunds:refunds.slice(0,100),totals:totals.map(x=>({...x,netMinor:x.grossMinor-x.refundMinor})),historyTruncated:[subscriptions,payments,invoices,enrollments,refunds].some(xs=>xs.length>100)};
}
export async function billingOptions(query={}){
 const q=searchTerm(query.q);const [users,courses,settings]=await Promise.all([User.find({role:'student',status:{$ne:'blocked'},...qFilter(q,['name','email'])}).select('name email').sort({name:1}).limit(25).lean(),Course.find({published:true}).select('title slug currency price salePrice pricing').sort({title:1}).lean(),SiteContent.findOne({key:'membershipPlans'}).lean()]);
 return {success:true,users,courses,plans:Array.isArray(settings?.value)?settings.value.filter(x=>x.active!==false):[],currencies:CURRENCIES};
}
export function exportCsv(kind,rows){
 const user=r=>[r.user?.name||r.name||'',r.user?.email||r.email||''];const iso=d=>d?new Date(d).toISOString():'';let headers,values;
 if(kind==='users'){headers=['Name','Email','Account status','Joined UTC','Last login UTC','Tracked sign-ins','Email verified'];values=rows.map(r=>[...user(r),r.status||'active',iso(r.createdAt),iso(r.lastLoginAt),r.loginCount||0,Boolean(r.emailVerified)]);}
 else if(kind==='payments'){headers=['Student','Email','Payment ID','Invoice ID','Course / product','Provider','Method','Amount','Currency','Status','Included in collections','Collected UTC','Reference'];values=rows.map(r=>[...user(r),r._id,r.invoice,r.courseTitle||r.courseSlug||r.kind,r.provider,r.method,r.displayMinor==null?'':(r.displayMinor/100).toFixed(2),r.displayCurrency,r.status,r.recognized,iso(r.collectionDate),r.reference]);}
 else if(kind==='refunds'){headers=['Student','Email','Payment ID','Refund amount','Currency','Refunded UTC','Reference','Reason'];values=rows.map(r=>[...user(r),r.payment,(r.amountMinor/100).toFixed(2),r.currency,iso(r.refundedAt),r.reference,r.reason]);}
 else if(kind==='invoices'){headers=['Student','Email','Invoice','Product','Original total','Gross receipts','Refund credits','Adjusted total','Net applied','Balance','Currency','Status','Due UTC','Access starts UTC'];values=rows.map(r=>[...user(r),r.number,r.title,(r.totalMinor/100).toFixed(2),(r.paidMinor/100).toFixed(2),(Number(r.creditedMinor||0)/100).toFixed(2),((r.totalMinor-Number(r.creditedMinor||0))/100).toFixed(2),((r.paidMinor-Number(r.creditedMinor||0))/100).toFixed(2),(r.balanceMinor/100).toFixed(2),r.currency,r.effectiveStatus,iso(r.dueAt),iso(r.accessStartsAt)]);}
 else if(kind==='subscriptions'){headers=['Student','Email','Plan','Access status','Start UTC','Expiry UTC','Original invoice due UTC','Open renewal due UTC','Renewal invoice','Days remaining','Cancel at period end','Source'];values=rows.map(r=>[...user(r),r.plan,r.effectiveStatus,iso(r.startsAt),iso(r.endsAt),iso(r.dueAt),iso(r.nextDueAt),r.renewalInvoice?.number||'',r.daysRemaining,r.cancelAtPeriodEnd,r.source||'legacy']);}
 else if(kind==='enrollments'){headers=['Student','Email','Course','Access status','Starts UTC','Expires UTC','Source'];values=rows.map(r=>[...user(r),r.courseTitle||r.courseSlug,r.effectiveStatus,iso(r.accessStartsAt),iso(r.accessExpiresAt),r.source||'legacy']);}
 else if(kind==='activity'){headers=['Time UTC','Actor','Actor email','Student','Action','Outcome','Reason'];values=rows.map(r=>[iso(r.createdAt),r.actor?.name,r.actor?.email,r.targetUser?.email,r.action,r.outcome,r.reason]);}
 else throw businessError('This section does not support export.');
 if(['payments','refunds','invoices','subscriptions','enrollments'].includes(kind)){headers.push('Sandbox / test record');values=values.map((v,i)=>[...v,rows[i].testMode===true]);}
 return toCsv(headers,values);
}
