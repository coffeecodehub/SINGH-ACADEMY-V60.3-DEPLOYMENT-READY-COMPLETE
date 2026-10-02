import 'dotenv/config';
import mongoose from 'mongoose';
import {connectDB} from '../config/db.js';
import {runStudentNotificationCycle} from '../services/studentNotifications.js';
import {closeMailer} from '../utils/mailer.js';
try{await connectDB();console.log(JSON.stringify(await runStudentNotificationCycle()));}catch(error){console.error('Notification run failed:',error.message);process.exitCode=1;}finally{closeMailer();await mongoose.disconnect();}
