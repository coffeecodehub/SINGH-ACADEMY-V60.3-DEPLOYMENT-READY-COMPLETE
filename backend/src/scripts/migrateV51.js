/** V51 additive migration: indexes only. Existing users, courses, progress, attempts, payments and certificates are never reset. */
import 'dotenv/config';
import mongoose from 'mongoose';
import {connectDB} from '../config/db.js';
import CourseAttempt from '../models/CourseAttempt.js';
import ContactMessage from '../models/ContactMessage.js';
try{
  await connectDB();
  for(const model of [CourseAttempt,ContactMessage]){
    await model.createIndexes();
    console.log(`${model.modelName}: V51 indexes checked/created.`);
  }
  console.log('V51 additive migration complete. Resume position and contact-topic fields are schema-compatible and require no destructive data rewrite.');
  console.log('Existing course progress, attempts, Try Again feedback, payments, subscriptions and certificates were preserved.');
}catch(e){
  console.error('V51 migration stopped:',e.message);
  console.error('Do not delete collections to fix a migration error. Back up and inspect the staging database, then rerun after resolving the cause.');
  process.exitCode=1;
}finally{await mongoose.disconnect();}
