import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {legacyEnrollmentUniqueIndex} from '../src/utils/enrollmentIndexes.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('V60 enrollment index repair drops only legacy globally-unique student/course indexes',()=>{
 assert.equal(legacyEnrollmentUniqueIndex({unique:true,key:{courseSlug:1}}),true);
 assert.equal(legacyEnrollmentUniqueIndex({unique:true,key:{user:1}}),true);
 assert.equal(legacyEnrollmentUniqueIndex({unique:true,key:{user:1,courseSlug:1}}),false);
 assert.equal(legacyEnrollmentUniqueIndex({unique:false,key:{courseSlug:1}}),false);
 const model=read('backend/src/models/Enrollment.js'),migration=read('backend/src/scripts/migrateV60.js');assert.match(model,/schema\.index\(\{user:1,courseSlug:1\},\{unique:true\}\)/);assert.match(migration,/dropIndex/);assert.match(migration,/user_1_courseSlug_1/);
});

test('V60 learner hides an empty video stage and uses shared multi-provider resolver',()=>{
 const page=read('frontend/app/learn/[course]/page.tsx'),video=read('frontend/lib/video.ts'),middleware=read('frontend/middleware.ts');
 assert.match(page,/lesson\.videoUrl&&<div className="lessonVideo">/);assert.doesNotMatch(page,/Video will appear here when the academy publishes the secure source/);
 for(const provider of ['youtube','vimeo','tiktok','instagram','ted','dailymotion','loom'])assert.match(video,new RegExp(provider));
 assert.match(video,/player\.vimeo\.com\/video/);assert.match(video,/u\.searchParams\.get\('h'\)\|\|pathHash/);assert.match(middleware,/www\.tiktok\.com/);assert.match(middleware,/www\.instagram\.com/);
});

test('V60 requested public contact information and coffeeCODEhub credit are present',()=>{
 const contact=read('frontend/app/contact/page.tsx'),footer=read('frontend/components/layout/SiteFooter.tsx');
 assert.match(contact,/singh@singhacademy\.com/);assert.match(contact,/\+1 \(559\) 308 1249/);assert.match(contact,/By appointment · USA/);
 assert.match(footer,/Developed by coffeeCODEhub/);assert.match(footer,/https:\/\/www\.coffecodehub\.com\//);
});
