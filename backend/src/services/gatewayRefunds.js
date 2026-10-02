import crypto from 'node:crypto';
import CheckoutOrder from '../models/CheckoutOrder.js';import {syncCheckout} from './onlineCheckout.js';
import Payment from '../models/Payment.js';import Refund from '../models/Refund.js';import Invoice from '../models/Invoice.js';import Enrollment from '../models/Enrollment.js';import Subscription from '../models/Subscription.js';import Notification from '../models/Notification.js';
import {transaction} from './businessWrite.js';import {audit} from './audit.js';import {businessError,toMinor} from '../utils/business.js';import {getStripe,paypalApi} from './paymentProviders.js';import {paymentEnvironment} from '../utils/commerce.js';
export async function refundEvidence(provider,refundId){
 if(typeof refundId!=='string'||!/^[-_A-Za-z0-9]{1,150}$/.test(refundId))throw businessError('Invalid provider refund reference.',400);
 if(provider==='stripe'){
  const refund=await (await getStripe()).refunds.retrieve(refundId);
  if(refund.status!=='succeeded')return null;
  const intent=await (await getStripe()).paymentIntents.retrieve(typeof refund.payment_intent==='string'?refund.payment_intent:refund.payment_intent?.id);
  return {localOrderId:intent.metadata?.sa_order_id,provider,environment:paymentEnvironment(provider),id:refund.id,paymentId:typeof refund.payment_intent==='string'?refund.payment_intent:refund.payment_intent?.id,amountMinor:refund.amount,currency:refund.currency.toUpperCase(),refundedAt:new Date(refund.created*1000)};
 }
 const refund=await paypalApi('/v2/payments/refunds/'+encodeURIComponent(refundId));if(refund.status!=='COMPLETED')return null;
 let captureId=refund.supplementary_data?.related_ids?.capture_id;
 if(!captureId){const up=(refund.links||[]).find(l=>l.rel==='up');try{const url=new URL(up?.href);if(['api-m.paypal.com','api-m.sandbox.paypal.com'].includes(url.hostname)&&url.protocol==='https:')captureId=url.pathname.match(/^\/v2\/payments\/captures\/([A-Za-z0-9]+)$/)?.[1];}catch{}}
 if(!captureId)throw businessError('PayPal refund capture reference needs review.',409);
 // Only the fixed PayPal API is queried, never an arbitrary event-supplied URL.
 const capture=await paypalApi('/v2/payments/captures/'+encodeURIComponent(captureId));
 return {localOrderId:capture.custom_id,remoteOrderId:capture.supplementary_data?.related_ids?.order_id,provider:'paypal',environment:paymentEnvironment('paypal'),id:refund.id,paymentId:captureId,amountMinor:toMinor(refund.amount?.value),currency:refund.amount?.currency_code,refundedAt:new Date(refund.create_time)};
}
export async function recordGatewayRefund(evidence){
 if(!evidence)return {ignored:true};const testMode=evidence.environment==='test',key=[evidence.provider,evidence.environment,'refund',evidence.id].join(':');
 if(!await Payment.exists({providerRecordKey:[evidence.provider,evidence.environment,evidence.paymentId].join(':')})){
  const references=[];if(/^[a-f0-9]{24}$/.test(evidence.localOrderId||''))references.push({_id:evidence.localOrderId});if(typeof evidence.remoteOrderId==='string'&&evidence.remoteOrderId)references.push({providerOrderId:evidence.remoteOrderId});
  if(!references.length)return {ignored:true};
  const order=await CheckoutOrder.findOne({provider:evidence.provider,environment:evidence.environment,$or:references});if(!order)return {ignored:true};
  await syncCheckout(order._id,{verificationSource:'provider_webhook'});
 }
 return transaction(async session=>{
  const already=await Refund.findOne({referenceKey:key}).session(session);if(already)return {replayed:true};
  const payment=await Payment.findOne({providerRecordKey:[evidence.provider,evidence.environment,evidence.paymentId].join(':')}).session(session);
  if(!payment){throw businessError('The payment must be reconciled before its refund. The provider will retry this event.',503);}
  if(!Number.isSafeInteger(evidence.amountMinor)||evidence.amountMinor<=0||evidence.currency!==payment.currency||payment.testMode!==testMode||new Date(evidence.refundedAt)<new Date(payment.paidAt)||!Number.isFinite(new Date(evidence.refundedAt).getTime()))throw businessError('Refund evidence did not match the original payment.',409);
  const refunded=(payment.refundedMinor||0)+evidence.amountMinor;if(refunded>payment.amountMinor)throw businessError('Refunds exceed the original collected amount.',409);
  const invoice=await Invoice.findById(payment.invoice).session(session);if(!invoice)throw businessError('Refund invoice needs review.',409);
  payment.refundedMinor=refunded;await payment.save({session});invoice.creditedMinor=(invoice.creditedMinor||0)+evidence.amountMinor;await invoice.save({session});
  const full=refunded===payment.amountMinor;
  await Refund.create([{payment:payment._id,invoice:invoice._id,user:payment.user,amountMinor:evidence.amountMinor,currency:evidence.currency,refundedAt:evidence.refundedAt,reference:evidence.id,referenceKey:key,reason:'Successful refund verified directly with '+evidence.provider,source:'provider_webhook',provider:evidence.provider,providerRefundId:evidence.id,testMode,revokeAccess:full,requestKey:key,requestFingerprint:crypto.createHash('sha256').update(JSON.stringify(evidence)).digest('hex')}],{session});
  if(full){await Enrollment.updateMany({invoice:invoice._id,status:'active'},{$set:{status:'cancelled',reason:'Full verified provider refund'}},{session});await Subscription.updateMany({invoice:invoice._id,status:'active'},{$set:{status:'cancelled',cancelledAt:new Date(),cancellationReason:'Full verified provider refund'}},{session});}
  await Notification.create([{dedupeKey:key,type:'provider_refund',title:testMode?'Sandbox refund recorded':'Online refund recorded',message:`${evidence.provider} returned ${evidence.currency} ${(evidence.amountMinor/100).toFixed(2)}. ${full?'Access linked to this invoice was revoked.':'Partial refund; access retained.'}`,user:payment.user,link:'/admin?section=refunds'}],{session});
  await audit(null,{scope:'business',action:'refund.provider_verified',entityType:'payment',entityId:String(payment._id),targetUser:payment.user,changes:{amountMinor:evidence.amountMinor,currency:evidence.currency,provider:evidence.provider,reference:evidence.id,testMode,full}},session);return {recorded:true};
 });
}
