/** Explicit owner-operated production config; preserves existing auth and MFA secrets. */
import fs from 'node:fs';import {parseEnv} from 'node:util';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),arg=process.argv.find(s=>s.startsWith('--domain=')),domain=arg?.slice(9);
if(!domain||!/^([a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,}$/i.test(domain)||/example\.(com|org|net)$/.test(domain))throw new Error('Supply your real hostname: npm run setup:production -- --domain=your-owned-hostname');
const dev=path.join(root,'backend/.env'),prod=path.join(root,'backend/.env.production');
if(!fs.existsSync(dev))throw new Error('Run npm run setup first and configure backend/.env.');
if(fs.existsSync(prod))throw new Error('backend/.env.production already exists. Edit it manually; production secrets were not overwritten.');
const original=parseEnv(fs.readFileSync(dev,'utf8'));
for(const value of Object.values(original))if(/[\r\n\0]/.test(value))throw new Error('Production raw env files require single-line values. Configure multiline secrets using a dedicated secrets manager.');
const values={NODE_ENV:'production',PORT:'5000',FRONTEND_URL:`https://${domain}`,FRONTEND_URLS:`https://${domain}`,PUBLIC_API_URL:'/api',TRUST_PROXY_HOPS:'1',REQUIRE_ADMIN_MFA:'true',UPLOAD_SCAN_REQUIRED:'true',CLAMAV_HOST:'scanner',CLAMAV_PORT:'3310',MAX_UPLOAD_MB:'250',MAX_CONCURRENT_UPLOADS:'2',MONGO_MAX_POOL:'20',PAYMENTS_REQUIRE_BOTH:'true',PAYMENT_WEBHOOK_BASE_URL:`https://${domain}`};
const text='# Docker Compose env_file format: raw; values are deliberately unquoted. Do not source this file.\n'+Object.entries({...original,...values}).map(([key,value])=>`${key}=${value}`).join('\n')+'\n';
fs.writeFileSync(prod,text,{mode:0o600});
const compose=path.join(root,'.env.deploy');if(!fs.existsSync(compose))fs.writeFileSync(compose,`DOMAIN=${domain}\n`,{mode:0o600});
console.log('Created backend/.env.production and .env.deploy. Stable secret values were copied, not regenerated.');
console.log('Review production MongoDB URI and real SMTP credentials locally. Keep backups and files private. Run production preflight before deployment.');
