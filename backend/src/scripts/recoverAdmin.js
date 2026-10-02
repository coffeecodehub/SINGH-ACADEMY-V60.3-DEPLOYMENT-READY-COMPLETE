/** Restricted operational recovery: requires direct deployment/database access. Never exposed via HTTP. */
import 'dotenv/config';
import mongoose from 'mongoose';
import {connectDB} from '../config/db.js';
import User from '../models/User.js';
import AuthSession from '../models/AuthSession.js';
import AuditLog from '../models/AuditLog.js';
const arg=name=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;};
try{
 const email=(arg('--email')||'').trim().toLowerCase();
 if(!email||!process.argv.includes('--reset-mfa')||!process.argv.includes('--confirm-owner-recovery'))throw new Error('Usage: npm run admin:recover -- --email ADMIN_EMAIL --reset-mfa --confirm-owner-recovery');
 await connectDB();const user=await User.findOne({email,role:{$in:['client_admin','super_admin']}});if(!user)throw new Error('An exact admin account was not found.');
 await User.updateOne({_id:user._id},{$set:{mfaEnabled:false,mfaSecret:null,mfaPendingSecret:null,mfaPendingExpires:null,mfaLastStep:-1,mfaRecoveryHashes:[]},$inc:{tokenVersion:1}});
 await AuthSession.updateMany({user:user._id,revokedAt:null},{$set:{revokedAt:new Date()}});
 await AuditLog.create({scope:user.role==='client_admin'?'client_auth':'super_auth',action:'owner.mfa_recovery',targetUser:user._id,reason:'Explicit database-owner MFA recovery; identity verification must be performed by the operator.',outcome:'success'});
 console.log('MFA reset and sessions invalidated. Password was NOT changed. Re-enroll the verified owner in an authenticator at the next sign-in.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await mongoose.disconnect();}
