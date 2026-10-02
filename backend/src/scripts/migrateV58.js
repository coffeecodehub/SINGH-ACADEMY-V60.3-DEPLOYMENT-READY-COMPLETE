import mongoose from 'mongoose';
import {connectDB} from '../config/db.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import Subscription from '../models/Subscription.js';
import {syncMembershipCourseEnrollments} from '../services/membershipEnrollments.js';

try{
 await connectDB();
 const now=new Date();
 const [students,reviews,memberships]=await Promise.all([
  User.updateMany({role:'student'},{$set:{emailVerified:true,verificationToken:null,verificationExpires:null}}),
  Review.updateMany({status:'pending'},{$set:{status:'approved'}}),
  Subscription.find({status:'active',startsAt:{$lte:now},endsAt:{$gt:now}}).select('user startsAt endsAt invoice testMode plan').lean()
 ]);
 let membershipEnrollments=0;
 for(const membership of memberships){const result=await syncMembershipCourseEnrollments({userId:membership.user,startsAt:membership.startsAt,endsAt:membership.endsAt,invoice:membership.invoice||null,testMode:Boolean(membership.testMode),reason:`Academy membership: ${membership.plan||'active plan'}`});membershipEnrollments+=result.changed;}
 console.log(`V58 migration complete. Student accounts released from email verification: ${students.modifiedCount}. Legacy pending reviews published: ${reviews.modifiedCount}. Membership course enrollments synced: ${membershipEnrollments}.`);
 process.exit(0);
}catch(error){console.error('V58 migration failed:',error.message);process.exit(1);}finally{await mongoose.disconnect().catch(()=>{});}
