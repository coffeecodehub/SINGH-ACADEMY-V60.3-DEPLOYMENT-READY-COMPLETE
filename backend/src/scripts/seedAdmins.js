/** Database-owner provisioning, never reachable from public signup or a business dashboard. */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import {connectDB} from '../config/db.js';
import User from '../models/User.js';
import AuthSession from '../models/AuthSession.js';
import AuditLog from '../models/AuditLog.js';
import {normalizeRole,passwordError} from '../utils/security.js';
const reset=process.argv.includes('--reset-password');
const accounts=[{role:'client_admin',prefix:'CLIENT_ADMIN',name:'Singh Academy Admin'},{role:'super_admin',prefix:'SUPER_ADMIN',name:'Singh Academy Website Admin'}];
try{
 await connectDB();
 for(const a of accounts){
  const email=(process.env[a.prefix+'_EMAIL']||'').trim().toLowerCase(),password=process.env[a.prefix+'_PASSWORD'];
  if(!email||!password){console.log(`Skipped ${a.role}: configure its email and password in .env.`);continue;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error(`Invalid ${a.role} email.`);
  const user=await User.findOne({email}).select('+tokenVersion');
  if(user&&normalizeRole(user.role)!==a.role)throw new Error(`Refusing to change ${email} to another role. Use a separate admin email.`);
  if(user&&!reset){console.log(`Preserved ${email}: password, name and role unchanged.`);continue;}
  const error=passwordError(password);if(error||/CHANGE[_ -]?ME|YOUR_|GENERATE_WITH|REPLACE[_ -]?WITH/i.test(password))throw new Error(`${a.role}: ${error||'replace the placeholder password; run npm run setup.'}`);
  const passwordHash=await bcrypt.hash(password,12);
  if(user){
   await User.updateOne({_id:user._id},{$set:{passwordHash},$inc:{tokenVersion:1}});
   await AuthSession.updateMany({user:user._id,revokedAt:null},{$set:{revokedAt:new Date()}});
   await AuditLog.create({scope:a.role==='client_admin'?'client_auth':'super_auth',action:'owner.password_reset',targetUser:user._id,reason:'Explicit database-owner seed --reset-password',outcome:'success'});
   console.log(`Password reset and sessions invalidated for ${email}. MFA settings were preserved.`);
  }else{
   const created=await User.create({name:process.env[a.prefix+'_NAME']||a.name,email,passwordHash,role:a.role,status:'active',emailVerified:true});
   await AuditLog.create({scope:a.role==='client_admin'?'client_auth':'super_auth',action:'owner.admin_created',targetUser:created._id,reason:'Database-owner provisioning',outcome:'success'});
   console.log(`Created ${a.role}: ${email}. First login may require authenticator setup.`);
  }
 }
}catch(e){console.error('Admin provisioning failed:',e.message);process.exitCode=1;}finally{await mongoose.disconnect();}
