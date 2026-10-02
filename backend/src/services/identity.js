import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import {hashToken} from '../utils/security.js';
import {decryptSecret,totpStep} from '../utils/totp.js';
export const authSecrets='+passwordHash +tokenVersion +mfaSecret +mfaLastStep +mfaRecoveryHashes';
export async function confirmIdentity(req){
 const password=req.body?.currentPassword;
 const user=await User.findById(req.user._id).select(authSecrets);
 if(!user||typeof password!=='string'||Buffer.byteLength(password)>72||!await bcrypt.compare(password,user.passwordHash))throw Object.assign(new Error('Your current admin password is incorrect.'),{status:403});
 return user;
}
/** Atomic consumption stops concurrent replays of an OTP or recovery code. */
export async function consumeMfa(user,input){
 if(typeof input!=='string')return false;
 const code=input.trim().replace(/-/g,'').toLowerCase();
 if(/^[0-9a-f]{20}$/.test(code)){
  const hash=hashToken(code);
  const result=await User.updateOne({_id:user._id,mfaEnabled:true,mfaRecoveryHashes:hash},{$pull:{mfaRecoveryHashes:hash}});
  return result.modifiedCount===1;
 }
 if(!user.mfaSecret)return false;
 const step=totpStep(decryptSecret(user.mfaSecret),code,Date.now(),Number(user.mfaLastStep??-1));
 if(step===null)return false;
 const result=await User.updateOne({_id:user._id,mfaEnabled:true,$or:[{mfaLastStep:{$lt:step}},{mfaLastStep:{$exists:false}}]},{$set:{mfaLastStep:step}});
 return result.modifiedCount===1;
}
