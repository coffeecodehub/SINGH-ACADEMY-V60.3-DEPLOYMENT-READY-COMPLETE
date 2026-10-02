/** V53 additive migration: new lesson video-poster fields are schema-compatible; indexes only. */
import 'dotenv/config';
import mongoose from 'mongoose';
import {connectDB} from '../config/db.js';
import Lesson from '../models/Lesson.js';
import TeamMember from '../models/TeamMember.js';
try{
  await connectDB();
  for(const model of [Lesson,TeamMember]){await model.createIndexes();console.log(`${model.modelName}: V53 indexes checked/created.`);}
  console.log('V53 additive migration complete. Existing courses, team members, media, progress, payments, subscriptions and certificates were preserved.');
  console.log('Video thumbnail fields are optional and require no destructive data rewrite.');
}catch(e){console.error('V53 migration stopped:',e.message);console.error('Do not delete collections. Resolve the configuration/index issue on a backup or staging copy, then rerun.');process.exitCode=1;}finally{await mongoose.disconnect();}
