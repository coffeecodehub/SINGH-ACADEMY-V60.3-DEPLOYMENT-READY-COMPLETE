import express,{Router} from 'express';import {verifyStripeEvent,verifyPayPalEvent} from '../services/paymentProviders.js';import {applyGatewayEvent} from '../services/gatewayWebhooks.js';
import {rateLimit} from '../middleware/rateLimit.js';
const r=Router();
// These two exact endpoints are exempt from browser CSRF, but never exempt from provider signatures.
r.post('/stripe',express.raw({type:'application/json',limit:'1mb'}),rateLimit('stripe-webhook',600,60000),async(req,res)=>{const event=await verifyStripeEvent(req.body,req.get('stripe-signature'));await applyGatewayEvent('stripe',event);res.json({received:true});});
r.post('/paypal',express.json({limit:'1mb'}),rateLimit('paypal-webhook',180,60000),async(req,res)=>{const event=await verifyPayPalEvent(req.body,req.headers);await applyGatewayEvent('paypal',event);res.json({received:true});});
export default r;
