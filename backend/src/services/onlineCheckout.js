import crypto from 'node:crypto';
import mongoose from 'mongoose';
import CheckoutOrder from '../models/CheckoutOrder.js';
import Course from '../models/Course.js';
import SiteContent from '../models/SiteContent.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import Enrollment from '../models/Enrollment.js';
import Notification from '../models/Notification.js';
import {audit} from './audit.js';
import {queueSubscriptionConfirmation} from './studentNotifications.js';
import {syncMembershipCourseEnrollments} from './membershipEnrollments.js';
import {transaction} from './businessWrite.js';
import {objectId,capabilities} from './businessRead.js';
import {businessError,text,requestKey,stableJson,addMonths} from '../utils/business.js';
import {courseOffers,selectCourseOffer,planOffer,gatewayCurrency,requireGateway,assertEvidence,courseMonthPeriod,coursePeriod,realAccessFilter,activeEnrollmentWindow} from '../utils/commerce.js';
import {createStripeOrder,createPayPalOrder,stripeEvidence,paypalEvidence} from './paymentProviders.js';
const one=async(Model,body,session)=>(await Model.create([body],{session}))[0];
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
export function publicOrder(order){return {_id:order._id,provider:order.provider,environment:order.environment,kind:order.kind,product:order.product,title:order.title,optionLabel:order.optionLabel,currency:order.currency,amountMinor:order.amountMinor,status:order.status,paidAt:order.paidAt,accessDays:order.accessDays,durationMonths:order.durationMonths,accessStartsAt:order.accessStartsAt,accessExpiresAt:order.accessExpiresAt,grantNote:order.grantNote};}
export async function catalog(kind,product){
 if(kind==='course'){
  const course=await Course.findOne({slug:product,published:true}).lean();if(!course)throw businessError('Published course not found.',404);
  return {kind,title:course.title,product:course.slug,free:course.accessType==='free',membershipOnly:course.accessType==='membership',offers:courseOffers(course)};
 }
 if(kind==='membership'){
  const settings=await SiteContent.findOne({key:'membershipPlans'}).lean(),plan=(settings?.value||[]).find(p=>p.name===product&&p.active!==false);
  if(!plan)throw businessError('Membership plan not found.',404);return {kind,title:plan.name,product:plan.name,offers:[planOffer(plan)]};
 }
 throw businessError('Choose a course or a membership.');
}
async function makeRemote(order,user){
 if(order.providerOrderId)return {order:publicOrder(order),url:order.approvalUrl};
 if(order.expiresAt<new Date(Date.now()+1800000))throw businessError('This unfinished checkout has expired. Return to the course and start a new checkout.',409);
 const claim=crypto.randomUUID(),claimed=await CheckoutOrder.findOneAndUpdate({_id:order._id,providerOrderId:{$exists:false},$or:[{creationClaimUntil:{$exists:false}},{creationClaimUntil:{$lt:new Date()}}]},{$set:{creationClaim:claim,creationClaimUntil:new Date(Date.now()+90000)}},{new:true});
 if(!claimed){const current=await CheckoutOrder.findById(order._id).select('+approvalUrl');if(current?.providerOrderId)return {order:publicOrder(current),url:current.approvalUrl};throw businessError('Checkout is being created. Wait a moment and retry the same payment method.',409);}
 try{
  const remote=order.provider==='stripe'?await createStripeOrder(order,user):await createPayPalOrder(order,user);
  if(typeof remote.id!=='string'||remote.id.length>150)throw businessError('Payment provider did not return an order ID.',502);
  const updated=await CheckoutOrder.findOneAndUpdate({_id:order._id,creationClaim:claim},{$set:{providerOrderId:remote.id,approvalUrl:remote.url,status:'pending'},$unset:{creationClaim:1,creationClaimUntil:1}},{new:true}).select('+approvalUrl');
  if(!updated)throw businessError('Checkout is still being reconciled. Please retry the same order.',409);
  return {order:publicOrder(updated),url:updated.approvalUrl};
 }catch(error){await CheckoutOrder.updateOne({_id:order._id,creationClaim:claim},{$unset:{creationClaim:1,creationClaimUntil:1}});throw error;}
}
export async function startCheckout(req){
 const body=req.body||{},kind=text(body.kind,'Purchase type',20,1),product=text(body.product,'Course or plan',200,1),provider=text(body.provider,'Payment method',20,1),optionKey=body.optionKey==null?'':text(body.optionKey,'Price option',30);
 const renewalOf=body.renewalOf?String(objectId(body.renewalOf)):'';
 if(renewalOf&&(kind!=='membership'||!await Subscription.exists({_id:renewalOf,user:req.user._id,plan:product})))throw businessError('Membership renewal record not found.',404);
 const config=requireGateway(provider);if(!(await capabilities()).transactions)throw businessError('Checkout requires transaction-capable database storage. No payment was started.',503);
 const key=digest(String(req.user._id)+':'+requestKey(req)),fp=digest(stableJson({kind,product,provider,optionKey,renewalOf,environment:config.environment}));
 let order=await CheckoutOrder.findOne({requestKey:key,user:req.user._id}).select('+approvalUrl +requestFingerprint');
 if(order){if(order.requestFingerprint!==fp)throw businessError('This checkout key belongs to another purchase.',409);if(order.status==='paid')return {order:publicOrder(order)};if(['expired','failed','cancelled'].includes(order.status))throw businessError('Start a new checkout from the course page.',409);return makeRemote(order,req.user);}
 let title,offer;
 if(kind==='course'){
  const course=await Course.findOne({slug:product,published:true}).lean();if(!course)throw businessError('Published course not found.',404);
  if(course.accessType==='free')throw businessError('This course is free. Open the lesson player to begin.',409);
  if(course.accessType==='membership')throw businessError('This course is available through an Academy membership. Choose membership access.',409);
  const now=new Date(),access=realAccessFilter();
  const hasAccess=await Enrollment.exists({user:req.user._id,courseSlug:product,status:'active',...access,...activeEnrollmentWindow(now)});
  const membership=await Subscription.exists({user:req.user._id,status:'active',...access,startsAt:{$lte:now},endsAt:{$gt:now}});
  if(membership)throw businessError('Your active Academy membership already includes this course. Open My Courses instead of paying again.',409);
  title=course.title;offer=selectCourseOffer(course,optionKey);
 }else if(kind==='membership'){
  const data=await catalog(kind,product);title=data.title;offer=data.offers[0];
 }else throw businessError('Choose a course or membership.');
 if(offer.amountMinor<=0||offer.amountMinor>99999999)throw businessError('The price needs an Academy administrator review before checkout.',409);
 const currency=gatewayCurrency(offer.currency);
 try{order=await CheckoutOrder.create({user:req.user._id,provider,environment:config.environment,kind,product,title,renewalOf:renewalOf||undefined,optionKey:offer.key,optionLabel:offer.label,amountMinor:offer.amountMinor,currency,accessDays:0,durationMonths:offer.durationMonths,requestKey:key,requestFingerprint:fp,expiresAt:new Date(Date.now()+3600000)});}
 catch(error){if(error.code!==11000)throw error;order=await CheckoutOrder.findOne({requestKey:key,user:req.user._id}).select('+approvalUrl +requestFingerprint');if(!order||order.requestFingerprint!==fp)throw businessError('A conflicting checkout already exists.',409);}
 return makeRemote(order,req.user);
}
export async function fulfillOnlineOrder(orderId,evidence,verificationSource='provider_api'){
 // No external provider calls inside the transaction: retries must only repeat database operations.
 return transaction(async session=>{
  const order=await CheckoutOrder.findById(objectId(String(orderId))).session(session);if(!order)throw businessError('Checkout order not found.',404);assertEvidence(order,evidence);
  if(order.status==='paid')return publicOrder(order);
  const user=await User.findOneAndUpdate({_id:order.user,role:'student'},{$inc:{commerceVersion:1}},{new:true,session});
  if(!user)throw businessError('Paid order customer needs review.',409);
  const date=new Date(evidence.paidAt),testMode=order.environment==='test';let start=date,expires=null,grantNote='';
  // Serialize paid renewals per user, so independent successful payments cannot overwrite each other.
  if(order.kind==='membership'){
   const previous=await Subscription.findOne({user:user._id,status:'active',testMode:testMode?true:{$ne:true},endsAt:{$gt:date}}).sort({endsAt:-1}).session(session);
   if(previous)start=new Date(previous.endsAt);expires=addMonths(start,order.durationMonths);
  }else{
   const stored=await Enrollment.findOne({user:user._id,courseSlug:order.product}).session(session);
   const current=!testMode&&stored?.testMode?null:stored;
   if(testMode&&stored&&stored.testMode!==true){grantNote='Sandbox payment recorded; existing real course access was preserved.';start=stored.accessStartsAt;expires=stored.accessExpiresAt;}
   else if(current?.status==='active'&&new Date(current.accessStartsAt)>date){start=new Date(current.accessStartsAt);expires=current.accessExpiresAt;grantNote='Payment received; existing scheduled course access needs Academy review.';}
   else if(order.durationMonths==null){
    // Historical V47-V55 orders stored day terms. Preserve their exact semantics for replay/audit safety.
    if(current?.status==='active'&&new Date(current.accessStartsAt)<=date&&(!current.accessExpiresAt||new Date(current.accessExpiresAt)>date)){start=current.accessStartsAt;expires=current.accessExpiresAt;grantNote='Payment received while this course was already accessible. Existing access was preserved; contact the Academy to review the duplicate purchase.';}
    else{const period=coursePeriod(current,date,order.accessDays||0);start=period.startsAt;expires=period.endsAt;}
   }else{const period=courseMonthPeriod(current,date,order.durationMonths);start=period.startsAt;expires=period.endsAt;if(period.alreadyLifetime)grantNote='Payment received; existing legacy no-expiry course access was preserved.';}
  }
  const invoice=await one(Invoice,{number:'SA-ONLINE-'+String(order._id).toUpperCase(),user:user._id,kind:order.kind,title:order.title,courseSlug:order.kind==='course'?order.product:undefined,planName:order.kind==='membership'?order.product:undefined,accessDays:order.accessDays,durationMonths:order.durationMonths,accessStartsAt:start,accessExpiresAt:expires,noScheduledExpiry:expires===null,renewalOf:order.renewalOf,dueAt:date,currency:order.currency,totalMinor:order.amountMinor,paidMinor:order.amountMinor,creditedMinor:0,status:'paid',paidAt:date,fulfillmentAt:new Date(),createdBy:user._id,origin:'online_checkout',testMode,requestKey:'online-invoice-'+String(order._id),requestFingerprint:digest(String(order._id))},session);
  const payment=await one(Payment,{user:user._id,invoice:invoice._id,checkoutOrder:order._id,kind:order.kind,courseSlug:order.kind==='course'?order.product:undefined,provider:order.provider,providerPaymentId:evidence.paymentId,providerRecordKey:[order.provider,order.environment,evidence.paymentId].join(':'),status:'paid',amountMinor:order.amountMinor,amount:order.amountMinor/100,currency:order.currency,paidAt:date,verifiedAt:new Date(),verificationSource,testMode,reference:evidence.paymentId,requestKey:'online-payment-'+String(order._id),requestFingerprint:digest(String(order._id))},session);
  if(order.kind==='membership'){const term=await one(Subscription,{user:user._id,plan:order.product,status:'active',startsAt:start,endsAt:expires,dueAt:null,durationMonths:order.durationMonths,priceMinor:order.amountMinor,currency:order.currency,invoice:invoice._id,source:'provider',cancelAtPeriodEnd:true,testMode},session);await syncMembershipCourseEnrollments({userId:user._id,startsAt:start,endsAt:expires,invoice:invoice._id,testMode,session,reason:`Academy membership: ${order.product}`});await queueSubscriptionConfirmation(term,session);}
  else if(!grantNote)await Enrollment.findOneAndUpdate({user:user._id,courseSlug:order.product},{$set:{status:'active',accessStartsAt:start,accessExpiresAt:expires,source:'provider',invoice:invoice._id,reason:'Verified online payment '+evidence.paymentId,testMode}},{upsert:true,new:true,runValidators:true,session});
  order.status='paid';order.paidAt=date;order.invoice=invoice._id;order.payment=payment._id;order.accessStartsAt=start;order.accessExpiresAt=expires;order.grantNote=grantNote;await order.save({session});
  await one(Notification,{dedupeKey:'online-paid-'+String(order._id),type:grantNote?'payment_review':'payment_received',title:testMode?'Sandbox payment received':'Online payment received',message:`${user.name} purchased ${order.title} through ${order.provider}. ${order.currency} ${(order.amountMinor/100).toFixed(2)}.${grantNote?' '+grantNote:''}${user.status==='blocked'?' Customer account is blocked; contact the owner.':''}`,user:user._id,link:'/admin?section=payments',entityId:String(payment._id)},session);
  await audit(null,{scope:'business',action:'payment.online_verified',targetUser:user._id,entityType:'checkout',entityId:String(order._id),changes:{provider:order.provider,environment:order.environment,amountMinor:order.amountMinor,currency:order.currency,invoice:String(invoice._id),verificationSource}},session);
  return publicOrder(order);
 });
}
export async function syncCheckout(orderId,{userId,capture=false,verificationSource='provider_api'}={}){
 const filter={_id:objectId(String(orderId)),...(userId?{user:objectId(String(userId))}:{})},order=await CheckoutOrder.findOne(filter);
 if(!order)throw businessError('Checkout order not found.',404);if(order.status==='paid')return publicOrder(order);
 if(!order.providerOrderId)return publicOrder(order);
 const evidence=order.provider==='stripe'?await stripeEvidence(order):await paypalEvidence(order,{capture});
 if(evidence.state==='paid')return fulfillOnlineOrder(order._id,evidence,verificationSource);
 if(['expired','cancelled','failed'].includes(evidence.state))await CheckoutOrder.updateOne({_id:order._id,status:{$ne:'paid'}},{$set:{status:evidence.state}});
 const updated=await CheckoutOrder.findById(order._id);return publicOrder(updated);
}
