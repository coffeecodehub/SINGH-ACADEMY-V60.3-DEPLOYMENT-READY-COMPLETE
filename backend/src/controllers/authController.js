import {realAccessFilter,activeEnrollmentWindow} from '../utils/commerce.js';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import User from '../models/User.js';
import AuthSession from '../models/AuthSession.js';
import Enrollment from '../models/Enrollment.js';
import Subscription from '../models/Subscription.js';
import {sendAcademyEmail} from '../utils/mailer.js';
import {issueSession,revokeUserSessions} from '../services/sessions.js';
import {authSecrets,consumeMfa} from '../services/identity.js';
import {audit} from '../services/audit.js';
import {resolveSession} from '../middleware/auth.js';
import {COOKIE_NAMES,cookieOptions,requestedPortal,portalAllowsRole,normalizeRole,publicUser,emailValue,emailOk,passwordError,newToken,hashToken,privateKey} from '../utils/security.js';
const front=()=>process.env.FRONTEND_URL||'http://localhost:3000';
const bad=()=>Object.assign(new Error('Invalid credentials or this account is not permitted in this portal.'),{status:401});
const resetFields='+resetOtpHash +resetOtpExpires +resetOtpAttempts +resetPasswordToken +resetPasswordExpires';
async function welcomeEmail(user){return sendAcademyEmail({to:user.email,subject:'Welcome to Singh Academy',text:`Hello ${user.name},\n\nWelcome to Singh Academy. Your student account is ready and you are already signed in. You can now explore courses, Academy Plans and your learning dashboard.\n\nOpen Singh Academy: ${front()}/home\n\nSingh Academy`});}
export async function register(req,res){
 const {name,email,password,confirmPassword}=req.body||{},e=emailValue(email);
 if(typeof name!=='string'||name.trim().length<2||name.trim().length>120||!emailOk(e))return res.status(400).json({success:false,message:'Enter a name (2–120 characters) and a valid email address.'});
 const error=passwordError(password,8);if(error)return res.status(400).json({success:false,message:error});
 if(typeof confirmPassword!=='string'||confirmPassword!==password)return res.status(400).json({success:false,message:'Password and confirm password must match.'});
 if(await User.exists({email:e}))return res.status(409).json({success:false,message:'An account with this email already exists. Sign in instead.'});
 const now=new Date();let user;
 try{user=await User.create({name:name.trim(),email:e,passwordHash:await bcrypt.hash(password,12),role:'student',status:'active',emailVerified:true,verificationToken:null,verificationExpires:null,lastLoginAt:now,loginCount:1});}
 catch(err){if(err.code===11000)return res.status(409).json({success:false,message:'An account with this email already exists. Sign in instead.'});throw err;}
 await audit(req,{scope:'student_auth',action:'student.registered',targetUser:user._id,entityType:'user',entityId:String(user._id)});
 const sessionUser=await User.findById(user._id).select('+tokenVersion');
 await issueSession(req,res,sessionUser,'student');
 welcomeEmail(sessionUser).catch(err=>console.error(JSON.stringify({event:'email_delivery_failed',kind:'welcome',type:err.name||'Error',code:typeof err.code==='string'?err.code:undefined})));
 return res.status(201).json({success:true,message:`Welcome, ${sessionUser.name}. Your account is ready.`,user:publicUser(sessionUser),autoLogin:true,verificationRequired:false});
}
/** Login endpoints bind the portal SERVER-SIDE. A body.role/body.portal cannot widen access. */
export function loginFor(portal){return async(req,res)=>{
 const email=emailValue(req.body?.email),password=req.body?.password;
 if(!emailOk(email)||typeof password!=='string'||!password||Buffer.byteLength(password)>72)throw bad();
 const user=await User.findOne({email}).select(authSecrets);
 // Equal-cost bcrypt work also runs for unknown accounts.
 const fallback='$2b$12$C6UzMDM.H6dfI/f/IKxGhuY4cYwTfdnkHQkNAwFvmzfR0NG.jXa4q';
 const matches=await bcrypt.compare(password,user?.passwordHash||fallback);
 const permitted=Boolean(user&&matches&&portalAllowsRole(portal,user.role)&&user.status!=='blocked');
 const scope=portal==='student'?'student_auth':portal==='client_admin'?'client_auth':'super_auth';
 if(!permitted){await audit(req,{scope,action:'auth.login',outcome:'denied',targetUser:user&&portalAllowsRole(portal,user.role)?user._id:null,reason:'Credentials, account status or portal did not pass validation.'});throw bad();}
 if(user.mfaEnabled){
  if(!req.body?.otp)return res.status(401).json({success:false,code:'MFA_REQUIRED',message:'Enter your authenticator code or a recovery code.'});
  if(!await consumeMfa(user,req.body.otp)){await audit(req,{scope,action:'auth.mfa',outcome:'denied',targetUser:user._id,reason:'Invalid, expired or already-used code.'});return res.status(401).json({success:false,code:'MFA_REQUIRED',message:'Code invalid or already used. Use a new code.'});}
 }
 const updated=await User.findByIdAndUpdate(user._id,{$set:{lastLoginAt:new Date()},$inc:{loginCount:1}},{new:true}).select('+tokenVersion');
 await audit(req,{scope,action:'auth.login',targetUser:user._id,actor:user._id});
 const session=await issueSession(req,res,updated,portal);
 res.json({success:true,user:publicUser(updated),setupRequired:session.setupOnly});
};}
export const login=loginFor('student');
export async function forgotPassword(req,res){
 const email=emailValue(req.body?.email);if(!emailOk(email))return res.status(400).json({success:false,message:'Enter a valid email address.'});
 const message='If that email belongs to a student account, check your inbox for a reset code.';
 const user=await User.findOne({email,role:'student',status:{$ne:'blocked'}});
 if(user){const otp=String(crypto.randomInt(100000,1000000));await User.updateOne({_id:user._id},{$set:{resetOtpHash:privateKey(`${user._id}:${otp}`),resetOtpExpires:new Date(Date.now()+600000),resetOtpAttempts:0,resetPasswordToken:null,resetPasswordExpires:null}});
  try{await sendAcademyEmail({to:user.email,subject:'Singh Academy password reset code',text:`Your code is ${otp}. It expires in 10 minutes. Do not share it.`});}catch(e){console.error(JSON.stringify({event:'email_delivery_failed',type:e.name||'Error',code:typeof e.code==='string'?e.code:undefined}));}}
 res.json({success:true,message});
}
export async function verifyResetOtp(req,res){
 const email=emailValue(req.body?.email),otp=req.body?.otp;
 if(!emailOk(email)||typeof otp!=='string'||!/^\d{6}$/.test(otp))return res.status(400).json({success:false,message:'Code is invalid or expired.'});
 const user=await User.findOneAndUpdate({email,role:'student',resetOtpExpires:{$gt:new Date()},resetOtpAttempts:{$lt:5}},{$inc:{resetOtpAttempts:1}},{new:true}).select(resetFields);
 if(!user||user.resetOtpHash!==privateKey(`${user._id}:${otp}`))return res.status(400).json({success:false,message:'Code is invalid or expired. Request a new code after five unsuccessful attempts.'});
 const raw=newToken();const claimed=await User.updateOne({_id:user._id,resetOtpHash:user.resetOtpHash,resetOtpExpires:{$gt:new Date()}},{$set:{resetPasswordToken:hashToken(raw),resetPasswordExpires:new Date(Date.now()+900000),resetOtpHash:null,resetOtpExpires:null}});
 if(claimed.modifiedCount!==1)return res.status(400).json({success:false,message:'Code has already been used.'});
 res.json({success:true,resetToken:raw,message:'Code verified. Choose a new password.'});
}
export async function resetPassword(req,res){
 const token=req.body?.token,error=passwordError(req.body?.password,8);
 if(typeof token!=='string'||!/^[0-9a-f]{64}$/.test(token)||error)return res.status(400).json({success:false,message:error||'Reset session is invalid.'});
 const user=await User.findOneAndUpdate({role:'student',resetPasswordToken:hashToken(token),resetPasswordExpires:{$gt:new Date()}},{$set:{passwordHash:await bcrypt.hash(req.body.password,12),resetPasswordToken:null,resetPasswordExpires:null,resetOtpHash:null,resetOtpExpires:null,resetOtpAttempts:0},$inc:{tokenVersion:1}},{new:true});
 if(!user)return res.status(400).json({success:false,message:'Reset session is invalid, expired or already used.'});
 await revokeUserSessions(user._id);await audit(req,{scope:'student_auth',action:'auth.password_reset',targetUser:user._id});
 res.json({success:true,message:'Password changed. All previous sessions have been signed out.'});
}
export async function logout(req,res){
 const portal=requestedPortal(req);if(portal){const raw=req.cookies?.[COOKIE_NAMES[portal]];if(raw)await AuthSession.updateOne({tokenHash:hashToken(raw),portal},{$set:{revokedAt:new Date()}});const {maxAge,...options}=cookieOptions(portal);res.clearCookie(COOKIE_NAMES[portal],options);}
 res.clearCookie('sa_session',{path:'/'});return res.json({success:true,message:'Signed out of this portal.'});
}
async function sessionPayload(resolved){
 if(!resolved)return {success:true,user:null,enrollment:null};
 const {user,portal,session}=resolved;
 let enrollment=portal==='student'?await Enrollment.findOne({user:user._id,status:'active',...realAccessFilter(),...activeEnrollmentWindow(new Date())}).lean():null;
 if(portal==='student'&&!enrollment&&await Subscription.exists({user:user._id,status:'active',...realAccessFilter(),startsAt:{$lte:new Date()},endsAt:{$gt:new Date()}}))enrollment={type:'membership'};
 return {success:true,user:publicUser(user),enrollment,portal,setupRequired:session.setupOnly};
}
export async function me(req,res){res.json(await sessionPayload({user:req.user,portal:req.authPortal,session:req.authSession}));}
export async function session(req,res){res.json(await sessionPayload(await resolveSession(req)));}
