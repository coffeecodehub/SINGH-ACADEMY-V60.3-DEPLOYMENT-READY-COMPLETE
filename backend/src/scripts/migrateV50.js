/** Non-destructive additive migration. Never guesses payment dates, subscription terms or receipts. */
import 'dotenv/config';
import mongoose from 'mongoose';
import {connectDB} from '../config/db.js';
import User from '../models/User.js';
import AuthSession from '../models/AuthSession.js';
import RateLimit from '../models/RateLimit.js';
import AuditLog from '../models/AuditLog.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Refund from '../models/Refund.js';
import Subscription from '../models/Subscription.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';
import TeamMember from '../models/TeamMember.js';
import Event from '../models/Event.js';
import Review from '../models/Review.js';
import SiteContent from '../models/SiteContent.js';
import Notification from '../models/Notification.js';
import Progress from '../models/Progress.js';
import PurchaseRequest from '../models/PurchaseRequest.js';
import CheckoutOrder from '../models/CheckoutOrder.js';
import CourseCompletion from '../models/CourseCompletion.js';
import CourseAttempt from '../models/CourseAttempt.js';
import LessonSubmission from '../models/LessonSubmission.js';
import StudentFile from '../models/StudentFile.js';
import GatewayEvent from '../models/GatewayEvent.js';
import ContactMessage from '../models/ContactMessage.js';
import StudentNotification from '../models/StudentNotification.js';
import PaymentAttachment from '../models/PaymentAttachment.js';
try{
 await connectDB();
 for(const[oldRoles,role]of [[['admin','administrator','clientadmin','client-admin'],'client_admin'],[['superadmin','super-admin'],'super_admin']]){
  const r=await User.collection.updateMany({role:{$in:oldRoles}},{$set:{role},$inc:{tokenVersion:1}});console.log(`Normalized documented ${role} aliases: ${r.modifiedCount}`);
 }
 for(const[field,value]of Object.entries({status:'active',tokenVersion:0,loginCount:0,mfaEnabled:false,commerceVersion:0})){
  const r=await User.collection.updateMany({[field]:{$exists:false}},{$set:{[field]:value}});console.log(`Added missing ${field}: ${r.modifiedCount}`);
 }
 if(process.argv.includes('--require-reverify')){
  const r=await User.updateMany({role:'student'},{$set:{emailVerified:false},$inc:{tokenVersion:1}});
  console.log(`Explicit student email re-verification enabled for ${r.modifiedCount} accounts. They must request verification from student login.`);
 }
 for(const model of [User,AuthSession,RateLimit,AuditLog,Invoice,Payment,Refund,Subscription,Enrollment,Course,Module,Lesson,TeamMember,Event,Review,SiteContent,Notification,Progress,PurchaseRequest,ContactMessage,CheckoutOrder,CourseCompletion,GatewayEvent,CourseAttempt,LessonSubmission,StudentFile,StudentNotification,PaymentAttachment]){
  // createIndexes adds required indexes; unlike syncIndexes it does not delete unrelated existing indexes.
  await model.createIndexes();console.log(`${model.modelName}: required indexes checked/created.`);
 }
 await CourseCompletion.collection.updateMany({attemptNumber:{$exists:false}},{$set:{attemptNumber:1}});
 await SiteContent.collection.updateMany({revision:{$exists:false}},{$set:{revision:0}});
 console.log('Student notifications and private receipt-attachment indexes checked. No past congratulations were generated.');
 console.log('Historical certificates and progress preserved. No assessment answers were invented.');
 const hello=await mongoose.connection.db.admin().command({hello:1});
 console.log(hello.setName||hello.msg==='isdbgrid'?'Transaction-capable database detected.':'WARNING: standalone MongoDB. Transactional learning and payment writes remain locked; use Atlas or a replica set.');
 console.log('V50 additive migration complete. Existing collections, dates, receipts, prices and content were preserved.');
 console.log('V45 portal cookies are retained. No data reseed is needed; old pre-V45 shared sessions remain incompatible.');
}catch(e){console.error('V50 migration stopped:',e.message);console.error('Do not delete data to fix an index conflict. Inspect duplicates and restore/reconcile a staging copy. Additive steps may already be applied; the migration is safe to rerun.');process.exitCode=1;}finally{await mongoose.disconnect();}
