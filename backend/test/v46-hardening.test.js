/** Pure configuration/signature tests and real local TCP protocol tests; no live malware engine. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import {checkEnvironment,envInteger} from '../src/utils/deployment.js';
import {detectMime,validateSignature} from '../src/utils/fileSignature.js';
import {emailOk} from '../src/utils/security.js';
import {scanFile} from '../src/services/uploadScan.js';
const base=()=>({NODE_ENV:'development',AUTH_SECRET:crypto.randomBytes(48).toString('hex'),MFA_ENCRYPTION_KEY:crypto.randomBytes(32).toString('hex'),MONGODB_URI:'mongodb://127.0.0.1:27017/sa_test?replicaSet=rs0',FRONTEND_URL:'http://localhost:3000'});
const production=()=>({...base(),NODE_ENV:'production',FRONTEND_URL:'https://academy.test',FRONTEND_URLS:'https://academy.test',PUBLIC_API_URL:'/api',REQUIRE_ADMIN_MFA:'true',SMTP_HOST:'smtp.academy.test',EMAIL_FROM:'Academy <mail@academy.test>',UPLOAD_SCAN_REQUIRED:'true',CLAMAV_HOST:'scanner'});
test('V46 valid development configuration has no errors',()=>assert.deepEqual(checkEnvironment(base()).errors,[]));
test('V46 production config checks requirements without claiming reachability',()=>assert.deepEqual(checkEnvironment(production()).errors,[]));
for(const [name,change] of [
 ['missing auth secret',{AUTH_SECRET:''}],['placeholder auth',{AUTH_SECRET:'YOUR_AUTH_SECRET'}],['weak repetitive auth',{AUTH_SECRET:'x'.repeat(64)}],
 ['bad MFA key',{MFA_ENCRYPTION_KEY:'abcdef'}],['weak repeated MFA key',{MFA_ENCRYPTION_KEY:'f'.repeat(64)}],['missing DB',{MONGODB_URI:''}],
 ['placeholder DB',{MONGODB_URI:'mongodb+srv://YOUR_USER:YOUR_PASS@cluster.local/db'}],['wildcard origin',{FRONTEND_URLS:'*'}],['origin path',{FRONTEND_URLS:'https://academy.test/path'}],
 ['duplicate query origin',{FRONTEND_URLS:'https://academy.test?x=1'}],['invalid port',{PORT:'0'}],['unbounded pool',{MONGO_MAX_POOL:'9999'}],['invalid proxy',{TRUST_PROXY_HOPS:'true'}],['oversized upload limit',{MAX_UPLOAD_MB:'10000'}]
])test('V46 rejects '+name,()=>assert.ok(checkEnvironment({...base(),...change}).errors.length));
for(const [name,change] of [
 ['HTTP origin',{FRONTEND_URLS:'http://academy.test'}],['MFA disabled',{REQUIRE_ADMIN_MFA:'false'}],
 ['SMTP missing',{SMTP_HOST:''}],['sender placeholder',{EMAIL_FROM:'YOUR_EMAIL'}],['scanner disabled',{UPLOAD_SCAN_REQUIRED:'false'}],['scanner host missing',{CLAMAV_HOST:''}]
])test('V46 production rejects '+name,()=>assert.ok(checkEnvironment({...production(),...change}).errors.length));
test('bounded integer defaults and boundary',()=>{assert.equal(envInteger(undefined,2,1,8),2);assert.equal(envInteger('8',2,1,8),8);assert.throws(()=>envInteger('8.1',2,1,8));});
for(const [email,valid] of [['user@academy.test',true],['ali+course@academy.test',true],['a\r\nBcc:bad@evil.test',false],['"user(comment)"@academy.test',false],['x@y..test',false],['name@-bad.test',false],[{$ne:null},false]])test('mailbox scalar/ordinary address: '+JSON.stringify(email),()=>assert.equal(emailOk(email),valid));
const samples=[
 ['image/jpeg',Buffer.from('ffd8ffe000104a464946000101000000000000','hex')],
 ['image/png',Buffer.from('89504e470d0a1a0a0000000d49484452','hex')],
 ['image/gif',Buffer.from('GIF89a'+ '\0'.repeat(20))],
 ['image/webp',Buffer.from('RIFF0000WEBPVP8 '+ '\0'.repeat(12))],
 ['application/pdf',Buffer.from('%PDF-1.7\n1 0 obj\n')],
 ['video/mp4',Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom0000')])]
];
for(const [mime,head]of samples)test('signature gate accepts declared '+mime,()=>{assert.equal(detectMime(head),mime);assert.equal(validateSignature(head,Buffer.alloc(0),mime),mime);});
test('signature rejects declared image containing executable/text',()=>assert.throws(()=>validateSignature(Buffer.from('<html><script>alert(1)</script>'),Buffer.alloc(0),'image/png'),{status:400}));
test('signature rejects mismatched type',()=>assert.throws(()=>validateSignature(samples[0][1],Buffer.alloc(0),'application/pdf'),{status:400}));
test('AVIF brand is deliberately rejected',()=>assert.equal(detectMime(Buffer.concat([Buffer.alloc(4),Buffer.from('ftypavif0000')])) ,''));
test('DOCX requires both OOXML directory markers',()=>{const b=Buffer.concat([Buffer.from('504b0304','hex'),Buffer.from('[Content_Types].xml word/document.xml')]);assert.equal(validateSignature(b,Buffer.alloc(0),'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),'application/vnd.openxmlformats-officedocument.wordprocessingml.document');assert.throws(()=>validateSignature(b,Buffer.from('word/vbaProject.bin'),'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),{status:400});});
// Server below emulates only the scanner transport response. It never scans malware.
async function protocol(reply,work){
 const old={CLAMAV_HOST:process.env.CLAMAV_HOST,CLAMAV_PORT:process.env.CLAMAV_PORT,UPLOAD_SCAN_REQUIRED:process.env.UPLOAD_SCAN_REQUIRED};
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sa-scan-test-')),file=path.join(dir,'fixture.txt');await fs.writeFile(file,'Harmless protocol fixture');
 let payloadBytes=0,commandSeen=false;
 const server=net.createServer(socket=>{let b=Buffer.alloc(0),header=false;socket.on('error',()=>{});socket.on('data',chunk=>{b=Buffer.concat([b,chunk]);if(!header){const i=b.indexOf(0);if(i<0)return;commandSeen=b.subarray(0,i).toString()==='zINSTREAM';b=b.subarray(i+1);header=true;}while(b.length>=4){const n=b.readUInt32BE(0);if(b.length<4+n)return;b=b.subarray(4);if(n===0){if(reply!==null)socket.end(reply);return;}payloadBytes+=n;b=b.subarray(n);}});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 process.env.CLAMAV_HOST='127.0.0.1';process.env.CLAMAV_PORT=String(server.address().port);process.env.UPLOAD_SCAN_REQUIRED='true';
 try{await work(file,()=>({payloadBytes,commandSeen}));}finally{server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));await fs.rm(dir,{recursive:true,force:true});for(const[k,v]of Object.entries(old))if(v===undefined)delete process.env[k];else process.env[k]=v;}
}
test('scanner protocol: clean reply and framed input bytes',async()=>protocol('stream: OK\0',async(file,info)=>{const result=await scanFile(file);assert.equal(result.status,'clean');assert.equal(info().commandSeen,true);assert.equal(info().payloadBytes,25);}));
test('scanner protocol: FOUND fails closed',async()=>protocol('stream: Fixture-Signature FOUND\0',async file=>assert.rejects(()=>scanFile(file),{status:400})));
test('scanner protocol: engine size error fails closed',async()=>protocol('INSTREAM size limit exceeded. ERROR\0',async file=>assert.rejects(()=>scanFile(file),{status:503})));
test('scanner protocol: disconnected client cancels scan',async()=>protocol(null,async file=>{const c=new AbortController(),promise=scanFile(file,{signal:c.signal});setTimeout(()=>c.abort(),25);await assert.rejects(promise,{name:'AbortError',status:499});}));
test('scanner required but not configured is refused',async()=>{const h=process.env.CLAMAV_HOST,r=process.env.UPLOAD_SCAN_REQUIRED;delete process.env.CLAMAV_HOST;process.env.UPLOAD_SCAN_REQUIRED='true';try{await assert.rejects(()=>scanFile('unused'),{status:503});}finally{if(h===undefined)delete process.env.CLAMAV_HOST;else process.env.CLAMAV_HOST=h;if(r===undefined)delete process.env.UPLOAD_SCAN_REQUIRED;else process.env.UPLOAD_SCAN_REQUIRED=r;}});
