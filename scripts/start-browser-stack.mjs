/** Starts only the isolated test API plus a previously built frontend. No deployment credentials. */
import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawn} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!process.env.TEST_MONGODB_URI)throw new Error('TEST_MONGODB_URI is required for browser tests; use the local test replica set.');
const children=[];let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');setTimeout(()=>process.exit(code),3000).unref();}
function child(command,args,cwd){const p=spawn(command,args,{cwd,env:{...process.env,PORT:'3000',HOSTNAME:'127.0.0.1'},stdio:'inherit'});children.push(p);p.on('error',()=>stop(1));p.on('exit',code=>{if(!stopping)stop(code||1);});return p;}
child(process.execPath,['integration/browserServer.js'],path.join(root,'backend'));
child(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3000'],path.join(root,'frontend'));
process.on('SIGTERM',()=>stop());process.on('SIGINT',()=>stop());
