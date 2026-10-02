import RateLimit from '../models/RateLimit.js';
import {privateKey,emailValue} from '../utils/security.js';
/** MongoDB-backed fixed windows work across API instances; expiry is checked by bucket, not TTL timing. */
export function rateLimit(name,limit,windowMs,{account=false,authenticated=false}={}) {return async(req,res,next)=>{try{
 const now=Date.now(),bucket=Math.floor(now/windowMs),identity=authenticated?String(req.user?._id||'unknown'):account?emailValue(req.body?.email)||'invalid':req.ip||'unknown';
 const key=privateKey(`${name}:${identity}:${bucket}`);
 let row;try{row=await RateLimit.findOneAndUpdate({_id:key},{$inc:{count:1},$setOnInsert:{expiresAt:new Date((bucket+1)*windowMs)}},{upsert:true,new:true}).lean();}
 catch(e){if(e.code!==11000)throw e;row=await RateLimit.findOneAndUpdate({_id:key},{$inc:{count:1}},{new:true}).lean();}
 if(row.count>limit){res.set('Retry-After',String(Math.ceil(((bucket+1)*windowMs-now)/1000)));return res.status(429).json({success:false,message:'Too many attempts. Please wait before trying again.'});}next();
 }catch(e){next(e);}};}
