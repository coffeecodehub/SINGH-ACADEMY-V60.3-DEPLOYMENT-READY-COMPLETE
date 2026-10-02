import 'dotenv/config';
import crypto from 'node:crypto';
import {connectDB} from '../config/db.js';
import Review from '../models/Review.js';
import CourseCompletion from '../models/CourseCompletion.js';
import SiteContent from '../models/SiteContent.js';
import {createCertificatePdf} from '../services/certificatePdf.js';
const front=()=>String(process.env.FRONTEND_URL||'http://localhost:3000').replace(/\/$/,'');
try{
 await connectDB();
 const reviewResult=await Review.updateMany({status:'pending'},{$set:{status:'approved'}});
 const site=await SiteContent.findOne({key:'websiteContent'});if(site?.value?.text){site.value.text['reviews-003']='Learner testimonials and feedback.';site.value.text['reviews-013']='Your review is published after submission.';site.markModified('value');site.revision=Number(site.revision||0)+1;await site.save();}
 let certificates=0,skipped=0;
 const issued=await CourseCompletion.find({status:'issued'}).select('+pdf +pdfSha256 +verificationToken');
 for(const item of issued){try{if(!item.verificationToken||!item.certificateNumber){skipped++;continue;}const pdf=createCertificatePdf({studentName:item.certificateName||item.studentName,courseTitle:item.certificateTitle||item.courseTitle,completedAt:item.completedAt,issuedAt:item.issuedAt||item.updatedAt||new Date(),issuedBy:item.issuedByName||'Singh Academy',number:item.certificateNumber,verificationUrl:`${front()}/certificates/verify/${item.verificationToken}`});item.pdf=pdf;item.pdfSha256=crypto.createHash('sha256').update(pdf).digest('hex');await item.save();certificates++;}catch(err){skipped++;console.warn(`Skipped certificate ${item.certificateNumber||item._id}: ${err.message}`);}}
 console.log(`V57 migration complete. Published reviews: ${reviewResult.modifiedCount}. Certificates regenerated with the approved universal template: ${certificates}. Skipped: ${skipped}.`);process.exit(0);
}catch(err){console.error(err);process.exit(1);}
