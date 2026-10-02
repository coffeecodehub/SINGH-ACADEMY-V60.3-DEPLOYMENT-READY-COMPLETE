import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('V59 auth tests no longer reference the removed verification handler',()=>{
 const source=read('backend/test/auth-handlers.test.js');
 assert.doesNotMatch(source,/\{loginFor,register,verify,/);
 assert.doesNotMatch(source,/verification consumes a hashed token atomically/);
 assert.doesNotMatch(read('backend/src/routes/authRoutes.js'),/resend-verification|\/verify(?:'|\")/);
});

test('V59 paid-media test loader supplies active entitlement window helper',()=>{
 const source=read('backend/test/cms-handlers.test.js');
 assert.match(source,/realAccessFilter,activeEnrollmentWindow/);
 assert.match(source,/activeEnrollmentWindow/);
});

test('V59 membership checkout test loader supplies enrollment synchronization',()=>{
 const source=read('backend/test/v47-workflows.test.js');
 assert.match(source,/syncMembershipCourseEnrollments=async/);
});

test('V59 certificate decisions have no separate review acknowledgement checkbox gate',()=>{
 const source=read('backend/src/services/completions.js');
 assert.doesNotMatch(source,/reviewAcknowledged/);
});

test('V59 admin cannot fabricate a learner review through generic CMS add',()=>{
 const source=read('backend/src/routes/adminRoutes.js');
 assert.match(source,/kind==='reviews'.*405/);
});
