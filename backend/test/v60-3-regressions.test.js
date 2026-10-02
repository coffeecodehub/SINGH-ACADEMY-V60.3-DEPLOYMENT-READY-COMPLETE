import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {legacyEnrollmentUniqueIndex,validEnrollmentCompoundIndex,ensureEnrollmentIndexes} from '../src/utils/enrollmentIndexes.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('V60.3 enrollment index validation accepts only the intended unique compound rule',()=>{
 assert.equal(validEnrollmentCompoundIndex({unique:true,key:{user:1,courseSlug:1}}),true);
 assert.equal(validEnrollmentCompoundIndex({unique:false,key:{user:1,courseSlug:1}}),false);
 assert.equal(validEnrollmentCompoundIndex({unique:true,key:{courseSlug:1,user:1,extra:1}}),false);
 assert.equal(validEnrollmentCompoundIndex({unique:true,key:{user:1,courseSlug:1},partialFilterExpression:{status:'active'}}),false);
 assert.equal(validEnrollmentCompoundIndex({unique:true,key:{user:1,courseSlug:1},sparse:true}),false);
 assert.equal(legacyEnrollmentUniqueIndex({unique:true,key:{courseSlug:1}}),true);
 assert.equal(legacyEnrollmentUniqueIndex({unique:true,key:{courseSlug:-1}}),true);
 assert.equal(legacyEnrollmentUniqueIndex({unique:true,key:{courseSlug:1,status:1}}),true);
});

test('V60.3 index repair replaces a malformed canonical index and removes legacy unique indexes',async()=>{
 let indexes=[{name:'_id_',key:{_id:1}},{name:'courseSlug_1',key:{courseSlug:1},unique:true},{name:'courseSlug_-1',key:{courseSlug:-1},unique:true},{name:'legacy_enrollment_pair',key:{user:1,courseSlug:1},unique:true,partialFilterExpression:{status:'active'}}];
 const dropped=[],created=[];const collection={async indexes(){return indexes.map(x=>({...x,key:{...x.key}}));},async dropIndex(name){dropped.push(name);indexes=indexes.filter(x=>x.name!==name);},async createIndex(key,options){created.push({key,options});indexes.push({name:options.name,key,unique:options.unique});}};
 const result=await ensureEnrollmentIndexes(collection);
 assert.deepEqual(new Set(result),new Set(['courseSlug_1','courseSlug_-1','legacy_enrollment_pair']));
 assert.equal(created.length,1);assert.deepEqual(created[0],{key:{user:1,courseSlug:1},options:{unique:true,name:'user_1_courseSlug_1'}});
 assert.equal(indexes.some(validEnrollmentCompoundIndex),true);
});

test('V60.3 membership renewal treats an exact expiry/start boundary as continuous access',()=>{
 const source=read('backend/src/services/membershipEnrollments.js');
 assert.match(source,/!end\|\|end>=at/);
 assert.doesNotMatch(source,/!end\|\|end>at\)/);
});

test('V60.3 footer legal links resolve to real routes and workspace version is current',()=>{
 assert.equal(fs.existsSync(path.join(root,'frontend/app/terms/page.tsx')),true);
 assert.equal(fs.existsSync(path.join(root,'frontend/app/privacy/page.tsx')),true);
 assert.match(read('frontend/components/layout/SiteFooter.tsx'),/href="\/terms"/);
 assert.match(read('frontend/components/layout/SiteFooter.tsx'),/href="\/privacy"/);
 assert.match(read('frontend/components/business/BusinessPortal.tsx'),/V60\.3/);
});


test('V60.3 enrollment route self-heals a stale duplicate-key index before retrying',()=>{
 const source=read('backend/src/routes/courseRoutes.js');
 assert.match(source,/ensureEnrollmentIndexes\(Enrollment\.collection\)/);
 assert.match(source,/findOneAndUpdate\(filter,update/);
});

test('V60.3 active membership My Courses includes the whole published library',()=>{
 const source=read('backend/src/routes/courseRoutes.js');
 assert.match(source,/Course\.find\(membership\?\{published:true\}/);
 assert.match(source,/including courses published after the membership was purchased/);
});

test('V60.3 history-bearing course delete is safe archive, not a conflict',()=>{
 const source=read('backend/src/routes/adminRoutes.js');
 assert.match(source,/archivedAt:new Date\(\)/);
 assert.match(source,/archived:true/);
 assert.doesNotMatch(source,/Unpublish it instead of deleting it/);
});

test('V60.3 footer contact details are grouped and location is clickable',()=>{
 const source=read('frontend/components/layout/SiteFooter.tsx');
 assert.match(source,/footerContactHeading/);
 assert.match(source,/mailto:/);
 assert.match(source,/tel:/);
 assert.match(source,/google\.com\/maps\/search/);
});
