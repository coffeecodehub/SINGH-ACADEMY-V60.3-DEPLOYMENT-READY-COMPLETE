import {Router} from 'express';
import mongoose from 'mongoose';
import PaymentAttachment from '../models/PaymentAttachment.js';
import {prepareReceiptUpload} from '../services/paymentAttachments.js';
import {uploadAdmission,receiptUploadSingle,storeUpload} from '../services/uploads.js';
import {createReceiptPdf} from '../services/receiptPdf.js';
import crypto from 'node:crypto';
import PurchaseRequest from '../models/PurchaseRequest.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Refund from '../models/Refund.js';
import Enrollment from '../models/Enrollment.js';
import Subscription from '../models/Subscription.js';
import Course from '../models/Course.js';
import SiteContent from '../models/SiteContent.js';
import Notification from '../models/Notification.js';
import {requireAuth,requireRole} from '../middleware/auth.js';
import {rateLimit} from '../middleware/rateLimit.js';
import {text,toMinor,invoiceBalance,invoiceState,businessError,pagination} from '../utils/business.js';
import {subscriptionDisplay} from '../utils/subscriptionDisplay.js';
import CheckoutOrder from '../models/CheckoutOrder.js';
import {objectId} from '../services/businessRead.js';
import {catalog,startCheckout,syncCheckout,publicOrder} from '../services/onlineCheckout.js';
import {gatewayConfiguration,realAccessFilter,activeEnrollmentWindow} from '../utils/commerce.js';
const r=Router();
// Hosted checkout: card/account data never passes through this website.
r.get('/methods',(req,res)=>res.json({success:true,methods:gatewayConfiguration()}));
r.get('/catalog',async(req,res)=>res.json({success:true,purchase:await catalog(text(req.query.kind,'Purchase type',20,1),text(req.query.product,'Product',200,1))}));
r.post('/checkout',requireAuth,requireRole('student'),rateLimit('checkout-create',20,60000,{authenticated:true}),async(req,res)=>res.json({success:true,...await startCheckout(req)}));
r.get('/orders/:id',requireAuth,requireRole('student'),async(req,res)=>{const order=await CheckoutOrder.findOne({_id:objectId(req.params.id),user:req.user._id});if(!order)throw businessError('Checkout not found.',404);res.json({success:true,order:publicOrder(order)});});
r.post('/orders/:id/confirm',requireAuth,requireRole('student'),rateLimit('checkout-confirm',30,60000,{authenticated:true}),async(req,res)=>res.json({success:true,order:await syncCheckout(req.params.id,{userId:req.user._id,capture:true})}));
r.post('/verify',(req,res)=>res.status(404).json({success:false,message:'Payment verification endpoint is not enabled.'}));
r.get('/access/:courseSlug',requireAuth,requireRole('student'),async(req,res)=>{
 const now=new Date(),slug=text(req.params.courseSlug,'Course',180,1);
 const course=await Course.findOne({slug,published:true}).select('accessType').lean();
 const [enrollment,membership]=await Promise.all([
  Enrollment.findOne({user:req.user.id,courseSlug:slug,status:'active',...realAccessFilter(),...activeEnrollmentWindow(now)}).select('courseSlug accessStartsAt accessExpiresAt status').lean(),
  Subscription.exists({user:req.user.id,status:'active',...realAccessFilter(),startsAt:{$lte:now},endsAt:{$gt:now}})
 ]);
 res.json({success:true,hasAccess:Boolean(course&&(course.accessType==='free'||enrollment||membership)),enrollment});
});
r.post('/requests',requireAuth,requireRole('student'),(req,res)=>res.status(410).json({success:false,message:'Select your course or plan and use Stripe or PayPal checkout. Manual enrollment requests are no longer used.'}));
r.get('/mine/plans',requireAuth,requireRole('student'),async(req,res)=>{
 const {page,pageSize,skip}=pagination(req.query),filter={user:req.user._id};
 const [items,total,site]=await Promise.all([Subscription.find(filter).select('plan status startsAt endsAt dueAt durationMonths priceMinor currency invoice createdAt cancelledAt testMode').populate('invoice','number paidAt totalMinor paidMinor creditedMinor currency accessStartsAt').sort({createdAt:-1,_id:-1}).skip(skip).limit(pageSize).lean(),Subscription.countDocuments(filter),SiteContent.findOne({key:'membershipPlans'}).select('value').lean()]);
 const activePlans=new Set((Array.isArray(site?.value)?site.value:[]).filter(p=>p.active!==false).map(p=>p.name));
 const now=new Date(),renewals=await Invoice.find({user:req.user._id,renewalOf:{$in:items.map(t=>t._id)},status:'open'}).select('renewalOf number dueAt totalMinor paidMinor creditedMinor currency').lean();
 const scheduled=await Subscription.find({user:req.user._id,status:'active',startsAt:{$gt:now}}).select('startsAt endsAt testMode').lean();
 res.json({success:true,items:items.map(term=>{const renewal=renewals.find(i=>String(i.renewalOf)===String(term._id));return {...term,...subscriptionDisplay(term,now),entryDate:term.createdAt,subscriptionDate:term.invoice?.paidAt||null,nextPaymentDueAt:renewal?.dueAt||null,renewalInvoice:renewal?{number:renewal.number,dueAt:renewal.dueAt,balanceMinor:invoiceBalance(renewal),currency:renewal.currency}:null,hasScheduledRenewal:scheduled.some(s=>String(s._id)!==String(term._id)&&Boolean(s.testMode)===Boolean(term.testMode)&&new Date(s.startsAt)<=new Date(term.endsAt)&&new Date(s.endsAt)>new Date(term.endsAt)),canResubscribe:activePlans.has(term.plan),renewalUrl:activePlans.has(term.plan)?'/checkout?plan='+encodeURIComponent(term.plan):'/academy'};}),total,page,pageSize});
});
r.get('/mine/:kind',requireAuth,requireRole('student'),async(req,res)=>{
 const {page,pageSize,skip}=pagination(req.query),kind=req.params.kind;
 const definitions={requests:[PurchaseRequest,'kind product title status message quotedAmountMinor currency createdAt invoice'],invoices:[Invoice,'number kind title currency totalMinor paidMinor creditedMinor dueAt status paidAt accessStartsAt accessExpiresAt noScheduledExpiry durationMonths accessDays fulfillmentAt courseSlug planName createdAt testMode origin'],payments:[Payment,'invoice amountMinor amount currency paidAt status provider providerPaymentId reference refundedMinor createdAt testMode'],refunds:[Refund,'invoice amountMinor currency refundedAt createdAt testMode source']};
 const chosen=definitions[kind];if(!chosen)throw businessError('Unknown billing section.',404);
 const [Model,fields]=chosen,filter={user:req.user._id};
 if(kind==='invoices'&&req.query.invoice)filter._id=objectId(req.query.invoice);
 const [items,total]=await Promise.all([Model.find(filter).select(fields).sort({createdAt:-1,_id:-1}).skip(skip).limit(pageSize).lean(),Model.countDocuments(filter)]);
 let result=items;
 if(kind==='invoices'){
  const ids=items.map(i=>i._id),owned={user:req.user._id,invoice:{$in:ids}};
  const [terms,orders,access]=await Promise.all([Subscription.find(owned).select('invoice startsAt endsAt').lean(),CheckoutOrder.find({...owned,status:'paid'}).select('invoice accessStartsAt accessExpiresAt').lean(),Enrollment.find(owned).select('invoice accessStartsAt accessExpiresAt').lean()]);
  result=items.map(i=>{const order=orders.find(x=>String(x.invoice)===String(i._id)),term=terms.find(x=>String(x.invoice)===String(i._id)),enrollment=access.find(x=>String(x.invoice)===String(i._id));
   // Checkout snapshots are historical; the linked term/access is used only when there is no saved invoice/order end.
   const source=order||term||enrollment,end=i.accessExpiresAt??(order?order.accessExpiresAt:term?term.endsAt:enrollment?.accessExpiresAt);
   return {...i,accessStartsAt:i.accessStartsAt||(order?.accessStartsAt||term?.startsAt||enrollment?.accessStartsAt),accessExpiresAt:end,
    noScheduledExpiry:i.noScheduledExpiry===true||(i.kind==='course'&&!!source&&end===null),balanceMinor:invoiceBalance(i),effectiveStatus:invoiceState(i)};});
 }
 if(kind==='payments'){
  const [attachments,invoices]=await Promise.all([PaymentAttachment.find({user:req.user._id,payment:{$in:items.map(p=>p._id)}}).select('payment fileId name createdAt').lean(),Invoice.find({user:req.user._id,_id:{$in:items.map(p=>p.invoice).filter(Boolean)}}).select('number title').lean()]);
  result=items.map(p=>({...p,invoice:invoices.find(i=>String(i._id)===String(p.invoice))||p.invoice,attachments:attachments.filter(a=>String(a.payment)===String(p._id))}));
 }
 res.json({success:true,items:result,total,page,pageSize});
});
r.post('/mine/payments/:id/attachments',requireAuth,requireRole('student'),rateLimit('receipt-upload',15,60000,{authenticated:true}),prepareReceiptUpload,uploadAdmission,receiptUploadSingle,storeUpload);
r.delete('/mine/payments/:id/attachments/:attachmentId',requireAuth,requireRole('student'),rateLimit('receipt-remove',20,60000,{authenticated:true}),async(req,res)=>{
 const attachment=await PaymentAttachment.findOneAndDelete({_id:objectId(req.params.attachmentId),payment:objectId(req.params.id),user:req.user._id});if(!attachment)throw businessError('Receipt screenshot not found.',404);
 await new mongoose.mongo.GridFSBucket(mongoose.connection.db,{bucketName:'academyMedia'}).delete(attachment.fileId).catch(()=>{});res.json({success:true});
});
r.get('/mine/payments/:id/receipt',requireAuth,requireRole('student'),async(req,res)=>{
 const payment=await Payment.findOne({_id:objectId(req.params.id),user:req.user._id,status:'paid'}).lean();if(!payment)throw businessError('Receipt not found.',404);
 const invoice=payment.invoice?await Invoice.findOne({_id:payment.invoice,user:req.user._id}).select('number title').lean():null;
 const pdf=createReceiptPdf(payment,invoice,req.user);res.set({'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="Singh-Academy-Receipt-${payment._id}.pdf"`,'Cache-Control':'private, no-store'});res.send(pdf);
});
export default r;
