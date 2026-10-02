import 'dotenv/config';
import mongoose from 'mongoose';
import {connectDB} from '../config/db.js';
try{
 await connectDB();
 console.log('V54 additive migration complete. No payment/user/course records were rewritten; existing checkout, billing, access, media, progress and certificates were preserved.');
}finally{await mongoose.disconnect();}
