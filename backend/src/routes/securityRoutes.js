import {Router} from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import AuthSession from '../models/AuthSession.js';
import {requireAuth} from '../middleware/auth.js';
import {rateLimit} from '../middleware/rateLimit.js';
import {confirmIdentity,consumeMfa} from '../services/identity.js';
import {issueSession,revokeUserSessions} from '../services/sessions.js';
import {audit} from '../services/audit.js';
import {adminMfaRequired,passwordError,hashToken,publicUser} from '../utils/security.js';
import {makeMfaSecret,encryptSecret,decryptSecret,totpStep} from '../utils/totp.js';
const r=Router();r.use(requireAuth);
const scope=req=>req.authPortal==='super_admin'?'super_auth':req.authPortal==='client_admin'?'client_auth':'student_auth';
const err=(message,status=400)=>Object.assign(new Error(message),{status});
r.get('/',async(req,res)=>{
 const sessions=await AuthSession.find({user:req.user._id,portal:req.authPortal,revokedAt:null,expiresAt:{$gt:new Date()}}).select('_id createdAt lastSeenAt expiresAt userAgent networkId').sort({lastSeenAt:-1}).limit(30).lean();
 res.json({success:true,mfaEnabled:req.user.mfaEnabled,mfaRequired:req.authPortal!=='student'&&adminMfaRequired(),setupRequired:req.authSession.setupOnly,currentSessionId:req.authSession._id,sessions});
});
r.use(rateLimit('security-write',20,900000),rateLimit('security-account',20,900000,{authenticated:true}));
r.post('/sessions/revoke',async(req,res)=>{
 await confirmIdentity(req);const id=req.body?.sessionId;
 const query={user:req.user._id,portal:req.authPortal,revokedAt:null};
 if(id==='others')query._id={$ne:req.authSession._id};else if(typeof id==='string'&&/^[0-9a-f]{24}$/.test(id))query._id=id;else throw err('Select a valid session.');
 await AuthSession.updateMany(query,{$set:{revokedAt:new Date()}});await audit(req,{scope:scope(req),action:'auth.sessions_revoked',targetUser:req.user._id});res.json({success:true,message:'Selected sessions have been signed out.'});
});
r.post('/password',async(req,res)=>{
 const user=await confirmIdentity(req),error=passwordError(req.body?.newPassword);if(error)throw err(error);
 user.passwordHash=await bcrypt.hash(req.body.newPassword,12);user.tokenVersion=Number(user.tokenVersion||0)+1;await user.save();
 await revokeUserSessions(user._id);await audit(req,{scope:scope(req),action:'auth.password_changed',targetUser:user._id});await issueSession(req,res,user,req.authPortal);res.json({success:true,message:'Password updated. Other sessions were signed out.'});
});
r.post('/mfa/setup',async(req,res)=>{
 const user=await confirmIdentity(req);if(user.mfaEnabled)throw err('Two-step verification is already enabled.',409);
 const secret=makeMfaSecret();await User.updateOne({_id:user._id,mfaEnabled:{$ne:true}},{$set:{mfaPendingSecret:encryptSecret(secret),mfaPendingExpires:new Date(Date.now()+600000)}});
 const issuer='Singh Academy',label=`${issuer}:${user.email}`;
 res.json({success:true,secret,uri:`otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`,message:'Add this secret to your authenticator, then enter the 6-digit code. Setup expires in 10 minutes.'});
});
r.post('/mfa/enable',async(req,res)=>{
 await confirmIdentity(req);const user=await User.findById(req.user._id).select('+mfaPendingSecret +mfaPendingExpires +tokenVersion');
 if(user.mfaEnabled||!user.mfaPendingSecret||!(user.mfaPendingExpires>new Date()))throw err('Start a new authenticator setup.');
 const step=totpStep(decryptSecret(user.mfaPendingSecret),req.body?.code);if(step===null)throw err('Authenticator code is invalid.');
 const recoveryCodes=Array.from({length:8},()=>crypto.randomBytes(10).toString('hex'));
 const updated=await User.findOneAndUpdate({_id:user._id,mfaEnabled:{$ne:true},mfaPendingSecret:user.mfaPendingSecret,mfaPendingExpires:{$gt:new Date()}},{$set:{mfaEnabled:true,mfaSecret:user.mfaPendingSecret,mfaPendingSecret:null,mfaPendingExpires:null,mfaLastStep:step,mfaRecoveryHashes:recoveryCodes.map(hashToken)},$inc:{tokenVersion:1}},{new:true}).select('+tokenVersion');
 if(!updated)throw err('Setup has already changed. Start again.',409);
 await revokeUserSessions(user._id);await audit(req,{scope:scope(req),action:'auth.mfa_enabled',targetUser:user._id});await issueSession(req,res,updated,req.authPortal);
 res.json({success:true,recoveryCodes,user:publicUser(updated),message:'Two-step verification enabled. Save these one-use recovery codes now; they will not be displayed again.'});
});
r.post('/mfa/disable',async(req,res)=>{
 if(req.authPortal!=='student'&&adminMfaRequired())throw err('Two-step verification is required for this admin workspace.',403);
 const user=await confirmIdentity(req);if(!user.mfaEnabled||!await consumeMfa(user,req.body?.code))throw err('Enter a new authenticator or recovery code.');
 const updated=await User.findByIdAndUpdate(user._id,{$set:{mfaEnabled:false,mfaSecret:null,mfaLastStep:-1,mfaRecoveryHashes:[],mfaPendingSecret:null,mfaPendingExpires:null},$inc:{tokenVersion:1}},{new:true}).select('+tokenVersion');
 await revokeUserSessions(user._id);await audit(req,{scope:scope(req),action:'auth.mfa_disabled',targetUser:user._id});await issueSession(req,res,updated,req.authPortal);res.json({success:true,message:'Two-step verification disabled. Other sessions were signed out.'});
});
export default r;
