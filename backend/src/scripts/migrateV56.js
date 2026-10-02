/** V56 migration: normalize catalog pricing to fixed month terms. Existing paid access dates are preserved. */
import 'dotenv/config';
import mongoose from 'mongoose';
import {connectDB} from '../config/db.js';
import Course from '../models/Course.js';
import SiteContent from '../models/SiteContent.js';
try{
 await connectDB();
 const courses=await Course.find({});let changed=0;
 for(const course of courses){
  let dirty=false;
  if(!Number.isInteger(course.accessMonths)||course.accessMonths<1){const first=(course.pricing||[])[0];course.accessMonths=Number.isInteger(first?.durationMonths)&&first.durationMonths>0?first.durationMonths:(Number(first?.accessDays)>0?Math.max(1,Math.ceil(Number(first.accessDays)/30)):1);dirty=true;}
  course.pricing=(course.pricing||[]).map(p=>{const raw=p.toObject?p.toObject():p;if(Number.isInteger(raw.durationMonths)&&raw.durationMonths>0)return {...raw,billing:'one-time'};const months=Number(raw.accessDays)>0?Math.max(1,Math.ceil(Number(raw.accessDays)/30)):course.accessMonths;dirty=true;return {...raw,durationMonths:months,billing:'one-time'};});
  if(dirty){await course.save();changed++;}
 }
 const plans=await SiteContent.findOne({key:'membershipPlans'});if(plans&&Array.isArray(plans.value)){plans.value=plans.value.map(p=>({...p,durationMonths:Number(p.durationMonths||(p.period==='year'?12:1)),billing:'one-time'}));plans.markModified('value');await plans.save();}
 console.log(`Singh Academy V56 migration complete: ${changed} course catalog record(s) normalized to month-based access.`);
 console.log('Existing users, payments, invoices, enrollments, membership dates, progress, media and certificates were not reset.');
}finally{await mongoose.disconnect();}
