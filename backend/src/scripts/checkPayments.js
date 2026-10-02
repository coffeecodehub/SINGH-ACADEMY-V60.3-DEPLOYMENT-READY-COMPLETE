import 'dotenv/config';
import {gatewayConfiguration} from '../utils/commerce.js';
import {checkEnvironment} from '../utils/deployment.js';
import {getStripe,paypalApi} from '../services/paymentProviders.js';

const remote=process.argv.includes('--remote');
const strict=process.argv.includes('--strict-webhooks');
const stripeEvents=['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired','refund.created','refund.updated','charge.dispute.created','charge.dispute.closed'];
const paypalEvents=['CHECKOUT.ORDER.APPROVED','CHECKOUT.PAYMENT-APPROVAL.REVERSED','PAYMENT.CAPTURE.COMPLETED','PAYMENT.CAPTURE.DENIED','PAYMENT.CAPTURE.PENDING','PAYMENT.CAPTURE.REFUNDED','PAYMENT.CAPTURE.REVERSED','CUSTOMER.DISPUTE.CREATED','CUSTOMER.DISPUTE.RESOLVED'];
let failures=0;
const pass=m=>console.log('PASS',m),warn=m=>console.warn('WARN',m),fail=m=>{failures++;console.error('FAIL',m);};
function origin(value){try{const u=new URL(value);if(u.origin!==value)throw new Error();return u.origin;}catch{return '';}}
function expected(provider){const base=origin(process.env.PAYMENT_WEBHOOK_BASE_URL||'')||origin(process.env.FRONTEND_URL||'');return base?`${base}/api/payments/webhooks/${provider}`:'';}
function missingEvents(actual,required,aliases={}){const set=new Set(actual||[]);if(set.has('*'))return [];return required.filter(x=>!set.has(x)&&!(aliases[x]||[]).some(a=>set.has(a)));}

const config=gatewayConfiguration();
console.log(`Payment configuration check (${process.env.NODE_ENV||'development'}). Secret values are never printed.`);
if(process.env.ONLINE_PAYMENTS_ENABLED!=='true')fail('ONLINE_PAYMENTS_ENABLED is not true.');
for(const provider of ['stripe','paypal']){
 const item=config[provider];
 if(item.enabled)pass(`${provider}: local configuration complete (${item.environment}).`);else fail(`${provider}: configuration incomplete.`);
}
if(process.env.PAYMENTS_REQUIRE_BOTH!=='true')warn('PAYMENTS_REQUIRE_BOTH is not true. Production can start with only one configured provider.');
const envCheck=checkEnvironment(process.env);
for(const e of envCheck.errors.filter(x=>/payment|checkout|stripe|paypal/i.test(x)))fail(e);
for(const w of envCheck.warnings.filter(x=>/payment|checkout|api/i.test(x)))warn(w);
if(!remote){
 console.log('Config-only check finished. Add --remote to verify provider credentials/webhook registration without creating a charge.');
 if(failures)process.exitCode=1;
 process.exit();
}

if(config.stripe.enabled){
 try{
  const stripe=await getStripe();
  await stripe.accounts.retrieve();
  pass(`stripe: API credentials authenticated (${config.stripe.environment}).`);
  const url=expected('stripe');
  if(!url)warn('stripe: PAYMENT_WEBHOOK_BASE_URL/FRONTEND_URL is missing; webhook URL cannot be compared.');
  else{
   const endpoints=await stripe.webhookEndpoints.list({limit:100});
   const endpoint=endpoints.data.find(x=>x.url===url&&x.status!=='disabled');
   if(!endpoint){(strict?fail:warn)(`stripe: no enabled webhook endpoint found at ${url}.`);}
   else{
    const missing=missingEvents(endpoint.enabled_events,stripeEvents);
    if(missing.length)(strict?fail:warn)(`stripe: webhook is missing required events: ${missing.join(', ')}`);else pass('stripe: webhook URL and required event subscriptions found.');
   }
  }
 }catch(error){fail(`stripe remote verification failed: ${error?.message||'provider error'}`);}
}

if(config.paypal.enabled){
 try{
  const data=await paypalApi('/v1/notifications/webhooks');
  pass(`paypal: API credentials authenticated (${config.paypal.environment}).`);
  const hooks=Array.isArray(data?.webhooks)?data.webhooks:[];
  const hook=hooks.find(x=>x.id===process.env.PAYPAL_WEBHOOK_ID);
  if(!hook)(strict?fail:warn)('paypal: configured PAYPAL_WEBHOOK_ID was not found in this REST app/environment.');
  else{
   const url=expected('paypal');
   if(url&&hook.url!==url)(strict?fail:warn)(`paypal: webhook ID points to ${hook.url}, expected ${url}.`);
   else if(url)pass('paypal: configured webhook ID points to the expected URL.');
   const missing=missingEvents((hook.event_types||[]).map(x=>x.name),paypalEvents,{'PAYMENT.CAPTURE.DENIED':['PAYMENT.CAPTURE.DECLINED']});
   if(missing.length)(strict?fail:warn)(`paypal: webhook is missing required events: ${missing.join(', ')}`);else pass('paypal: required webhook event subscriptions found.');
  }
 }catch(error){fail(`paypal remote verification failed: ${error?.message||'provider error'}`);}
}

if(failures){console.error(`${failures} payment check(s) failed.`);process.exitCode=1;}else console.log('Payment configuration checks passed. No order or charge was created.');
