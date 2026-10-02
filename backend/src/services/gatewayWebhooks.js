import CheckoutOrder from '../models/CheckoutOrder.js';import GatewayEvent from '../models/GatewayEvent.js';import Notification from '../models/Notification.js';
import {syncCheckout} from './onlineCheckout.js';import {refundEvidence,recordGatewayRefund} from './gatewayRefunds.js';import {paymentEnvironment} from '../utils/commerce.js';import {businessError} from '../utils/business.js';
async function findOrder(provider,remoteId,localId){
 let item;if(localId&&/^[a-f0-9]{24}$/.test(localId))item=await CheckoutOrder.findOne({_id:localId,provider,environment:paymentEnvironment(provider)});
 if(!item&&remoteId)item=await CheckoutOrder.findOne({provider,providerOrderId:remoteId,environment:paymentEnvironment(provider)});
 if(item&&!item.providerOrderId)throw businessError('Provider order registration is still in progress. Retry event.',503);
 if(item&&remoteId&&item.providerOrderId!==remoteId)throw businessError('Webhook does not match this checkout.',409);return item;
}
export async function applyGatewayEvent(provider,event){
 const id=event?.id,type=provider==='stripe'?event.type:event.event_type;if(typeof id!=='string'||id.length>150||typeof type!=='string')throw businessError('Invalid webhook event.',400);
 const environment=paymentEnvironment(provider),key=[provider,environment,id].join(':');
 if(provider==='stripe'&&event.livemode!==(environment==='live'))throw businessError('Stripe event environment mismatch.',400);
 if(await GatewayEvent.exists({key}))return {replayed:true};let order=null,handled=false;
 if(provider==='stripe'){
  const obj=event.data?.object||{};
  if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(type)){
   order=await findOrder(provider,obj.id,obj.metadata?.sa_order_id);if(order){await syncCheckout(order._id,{verificationSource:'provider_webhook'});handled=true;}
  }else if(['checkout.session.async_payment_failed','checkout.session.expired'].includes(type)){
   order=await findOrder(provider,obj.id,obj.metadata?.sa_order_id);if(order){await CheckoutOrder.updateOne({_id:order._id,status:{$ne:'paid'}},{$set:{status:type==='checkout.session.expired'?'expired':'failed'}});handled=true;}
  }else if(['refund.created','refund.updated'].includes(type)){
   const evidence=await refundEvidence(provider,obj.id);if(evidence){await recordGatewayRefund(evidence);handled=true;}
  }else if(['charge.dispute.created','charge.dispute.closed'].includes(type)){
   await Notification.updateOne({dedupeKey:key},{$setOnInsert:{dedupeKey:key,type:'provider_review',title:'Stripe dispute requires review',message:`Provider dispute event ${type}. Review the dispute in Stripe before changing customer access or collection records. Reference: ${id}`,link:'/admin?section=payments'}},{upsert:true});handled=true;
  }
 }else{
  const resource=event.resource||{};
  if(type==='CHECKOUT.ORDER.APPROVED'){
   order=await findOrder(provider,resource.id,resource.purchase_units?.[0]?.custom_id);if(order){await syncCheckout(order._id,{capture:true,verificationSource:'provider_webhook'});handled=true;}
  }else if(type==='CHECKOUT.PAYMENT-APPROVAL.REVERSED'){
   order=await findOrder(provider,resource.order_id,resource.purchase_units?.[0]?.custom_id);if(order){await CheckoutOrder.updateOne({_id:order._id,status:{$ne:'paid'}},{$set:{status:'cancelled'}});handled=true;}
  }else if(['PAYMENT.CAPTURE.COMPLETED','PAYMENT.CAPTURE.PENDING'].includes(type)){
   order=await findOrder(provider,resource.supplementary_data?.related_ids?.order_id,resource.custom_id);if(order){await syncCheckout(order._id,{verificationSource:'provider_webhook'});handled=true;}
  }else if(['PAYMENT.CAPTURE.DENIED','PAYMENT.CAPTURE.DECLINED'].includes(type)){
   order=await findOrder(provider,resource.supplementary_data?.related_ids?.order_id,resource.custom_id);if(order){await CheckoutOrder.updateOne({_id:order._id,status:{$ne:'paid'}},{$set:{status:'failed'}});handled=true;}
  }else if(type==='PAYMENT.CAPTURE.REFUNDED'){
   const evidence=await refundEvidence(provider,resource.id);if(evidence){await recordGatewayRefund(evidence);handled=true;}
  }else if(['PAYMENT.CAPTURE.REVERSED','CUSTOMER.DISPUTE.CREATED','CUSTOMER.DISPUTE.RESOLVED'].includes(type)){
   await Notification.updateOne({dedupeKey:key},{$setOnInsert:{dedupeKey:key,type:'provider_review',title:'PayPal reversal or dispute requires review',message:`Review ${type} in PayPal and reconcile access and financial records. Reference: ${id}`,link:'/admin?section=payments'}},{upsert:true});handled=true;
  }
 }
 // Mark only after successful application. Duplicate retries safely read an already fulfilled order/refund.
 try{await GatewayEvent.create({key,provider,eventType:type,order:order?._id,processedAt:new Date()});}catch(error){if(error.code!==11000)throw error;}
 return {handled};
}
