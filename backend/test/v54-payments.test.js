import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {paypalRequestId} from '../src/services/paymentProviders.js';
import {checkEnvironment} from '../src/utils/deployment.js';

const id='0123456789abcdef01234567';
const base=()=>({NODE_ENV:'development',AUTH_SECRET:crypto.randomBytes(48).toString('hex'),MFA_ENCRYPTION_KEY:crypto.randomBytes(32).toString('hex'),MONGODB_URI:'mongodb://127.0.0.1:27017/sa_test?replicaSet=rs0',FRONTEND_URL:'http://localhost:3000',ONLINE_PAYMENTS_ENABLED:'true',STRIPE_SECRET_KEY:'sk_test_abcdef12345',STRIPE_WEBHOOK_SECRET:'whsec_abcdef12345',PAYPAL_MODE:'sandbox',PAYPAL_CLIENT_ID:'abcdef12345',PAYPAL_CLIENT_SECRET:'abcdefSecret12345',PAYPAL_MERCHANT_ID:'QDGTZ7B92B9QT',PAYPAL_WEBHOOK_ID:'webhookFixture123'});

test('V54 PayPal idempotency keys use a conservative short deterministic policy',()=>{
 for(const action of ['create','capture']){
  const a=paypalRequestId(action,id),b=paypalRequestId(action,id);
  assert.equal(a,b);assert.ok(a.length<=25);assert.match(a,/^[A-Za-z0-9._-]+$/);
 }
 assert.notEqual(paypalRequestId('create',id),paypalRequestId('capture',id));
 assert.notEqual(paypalRequestId('create',id),paypalRequestId('create','abcdefabcdefabcdefabcdef'));
});

test('V54 can require both configured payment providers at deployment',()=>{
 const env={...base(),PAYMENTS_REQUIRE_BOTH:'true'};
 assert.equal(checkEnvironment(env).errors.length,0);
 assert.ok(checkEnvironment({...env,PAYPAL_WEBHOOK_ID:''}).errors.some(x=>x.includes('PAYMENTS_REQUIRE_BOTH')));
});

test('V54 payment webhook base must be an exact safe origin',()=>{
 const env={...base(),PAYMENT_WEBHOOK_BASE_URL:'https://api.academy.test'};
 assert.equal(checkEnvironment(env).errors.length,0);
 assert.ok(checkEnvironment({...env,PAYMENT_WEBHOOK_BASE_URL:'https://api.academy.test/path'}).errors.some(x=>x.includes('PAYMENT_WEBHOOK_BASE_URL')));
});


test('V54 rejects mixed Stripe test and PayPal live environments',()=>{
 const env={...base(),PAYPAL_MODE:'live'};
 assert.ok(checkEnvironment(env).errors.some(x=>x.includes('same payment environment')));
});
