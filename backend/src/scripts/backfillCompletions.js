/** Explicit backfill only. Run on a backed-up staging database first. Never auto-issues certificates. */
import {ensureAttempt} from '../services/attempts.js';import 'dotenv/config';import mongoose from 'mongoose';import {connectDB} from '../config/db.js';import Progress from '../models/Progress.js';import User from '../models/User.js';import Course from '../models/Course.js';import CourseCompletion from '../models/CourseCompletion.js';import {transaction} from '../services/businessWrite.js';import {recordCourseCompletion,checkCompletion} from '../services/completions.js';
const apply=process.argv.includes('--apply');let eligible=0,created=0,skipped=0;
try{await connectDB();console.log(apply?'APPLY: pending completion records and notifications only. No certificates will be issued.':'DRY RUN: checking existing lesson progress. Use --apply after reviewing the count.');
 const cursor=Progress.aggregate([{$match:{completed:true}},{$group:{_id:{user:'$user',course:'$course'}}}]).cursor({batchSize:100});
 for await(const item of cursor){const {user:uid,course:cid}=item._id;const [user,course,existing]=await Promise.all([User.findOne({_id:uid,role:'student',status:{$ne:'blocked'}}),Course.findOne({_id:cid,published:true}),CourseCompletion.exists({user:uid,course:cid})]);if(!user||!course||existing){skipped++;continue;}const checked=await checkCompletion(uid,course,null);if(!checked.progress.complete){skipped++;continue;}eligible++;
  if(apply){await transaction(async session=>{await User.updateOne({_id:uid},{$inc:{commerceVersion:1}},{session});const attempt=await ensureAttempt(uid,cid,session);attempt.legacy=true;await attempt.save({session});await recordCourseCompletion(user,course,session,attempt);});created++;}
 }
 console.log(JSON.stringify({dryRun:!apply,eligible,created,skipped}));
}catch(error){console.error('Completion backfill stopped:',error.message);process.exitCode=1;}finally{await mongoose.disconnect();}
