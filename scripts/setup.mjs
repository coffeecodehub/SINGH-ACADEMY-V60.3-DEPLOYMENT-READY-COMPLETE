import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(Number(process.versions.node.split('.')[0])<22)throw new Error('Use Node.js 22 or newer.');
const result=spawnSync(process.execPath,['src/scripts/setupLocal.js'],{cwd:path.join(root,'backend'),stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
const target=path.join(root,'frontend/.env.local');if(!fs.existsSync(target))fs.copyFileSync(path.join(root,'frontend/.env.example'),target);
console.log('Frontend .env.local preserved/created. Edit backend/.env locally, then run npm run install:all.');
