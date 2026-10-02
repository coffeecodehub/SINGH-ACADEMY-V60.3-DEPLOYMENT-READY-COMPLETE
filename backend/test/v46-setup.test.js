/** Executes the shipped setup script in a temporary copy, never the real environment. */
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';import {checkEnvironment} from '../src/utils/deployment.js';
test('V46 setup: generates missing values, is idempotent and preserves existing database/credentials',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'sa-env-test-'));try{
  await fs.mkdir(path.join(root,'src/scripts'),{recursive:true});await fs.copyFile(new URL('../src/scripts/setupLocal.js',import.meta.url),path.join(root,'src/scripts/setupLocal.js'));await fs.writeFile(path.join(root,'package.json'),'{"type":"module"}');
  await fs.writeFile(path.join(root,'.env.example'),'MONGODB_URI=mongodb://127.0.0.1:27017/sa_test?replicaSet=rs0\nAUTH_SECRET=GENERATED_BY_SETUP\nMFA_ENCRYPTION_KEY=CHANGE_ME\nCLIENT_ADMIN_PASSWORD=YOUR_PASSWORD\nSUPER_ADMIN_PASSWORD=YOUR_PASSWORD\n');
  const run=()=>{const p=spawnSync(process.execPath,['src/scripts/setupLocal.js'],{cwd:root,encoding:'utf8'});assert.equal(p.status,0,p.stderr);return p.stdout;};
  const output=run(),text=await fs.readFile(path.join(root,'.env'),'utf8'),env=Object.fromEntries(text.trim().split('\n').filter(l=>l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
  assert.deepEqual(checkEnvironment(env).errors,[]);assert.ok(env.CLIENT_ADMIN_PASSWORD.length>=12);assert.notEqual(env.CLIENT_ADMIN_PASSWORD,env.SUPER_ADMIN_PASSWORD);assert.ok(!output.includes(env.AUTH_SECRET));assert.ok(!output.includes(env.SUPER_ADMIN_PASSWORD));
  run();assert.equal(await fs.readFile(path.join(root,'.env'),'utf8'),text);
  const modified=text+'CUSTOM_SETTING=keep-me\n';await fs.writeFile(path.join(root,'.env'),modified);run();assert.equal(await fs.readFile(path.join(root,'.env'),'utf8'),modified);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('V46 production helper preserves stable encryption/auth secrets and refuses overwriting production config',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'sa-prod-env-test-'));try{
  await fs.mkdir(path.join(root,'scripts'),{recursive:true});await fs.mkdir(path.join(root,'backend'));await fs.copyFile(new URL('../../scripts/prepare-production.mjs',import.meta.url),path.join(root,'scripts/prepare-production.mjs'));
  const value='AUTH_SECRET=unchanged-owned-secret\nMFA_ENCRYPTION_KEY=unchanged-owned-mfa-key\nMONGODB_URI=mongodb://private-db/academy\n';await fs.writeFile(path.join(root,'backend/.env'),value);
  const run=()=>spawnSync(process.execPath,['scripts/prepare-production.mjs','--domain=academy.test'],{cwd:root,encoding:'utf8'});
  assert.equal(run().status,0);const text=await fs.readFile(path.join(root,'backend/.env.production'),'utf8');assert.match(text,/MFA_ENCRYPTION_KEY=unchanged-owned-mfa-key/);assert.match(text,/UPLOAD_SCAN_REQUIRED=true/);assert.match(text,/REQUIRE_ADMIN_MFA=true/);assert.match(text,/PUBLIC_API_URL=\/api/);assert.equal(await fs.readFile(path.join(root,'backend/.env'),'utf8'),value);
  assert.notEqual(run().status,0);assert.equal(await fs.readFile(path.join(root,'backend/.env.production'),'utf8'),text);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
