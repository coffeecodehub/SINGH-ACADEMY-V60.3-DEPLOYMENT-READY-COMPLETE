import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import {httpSafety,plainQuery} from './middleware/httpSafety.js';
import {rateLimit} from './middleware/rateLimit.js';
import authRoutes from './routes/authRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import gatewayWebhookRoutes from './routes/gatewayWebhookRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import academyAdminRoutes from './routes/academyAdminRoutes.js';
import studentNotificationRoutes from './routes/studentNotificationRoutes.js';
import {configuredOrigins,writeRequestAllowed} from './utils/security.js';
export function createApp(){
 const app=express(),origins=configuredOrigins();app.disable('x-powered-by');
 const hops=Number(process.env.TRUST_PROXY_HOPS||0);if(Number.isInteger(hops)&&hops>0)app.set('trust proxy',hops);
 app.set('query parser','simple');app.use(httpSafety);app.use(plainQuery);
 app.use(cors({origin(origin,cb){if(!origin||origins.includes(origin))return cb(null,true);cb(Object.assign(new Error('This website origin is not allowed.'),{status:403}));},credentials:true,methods:['GET','POST','PUT','PATCH','DELETE','OPTIONS'],allowedHeaders:['Content-Type','X-SA-Portal','X-SA-CSRF','Idempotency-Key'],maxAge:600}));
 app.use('/api/payments/webhooks',gatewayWebhookRoutes);
 app.use(express.json({limit:'2mb'}));app.use(cookieParser());
 app.use((req,res,next)=>{if(!writeRequestAllowed({method:req.method,origin:req.get('origin'),referer:req.get('referer'),marker:req.get('X-SA-CSRF'),fetchSite:req.get('Sec-Fetch-Site')},origins))return res.status(403).json({success:false,message:'Request origin or anti-CSRF header was rejected.'});next();});
 app.get('/api/health',(req,res)=>res.json({success:true,version:'60.3'}));
 app.get('/api/health/ready',async(req,res)=>{try{if(mongoose.connection.readyState!==1)throw new Error();await mongoose.connection.db.command({ping:1},{maxTimeMS:2000});return res.json({success:true,ready:true});}catch{return res.status(503).json({success:false,ready:false});}});
 app.use('/api',rateLimit('api-global',600,60000));
 app.use('/api/contact',contactRoutes);app.use('/api/auth',authRoutes);app.use('/api/academy-admin',academyAdminRoutes);app.use('/api/admin',adminRoutes);
 app.use('/api/student-notifications',studentNotificationRoutes);app.use('/api/certificates',certificateRoutes);app.use('/api/courses',courseRoutes);app.use('/api/reviews',reviewRoutes);app.use('/api/payments',paymentRoutes);app.use('/api/content',contentRoutes);app.use('/api/media',mediaRoutes);
 // No testing-enrollment or unverified payment-success shortcut is mounted.
 app.use((req,res)=>res.status(404).json({success:false,message:'API route not found.'}));
 app.use((err,req,res,next)=>{
  if(res.headersSent)return next(err);let status=err.status||500,message=err.message||'Internal server error.';
  if(err.name==='ValidationError'){status=400;message=Object.values(err.errors).map(e=>e.message).join(' ');}
  if(err.name==='CastError'){status=400;message='Invalid record identifier or field value.';}
  if(err.code===11000){status=409;message='That record, reference or unique value already exists. Refresh before trying again.';}
  if(err.name==='MulterError'){status=400;message=err.code==='LIMIT_FILE_SIZE'?'File exceeds the upload limit.':'Upload one supported file at a time.';}
  if(status>=500){console.error(JSON.stringify({event:'api_error',requestId:req.requestId,type:err.name||'Error',code:typeof err.code==='string'?err.code:undefined}));if(status!==503)message='The request could not be completed. Contact support with the request ID.';}
  res.status(status).json({success:false,message,requestId:req.requestId,code:err.code&&typeof err.code==='string'?err.code:undefined});
 });return app;
}
