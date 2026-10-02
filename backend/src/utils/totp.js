/** RFC 4226 / RFC 6238 SHA-1 TOTP. Secrets are encrypted at rest, never logged. */
import crypto from 'node:crypto';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(buffer) { let bits=0,value=0,out=''; for(const byte of buffer){value=(value<<8)|byte;bits+=8;while(bits>=5){out+=alphabet[(value>>>(bits-5))&31];bits-=5;}} if(bits)out+=alphabet[(value<<(5-bits))&31];return out; }
export function unbase32(value) { let bits=0,n=0,out=[];for(const c of String(value).toUpperCase().replace(/=+$/,'')){const i=alphabet.indexOf(c);if(i<0)throw new Error('Invalid MFA secret');n=(n<<5)|i;bits+=5;if(bits>=8){out.push((n>>>(bits-8))&255);bits-=8;}}return Buffer.from(out); }
export function hotp(secret,counter,digits=6) {const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(counter));const h=crypto.createHmac('sha1',unbase32(secret)).update(b).digest();const offset=h[h.length-1]&15;return String((h.readUInt32BE(offset)&0x7fffffff)%10**digits).padStart(digits,'0');}
export function totpStep(secret,code,now=Date.now(),last=-1) {if(typeof code!=='string'||!/^\d{6}$/.test(code))return null;const step=Math.floor(now/30000);for(const s of [step,step-1,step+1]){if(s>last && s>=0 && crypto.timingSafeEqual(Buffer.from(hotp(secret,s)),Buffer.from(code)))return s;}return null;}
export const makeMfaSecret=()=>base32(crypto.randomBytes(20));
function key(){const k=process.env.MFA_ENCRYPTION_KEY||'';if(!/^[0-9a-fA-F]{64}$/.test(k))throw Object.assign(new Error('Set MFA_ENCRYPTION_KEY to a random 64-character hexadecimal key.'),{status:503});return Buffer.from(k,'hex');}
export function encryptSecret(value){const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key(),iv);const b=Buffer.concat([c.update(value,'utf8'),c.final()]);return [iv,c.getAuthTag(),b].map(x=>x.toString('hex')).join('.');}
export function decryptSecret(value){const parts=String(value).split('.').map(x=>Buffer.from(x,'hex'));if(parts.length!==3)throw new Error('Invalid encrypted secret');const d=crypto.createDecipheriv('aes-256-gcm',key(),parts[0]);d.setAuthTag(parts[1]);return Buffer.concat([d.update(parts[2]),d.final()]).toString('utf8');}
