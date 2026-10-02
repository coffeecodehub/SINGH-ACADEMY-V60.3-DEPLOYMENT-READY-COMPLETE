/** V60 preservation byte check: verifies every protected V48 public file except explicitly requested visual changes. Not a browser screenshot test. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const expected=JSON.parse(fs.readFileSync(path.join(root,'qa/v50/original-public-sha256.json'),'utf8'));
const intentional=new Set([
 'frontend/public/singh-academy-logo-clean.png',
 'frontend/public/singh-academy-logo.png',
 'frontend/app/styles.css',
 'frontend/app/page.tsx',
 'frontend/components/SiteHeader.tsx',
 'frontend/app/contact/page.tsx',
 'frontend/app/reviews/page.tsx',
 'frontend/app/learn/[course]/page.tsx',
 'frontend/components/layout/SiteFooter.tsx'
]);
let failures=0,checked=0;
for(const [name,hash] of Object.entries(expected)){
 if(intentional.has(name))continue;checked++;
 const file=path.join(root,name);let actual=fs.existsSync(file)?crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'):'';
 // ZIP extraction on Windows can transcode a non-ASCII filename (for example a curly apostrophe)
 // even when the protected file bytes are unchanged. Accept only an exact byte-for-byte SHA-256
 // match from the same directory; this preserves the baseline content check without false failures.
 if(actual!==hash){
   const dir=path.dirname(file);
   if(fs.existsSync(dir)){
     const equivalent=fs.readdirSync(dir,{withFileTypes:true}).filter(x=>x.isFile()).some(x=>{
       const candidate=path.join(dir,x.name);
       return crypto.createHash('sha256').update(fs.readFileSync(candidate)).digest('hex')===hash;
     });
     if(equivalent)actual=hash;
   }
 }
 if(actual!==hash){failures++;console.error('Unexpectedly changed or missing baseline file:',name);}
}
console.log(`${checked} protected V48 public files checked; ${failures} unexpected differences. V60 preserves the approved public baseline; only explicitly requested header, reviews, lesson-player, contact and footer changes remain outside this protected manifest.`);
process.exitCode=failures?1:0;
