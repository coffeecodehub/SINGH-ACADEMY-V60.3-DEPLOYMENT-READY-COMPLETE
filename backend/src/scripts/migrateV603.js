import 'dotenv/config';
import mongoose from 'mongoose';
import {connectDB} from '../config/db.js';
import Enrollment from '../models/Enrollment.js';
import {ensureEnrollmentIndexes} from '../utils/enrollmentIndexes.js';

try{
 await connectDB();
 const dropped=await ensureEnrollmentIndexes(Enrollment.collection);
 console.log(`Singh Academy V60.3 migration complete. Conflicting enrollment unique indexes removed: ${dropped.length?dropped.join(', '):'none'}.`);
 console.log('Canonical enrollment uniqueness: one record per student + course; different students may enroll in the same course.');
 console.log('Existing users, payments, subscriptions, enrollments, progress and certificates were preserved.');
}catch(error){console.error('V60.3 migration failed:',error.message);process.exitCode=1;}finally{await mongoose.disconnect().catch(()=>{});}
