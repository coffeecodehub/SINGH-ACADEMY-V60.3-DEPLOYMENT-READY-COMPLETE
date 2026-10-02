import crypto from 'node:crypto';
import {businessError,toMinor} from '../utils/business.js';
import {frontendOrigin,moneyString,paymentEnvironment,approvedRedirect} from '../utils/commerce.js';
let stripeClient,stripeKey;
export async function getStripe(){
 const key=process.env.STRIPE_SECRET_KEY;
 if(!key)throw businessError('Stripe is not configured.',503);
 if(!stripeClient||stripeKey!==key){const {default:Stripe}=await import('stripe');stripeClient=new Stripe(key,{maxNetworkRetries:2,timeout:10000});stripeKey=key;}
 return stripeClient;
}
export async function createStripeOrder(order,user){
 const stripe=await getStripe(),root=frontendOrigin();
 const data=await stripe.checkout.sessions.create({
  mode:'payment',client_reference_id:String(order._id),
  customer_email:user.email,
  line_items:[{quantity:1,price_data:{currency:order.currency.toLowerCase(),unit_amount:order.amountMinor,product_data:{name:order.title.slice(0,200),description:order.kind==='membership'?`${order.durationMonths} month Academy membership. One payment; no automatic renewal.`:`${order.durationMonths} month individual course access. One payment; no automatic renewal.`}}}],
  metadata:{sa_order_id:String(order._id),sa_user_id:String(order.user)},
  payment_intent_data:{metadata:{sa_order_id:String(order._id)}},
  success_url:root+'/checkout/return?order='+String(order._id),cancel_url:root+'/checkout/return?order='+String(order._id)+'&cancelled=1',
  expires_at:Math.floor(new Date(order.expiresAt).getTime()/1000)
 },{idempotencyKey:'sa-create-'+String(order._id)});
 return {id:data.id,url:approvedRedirect(data.url,'stripe',order.environment)};
}
export async function stripeEvidence(order){
 const stripe=await getStripe();
 const s=await stripe.checkout.sessions.retrieve(order.providerOrderId,{expand:['payment_intent.latest_charge']});
 if(s.client_reference_id!==String(order._id)||s.metadata?.sa_order_id!==String(order._id)||s.metadata?.sa_user_id!==String(order.user)||s.mode!=='payment'||s.livemode!==(order.environment==='live'))throw businessError('Stripe checkout does not match the order.',409);
 if(s.payment_status!=='paid')return {state:s.status==='expired'?'expired':'pending'};
 const p=s.payment_intent,c=p?.latest_charge;
 if(!p||typeof p==='string'||p.status!=='succeeded'||typeof c==='string'||!c?.paid||!c?.created||p.amount_received!==order.amountMinor||p.currency?.toUpperCase()!==order.currency)throw businessError('Stripe payment is not confirmed as fully collected.',409);
 return {state:'paid',provider:'stripe',environment:s.livemode?'live':'test',providerOrderId:s.id,orderId:s.client_reference_id,amountMinor:s.amount_total,currency:s.currency.toUpperCase(),paymentId:p.id,paidAt:new Date(c.created*1000)};
}
let paypalToken=null;
function paypalBase(){return process.env.PAYPAL_MODE==='live'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com';}
async function readProvider(response){
 const raw=await response.text();if(raw.length>2000000)throw businessError('Payment provider response too large.',502);
 let data;try{data=JSON.parse(raw);}catch{throw businessError('Payment provider response could not be read.',502);}
 if(!response.ok){const e=businessError('Payment provider could not finish the request. Retry the same order; do not pay again if already charged.',502);e.providerStatus=response.status;e.providerCode=data.name||data.error?.code||'PROVIDER_ERROR';throw e;}return data;
}
async function getPayPalToken(){
 const id=process.env.PAYPAL_CLIENT_ID,secret=process.env.PAYPAL_CLIENT_SECRET;if(!id||!secret)throw businessError('PayPal is not configured.',503);
 const fingerprint=crypto.createHash('sha256').update(paypalBase()+id+secret).digest('hex');
 if(paypalToken?.fingerprint===fingerprint&&paypalToken.expiresAt>Date.now()+60000)return paypalToken.value;
 const response=await fetch(paypalBase()+'/v1/oauth2/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:'Basic '+Buffer.from(id+':'+secret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
 const data=await readProvider(response);if(typeof data.access_token!=='string')throw businessError('PayPal authentication failed.',502);
 paypalToken={fingerprint,value:data.access_token,expiresAt:Date.now()+Math.max(60,Number(data.expires_in)||300)*1000};return paypalToken.value;
}
export async function paypalApi(path,{method='GET',body,requestId}={}){
 if(!/^\/v[12]\//.test(path))throw businessError('Invalid provider request.',500);
 const response=await fetch(paypalBase()+path,{method,redirect:'error',signal:AbortSignal.timeout(12000),headers:{Authorization:'Bearer '+await getPayPalToken(),'Content-Type':'application/json',Prefer:'return=representation',...(requestId?{'PayPal-Request-Id':requestId}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 return readProvider(response);
}
export function paypalRequestId(action,value){
 const label=action==='capture'?'cap':'new',digest=crypto.createHash('sha256').update(String(action)+':'+String(value)).digest('hex').slice(0,18);
 return `sa-${label}-${digest}`; // Short deterministic provider idempotency key; never contains secrets.
}
export async function createPayPalOrder(order){
 const root=frontendOrigin(),unit={reference_id:'academy',custom_id:String(order._id),invoice_id:'SA-'+String(order._id),description:order.title.slice(0,127),amount:{currency_code:order.currency,value:moneyString(order.amountMinor)}};
 // Direct-merchant apps do not need to send a payee. If an owner supplies the 13-char Merchant ID,
 // keep the explicit payee binding and verify it again when reading provider truth.
 if(process.env.PAYPAL_MERCHANT_ID)unit.payee={merchant_id:process.env.PAYPAL_MERCHANT_ID};
 const data=await paypalApi('/v2/checkout/orders',{method:'POST',requestId:paypalRequestId('create',order._id),body:{
  intent:'CAPTURE',purchase_units:[unit],
  payment_source:{paypal:{experience_context:{brand_name:'Singh Academy',shipping_preference:'NO_SHIPPING',user_action:'PAY_NOW',return_url:root+'/checkout/return?order='+String(order._id),cancel_url:root+'/checkout/return?order='+String(order._id)+'&cancelled=1'}}}
 }});
 const url=(data.links||[]).find(l=>l.rel==='payer-action'||l.rel==='approve')?.href;
 return {id:data.id,url:approvedRedirect(url,'paypal',order.environment)};
}
export async function paypalEvidence(order,{capture=false}={}){
 let remote=await paypalApi('/v2/checkout/orders/'+encodeURIComponent(order.providerOrderId));
 const units=remote.purchase_units||[];
 if(remote.id!==order.providerOrderId||units.length!==1||units[0].custom_id!==String(order._id)||(process.env.PAYPAL_MERCHANT_ID&&units[0].payee?.merchant_id!==process.env.PAYPAL_MERCHANT_ID)||units[0].amount?.currency_code!==order.currency||toMinor(units[0].amount?.value)!==order.amountMinor||paymentEnvironment('paypal')!==order.environment)throw businessError('PayPal order details do not match the saved purchase.',409);
 if(remote.status==='APPROVED'&&capture){
  try{await paypalApi('/v2/checkout/orders/'+encodeURIComponent(order.providerOrderId)+'/capture',{method:'POST',requestId:paypalRequestId('capture',order._id),body:{}});remote=await paypalApi('/v2/checkout/orders/'+encodeURIComponent(order.providerOrderId));}
  catch(error){
   // A concurrent webhook can have captured the order already. Read provider truth before failing.
   const current=await paypalApi('/v2/checkout/orders/'+encodeURIComponent(order.providerOrderId));
   if(current.status!=='COMPLETED')throw error;remote=current;
  }
 }
 if(remote.status!=='COMPLETED')return {state:['VOIDED'].includes(remote.status)?'cancelled':'pending'};
 const purchases=remote.purchase_units||[];const captures=purchases[0]?.payments?.captures||[];
 if(purchases.length!==1||purchases[0].custom_id!==String(order._id)||(process.env.PAYPAL_MERCHANT_ID&&purchases[0].payee?.merchant_id!==process.env.PAYPAL_MERCHANT_ID)||captures.length!==1)throw businessError('Unexpected PayPal settlement. The Academy must review it.',409);
 const paid=captures[0];if(!['COMPLETED','REFUNDED','PARTIALLY_REFUNDED'].includes(paid.status))return {state:['DENIED','DECLINED','FAILED'].includes(paid.status)?'failed':'pending'};
 return {state:'paid',provider:'paypal',environment:paymentEnvironment('paypal'),providerOrderId:remote.id,orderId:purchases[0].custom_id,amountMinor:toMinor(paid.amount?.value),currency:paid.amount?.currency_code,paymentId:paid.id,paidAt:new Date(paid.create_time)};
}
export async function verifyStripeEvent(raw,signature){
 if(!process.env.STRIPE_WEBHOOK_SECRET||!signature||!Buffer.isBuffer(raw))throw businessError('Invalid Stripe signature.',400);
 try{return (await getStripe()).webhooks.constructEvent(raw,signature,process.env.STRIPE_WEBHOOK_SECRET,300);}catch{throw businessError('Invalid Stripe signature.',400);}
}
export async function verifyPayPalEvent(event,headers){
 if(!process.env.PAYPAL_WEBHOOK_ID||typeof event?.id!=='string'||event.id.length>150)throw businessError('Invalid PayPal event.',400);
 const fields={auth_algo:'paypal-auth-algo',cert_url:'paypal-cert-url',transmission_id:'paypal-transmission-id',transmission_sig:'paypal-transmission-sig',transmission_time:'paypal-transmission-time'},body={webhook_id:process.env.PAYPAL_WEBHOOK_ID,webhook_event:event};
 for(const[field,key]of Object.entries(fields)){const v=headers[key];if(typeof v!=='string'||!v||v.length>1000)throw businessError('Missing PayPal signature.',400);body[field]=v;}
 // The certificate URL is passed to PayPal's verification API, never fetched by this server.
 const result=await paypalApi('/v1/notifications/verify-webhook-signature',{method:'POST',body});
 if(result.verification_status!=='SUCCESS')throw businessError('Invalid PayPal signature.',400);return event;
}
