/** Portal and cryptographic helpers: no request-provided role grants authorization. */
import crypto from 'node:crypto';
export const PORTALS = Object.freeze(['student', 'client_admin', 'super_admin']);
export const COOKIE_NAMES = Object.freeze({student:'sa_student_v45',client_admin:'sa_client_admin_v45',super_admin:'sa_super_admin_v45'});
export function normalizeRole(role) {
  const value = typeof role === 'string' ? role.trim().toLowerCase().replace(/[- ]/g, '_') : '';
  if (['admin','administrator','clientadmin','client_admin'].includes(value)) return 'client_admin';
  if (['superadmin','super_admin'].includes(value)) return 'super_admin';
  return value; // Missing or unknown roles NEVER become students or administrators.
}
export function validPortal(value) { return PORTALS.includes(value); }
export function portalAllowsRole(portal, role) { return validPortal(portal) && portal === normalizeRole(role); }
export function requestedPortal(req) {
  const value = req.get?.('X-SA-Portal') || req.headers?.['x-sa-portal'] || 'student';
  return validPortal(value) ? value : null;
}
export const hashToken = value => crypto.createHash('sha256').update(String(value)).digest('hex');
export const newToken = () => crypto.randomBytes(32).toString('hex');
export function validSessionToken(value) { return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value); }
export function secretKey() { return process.env.AUTH_SECRET || process.env.JWT_SECRET || ''; }
export function privateKey(value) { return crypto.createHmac('sha256',secretKey()).update(String(value)).digest('hex'); }
export function sessionAge(portal) { return portal === 'student' ? 7*86400000 : 12*3600000; }
export function idleAge(portal) { return portal === 'student' ? 24*3600000 : 4*3600000; }
export function cookieOptions(portal) { return {httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/api',maxAge:sessionAge(portal)}; }
export function isSessionUsable(session,user,portal,now=new Date()) {
  return Boolean(session && user && portalAllowsRole(portal,user.role) && session.portal===portal &&
    String(session.user)===String(user._id) && !session.revokedAt && new Date(session.expiresAt)>now &&
    new Date(session.lastSeenAt).getTime()>now.getTime()-idleAge(portal) && user.status!=='blocked' &&
    Number(session.tokenVersion||0)===Number(user.tokenVersion||0));
}
export function adminMfaRequired() { return process.env.REQUIRE_ADMIN_MFA === 'true' || (process.env.NODE_ENV==='production' && process.env.REQUIRE_ADMIN_MFA!=='false'); }
export function publicUser(user) {
  if (!user) return null;
  return {id:String(user._id),_id:String(user._id),name:user.name,email:user.email,role:normalizeRole(user.role),
    emailVerified:Boolean(user.emailVerified),mfaEnabled:Boolean(user.mfaEnabled),createdAt:user.createdAt,lastLoginAt:user.lastLoginAt};
}
export function emailValue(value) { return typeof value==='string' && value.length<=254 ? value.trim().toLowerCase() : ''; }
export const emailOk = value => {
 if(typeof value!=='string'||value.length>254||/[^\x21-\x7e]/.test(value))return false;
 const parts=value.split('@');if(parts.length!==2)return false;
 const [local,domain]=parts;
 return local.length>0&&local.length<=64&&!local.startsWith('.')&&!local.endsWith('.')&&!local.includes('..')&&
 /^[a-z\d.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)&&domain.length<=253&&domain.includes('.')&&domain.split('.').every(label=>/^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label));
};
export function passwordError(value,minLength=12) {
  const min=Number.isInteger(minLength)&&minLength>=8?minLength:12;
  if(typeof value!=='string' || value.length<min) return `Use a password of at least ${min} characters.`;
  if(Buffer.byteLength(value,'utf8')>72) return 'Password must be no more than 72 UTF-8 bytes.';
  return '';
}
export const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeNext(value) {try{
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//'))return '/home';
 let decoded=value;for(let i=0;i<2;i++)decoded=decodeURIComponent(decoded);
 if(/[\\\u0000-\u0020]/.test(decoded)||decoded.startsWith('//'))return '/home';
 const target=new URL(decoded,'https://academy.invalid');
 if(target.origin!=='https://academy.invalid'||/^\/(?:admin|super-admin)(?:\/|$)/i.test(target.pathname))return '/home';
 return target.pathname+target.search+target.hash;
 }catch{return '/home';}}

export function configuredOrigins() { return (process.env.FRONTEND_URLS||process.env.FRONTEND_URL||'http://localhost:3000').split(',').map(s=>s.trim()).filter(Boolean); }
export function writeRequestAllowed({method,origin,referer,marker,fetchSite},origins) {
  if(['GET','HEAD','OPTIONS'].includes(method)) return true;
  if(marker!=='1' || fetchSite==='cross-site') return false;
  let source=origin;
  if(!source && referer) { try { source=new URL(referer).origin; } catch { return false; } }
  // CLI tools may omit Origin but must send the custom header. Browsers cannot set it cross-origin without a preflight.
  return !source || origins.includes(source);
}
