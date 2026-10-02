import AuditLog from '../models/AuditLog.js';
import {privateKey} from '../utils/security.js';
export function requestMeta(req={}) {
 req=req||{};return {networkId:privateKey(req.ip||req.socket?.remoteAddress||'unknown').slice(0,16),userAgent:String(req.get?.('user-agent')||'').replace(/[\x00-\x1f]/g,'').slice(0,200)};}
export async function audit(req,event,session=null){const docs=await AuditLog.create([{actor:req?.user?._id||null,...requestMeta(req),...event}],session?{session}:{});return docs[0];}
export function cmsAudit(req,res,next){if(['GET','HEAD','OPTIONS'].includes(req.method))return next();res.on('finish',()=>{if(res.statusCode<400)audit(req,{scope:'cms',action:'cms.'+req.method.toLowerCase(),entityType:'content',entityId:req.path}).catch(e=>console.error('CMS audit write failed:',e.message));});next();}
