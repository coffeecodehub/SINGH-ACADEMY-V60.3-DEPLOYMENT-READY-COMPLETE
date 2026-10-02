import mongoose from 'mongoose';
import {envInteger} from '../utils/deployment.js';
export async function connectDB(){
  const uri=process.env.MONGODB_URI||process.env.MONGO_URI;
  if(!uri) throw new Error('MONGODB_URI (or MONGO_URI) is missing in backend/.env');
  mongoose.set('bufferCommands',false);
  await mongoose.connect(uri, {
    maxPoolSize:envInteger(process.env.MONGO_MAX_POOL,20,2,100), minPoolSize:0,
    serverSelectionTimeoutMS:10000, connectTimeoutMS:10000, socketTimeoutMS:45000,
    autoIndex:process.env.NODE_ENV!=='production'
  });
  console.log('MongoDB connected');
}
