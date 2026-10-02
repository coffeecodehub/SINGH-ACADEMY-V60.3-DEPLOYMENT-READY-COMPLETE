import 'dotenv/config';
import mongoose from 'mongoose';
import {connectDB} from '../config/db.js';
import Enrollment from '../models/Enrollment.js';
import SiteContent from '../models/SiteContent.js';
import {ensureEnrollmentIndexes} from '../utils/enrollmentIndexes.js';

try{
 await connectDB();
 // ensureEnrollmentIndexes performs guarded collection.dropIndex repair and ensures user_1_courseSlug_1.
 const dropped=await ensureEnrollmentIndexes(Enrollment.collection);
 let site=await SiteContent.findOne({key:'websiteContent'});
 const contact={
  'contact-009':'singh@singhacademy.com',
  'contact-010':'+1 (559) 308 1249',
  'contact-011':'By appointment · USA'
 };
 let contactUpdated=false;
 if(site){const value=site.value&&typeof site.value==='object'?site.value:{text:{},images:[]};value.text=value.text&&typeof value.text==='object'?value.text:{};for(const [key,val] of Object.entries(contact)){if(!String(value.text[key]||'').trim()){value.text[key]=val;contactUpdated=true;}}if(contactUpdated){site.value=value;site.markModified('value');site.revision=(site.revision||0)+1;await site.save();}}
 console.log(`Singh Academy V60 migration complete. Legacy over-restrictive enrollment indexes removed: ${dropped.length?dropped.join(', '):'none'}.`);
 console.log(`Enrollment uniqueness is now per student + course. Contact defaults ${contactUpdated?'were added to existing website content':'needed no database change'}.`);
 console.log('Existing users, payments, enrollments, course progress, certificates and media were not reset.');
}catch(error){console.error('V60 migration failed:',error.message);process.exitCode=1;}finally{await mongoose.disconnect().catch(()=>{});}
