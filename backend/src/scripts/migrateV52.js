/** V52 additive migration: create only the new/required indexes. It never drops existing indexes or rewrites user data. */
import 'dotenv/config';
import mongoose from 'mongoose';
import {connectDB} from '../config/db.js';
import AdminNavState from '../models/AdminNavState.js';
import User from '../models/User.js';
import ContactMessage from '../models/ContactMessage.js';
import Subscription from '../models/Subscription.js';
import CourseCompletion from '../models/CourseCompletion.js';
import Notification from '../models/Notification.js';
try{
 await connectDB();
 for(const model of [AdminNavState,User,ContactMessage,Subscription,CourseCompletion,Notification]){await model.createIndexes();console.log(`${model.modelName}: V52 indexes checked/created.`);}
 console.log('V52 additive migration complete. Existing users, learning progress, forms, payments, subscriptions and certificates were preserved.');
}catch(e){console.error('V52 migration stopped:',e.message);console.error('Do not delete collections or user data. Resolve the index/configuration issue on a backup/staging copy, then rerun.');process.exitCode=1;}finally{await mongoose.disconnect();}
