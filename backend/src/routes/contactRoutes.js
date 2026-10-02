import {Router} from 'express';
import ContactMessage from '../models/ContactMessage.js';
import {rateLimit} from '../middleware/rateLimit.js';
import {emailValue,emailOk} from '../utils/security.js';
import {text,businessError} from '../utils/business.js';
const r=Router();
r.post('/',rateLimit('public-contact',5,3600000),async(req,res)=>{
 if(req.body?.website)return res.status(202).json({success:true,message:'Thank you. Your message has been received.'});
 const name=text(req.body?.name,'Name',120,2),email=emailValue(req.body?.email),topic=text(req.body?.topic||'General enquiry','Topic',80,2),message=text(req.body?.message,'Message',4000,10);
 if(!emailOk(email))throw businessError('Enter a valid email address.');
 await ContactMessage.create({name,email,topic,message});
 res.status(201).json({success:true,message:'Your message has been received by the Academy. Keep an eye on your email for a reply.'});
});export default r;
