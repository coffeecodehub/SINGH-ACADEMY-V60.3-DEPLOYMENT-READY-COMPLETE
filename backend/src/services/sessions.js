import AuthSession from '../models/AuthSession.js';
import {newToken,hashToken,sessionAge,COOKIE_NAMES,cookieOptions,normalizeRole,adminMfaRequired} from '../utils/security.js';
import {requestMeta} from './audit.js';
export async function issueSession(req,res,user,portal){
 const old=req.cookies?.[COOKIE_NAMES[portal]];
 if(old)await AuthSession.updateOne({tokenHash:hashToken(old),portal},{$set:{revokedAt:new Date()}});
 const raw=newToken();const setupOnly=portal!=='student'&&adminMfaRequired()&&!user.mfaEnabled;
 const session=await AuthSession.create({user:user._id,portal,tokenHash:hashToken(raw),tokenVersion:Number(user.tokenVersion||0),
  expiresAt:new Date(Date.now()+sessionAge(portal)),lastSeenAt:new Date(),setupOnly,...requestMeta(req)});
 res.clearCookie('sa_session',{path:'/'}); // V44 cookies are deliberately not accepted.
 res.cookie(COOKIE_NAMES[portal],raw,cookieOptions(portal));return session;
}
export async function revokeUserSessions(userId,session=null){return AuthSession.updateMany({user:userId,revokedAt:null},{$set:{revokedAt:new Date()}},session?{session}:{});}
