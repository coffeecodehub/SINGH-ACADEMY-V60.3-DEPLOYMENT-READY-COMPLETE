import {businessError,toMinor,addMonths,afterDays} from './business.js';
/** Database prices are authoritative. Browser amounts, currency and access durations are never used. */
export function durationMonths(value,label='Access term'){const n=Number(value);if(!Number.isInteger(n)||n<1||n>120)throw businessError(`${label} needs a whole-number duration from 1 to 120 months.`,409);return n;}
export function courseOffers(course){
 const prices=Array.isArray(course.pricing)?course.pricing:[];
 const fallback=durationMonths(course.accessMonths??1,'Course access term');
 if(prices.length)return prices.map((p,i)=>({key:String(i),label:p.label||'Individual course access',amountMinor:toMinor(p.price,{allowZero:true}),currency:course.currency||'USD',durationMonths:durationMonths(p.durationMonths??(Number(p.accessDays)>0?Math.max(1,Math.ceil(Number(p.accessDays)/30)):fallback),'Course price option'),accessDays:Number(p.accessDays)||0}));
 return [{key:'base',label:'Individual course access',amountMinor:toMinor(course.salePrice??course.price??0,{allowZero:true}),currency:course.currency||'USD',durationMonths:fallback,accessDays:0}];
}
export function durationDays(value){const n=Number(value);if(!Number.isInteger(n)||n<0||n>36500)throw businessError('The course access duration needs an administrator review.',409);return n;}
export function selectCourseOffer(course,key){
 const offers=courseOffers(course),chosen=key==null||key===''?offers[0]:offers.find(o=>o.key===key);
 if(!chosen)throw businessError('This price option changed. Reload the course and choose again.',409);
 return chosen;
}
export function planOffer(plan){const months=durationMonths(plan.durationMonths||(plan.period==='year'?12:1),'Membership term');return {key:'plan',label:plan.name,amountMinor:toMinor(plan.price),currency:plan.currency||'USD',durationMonths:months};}
export function gatewayCurrency(code){const currency=String(code).toUpperCase();if(!['USD','EUR','GBP','CAD','AUD'].includes(currency))throw businessError('Online checkout is not configured for this currency. Please contact the Academy.',409);return currency;}
export function moneyString(minor){if(!Number.isSafeInteger(minor)||minor<0)throw businessError('Invalid stored payment amount.',409);return `${Math.floor(minor/100)}.${String(minor%100).padStart(2,'0')}`;}
export function paymentEnvironment(provider,env=process.env){if(provider==='stripe')return env.STRIPE_SECRET_KEY?.startsWith('sk_live_')?'live':'test';return env.PAYPAL_MODE==='live'?'live':'test';}
function credential(s){return typeof s==='string'&&s.length>6&&!/YOUR_|CHANGE.?ME|REPLACE_|GENERATED_BY/i.test(s);}
export function gatewayConfiguration(env=process.env){
 const on=env.ONLINE_PAYMENTS_ENABLED==='true';
 const stripe=on&&/^sk_(test|live)_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY||'')&&credential(env.STRIPE_WEBHOOK_SECRET)&&String(env.STRIPE_WEBHOOK_SECRET).startsWith('whsec_');
 const paypal=on&&credential(env.PAYPAL_CLIENT_ID)&&credential(env.PAYPAL_CLIENT_SECRET)&&credential(env.PAYPAL_WEBHOOK_ID)&&(!env.PAYPAL_MERCHANT_ID||/^[A-Z0-9]{13}$/i.test(env.PAYPAL_MERCHANT_ID))&&['sandbox','live'].includes(env.PAYPAL_MODE);
 return {stripe:{enabled:Boolean(stripe),environment:paymentEnvironment('stripe',env)},paypal:{enabled:Boolean(paypal),environment:paymentEnvironment('paypal',env)}};
}
export function requireGateway(provider,env=process.env){const all=gatewayConfiguration(env);if(!['stripe','paypal'].includes(provider)||!all[provider].enabled)throw businessError('This payment method is not connected yet. No payment was taken.',503);if(env.NODE_ENV==='production'&&all[provider].environment!=='live')throw businessError('Sandbox payments cannot run on the production website.',503);return all[provider];}
export function frontendOrigin(env=process.env){let u;try{u=new URL(env.FRONTEND_URL||'http://localhost:3000');}catch{throw businessError('Website URL is not configured.',503);}if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.pathname!=='/'||u.search||u.hash||(env.NODE_ENV==='production'&&u.protocol!=='https:'))throw businessError('Website URL is invalid.',503);return u.origin;}
export function approvedRedirect(url,provider,environment){try{const u=new URL(url);const allowed=provider==='stripe'?['checkout.stripe.com']:[environment==='live'?'www.paypal.com':'www.sandbox.paypal.com'];if(u.protocol==='https:'&&!u.username&&!u.password&&allowed.includes(u.hostname))return u.href;}catch{}throw businessError('The payment provider returned an invalid checkout address.',502);}
export function assertEvidence(order,evidence){
 if(evidence.state!=='paid')throw businessError('Payment has not completed.',409);
 if(evidence.provider!==order.provider||evidence.environment!==order.environment||evidence.providerOrderId!==order.providerOrderId||evidence.orderId!==String(order._id)||evidence.currency!==order.currency||evidence.amountMinor!==order.amountMinor||typeof evidence.paymentId!=='string'||!evidence.paymentId)throw businessError('Payment details did not match the saved order. Access was not granted.',409);
 const date=new Date(evidence.paidAt);if(!Number.isFinite(date.getTime())||date>new Date(Date.now()+300000)||date.getFullYear()<2020)throw businessError('The provider payment timestamp is invalid.',409);
}
export function coursePeriod(current,paidAt,days){
 const start=new Date(paidAt),active=current?.status==='active'&&new Date(current.accessStartsAt)<=start&&(!current.accessExpiresAt||new Date(current.accessExpiresAt)>start);
 if(active&&!current.accessExpiresAt)return {startsAt:new Date(current.accessStartsAt),endsAt:null,alreadyLifetime:true};
 if(current?.status==='active'&&new Date(current.accessStartsAt)>start)throw businessError('An existing scheduled entitlement needs review.',409);
 const from=active?new Date(current.accessStartsAt):start,base=active?new Date(current.accessExpiresAt):start;
 return {startsAt:from,endsAt:days===0?null:afterDays(base,days),alreadyLifetime:false};
}
export function courseMonthPeriod(current,paidAt,months){
 const paid=new Date(paidAt),term=durationMonths(months,'Course access term');
 if(current?.status==='active'&&new Date(current.accessStartsAt)>paid)throw businessError('An existing scheduled course entitlement needs review.',409);
 const active=current?.status==='active'&&new Date(current.accessStartsAt)<=paid&&current.accessExpiresAt&&new Date(current.accessExpiresAt)>paid;
 if(current?.status==='active'&&new Date(current.accessStartsAt)<=paid&&!current.accessExpiresAt)return {startsAt:new Date(current.accessStartsAt),endsAt:null,alreadyLifetime:true};
 const startsAt=active?new Date(current.accessStartsAt):paid,base=active?new Date(current.accessExpiresAt):paid;
 return {startsAt,endsAt:addMonths(base,term),alreadyLifetime:false};
}
export function activeEnrollmentWindow(now=new Date()){return {$and:[{$or:[{accessStartsAt:{$exists:false}},{accessStartsAt:null},{accessStartsAt:{$lte:now}}]},{$or:[{accessExpiresAt:null},{accessExpiresAt:{$exists:false}},{accessExpiresAt:{$gt:now}}]}]};}
export function realAccessFilter(env=process.env){return env.NODE_ENV==='production'?{testMode:{$ne:true}}:{};}
