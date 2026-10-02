import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const hash=rel=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');

test('student auth is instant with 8-character minimum and no email-verification gate',()=>{
 const auth=read('backend/src/controllers/authController.js'),routes=read('backend/src/routes/authRoutes.js'),register=read('frontend/app/register/page.tsx'),login=read('frontend/app/login/page.tsx');
 assert.match(auth,/passwordError\(password,8\)/);
 assert.match(auth,/emailVerified:true/);
 assert.match(auth,/autoLogin:true,verificationRequired:false/);
 assert.doesNotMatch(auth,/EMAIL_VERIFICATION_REQUIRED/);
 assert.doesNotMatch(routes,/resend-verification|\/verify'/);
 assert.match(register,/await refresh\(\);router\.replace\('\/home\?welcome=1'\)/);
 assert.doesNotMatch(login,/Resend verification|EMAIL_VERIFICATION_REQUIRED/);
});

test('My Courses keeps enrollment records and active membership also exposes the whole published library',()=>{
 const routes=read('backend/src/routes/courseRoutes.js'),detail=read('frontend/app/courses/[slug]/page.tsx'),model=read('backend/src/models/Enrollment.js');
 const mine=routes.slice(routes.indexOf("r.get('/enrolled/mine'"),routes.indexOf("r.get('/:slug'"));
 assert.match(mine,/Enrollment\.find/);
 assert.match(mine,/Subscription\.findOne/);
 assert.match(mine,/membership\?\{published:true\}/);
 assert.match(routes,/r\.post\('\/:slug\/enroll'/);
 assert.match(detail,/apiFetch\(`\/courses\/\$\{params\.slug\}\/enroll`,\{method:'POST'\}\)/);
 assert.match(model,/membership','free'/);
});

test('reviews publish immediately and public list is uncached',()=>{
 const controller=read('backend/src/controllers/reviewController.js'),page=read('frontend/app/reviews/page.tsx');
 assert.match(controller,/Cache-Control','no-store/);
 assert.match(controller,/Your review is now published/);
 assert.match(controller,/name:review\.name,rating:review\.rating,message:review\.message/);
 assert.match(page,/setReviews\(prev=>\[d\.review,\.\.\.prev\.filter/);
 assert.doesNotMatch(page,/awaiting approval/);
});

test('client admin reviews are read-only and super admin reviews are editable',()=>{
 const portal=read('frontend/components/business/BusinessPortal.tsx'),component=read('frontend/components/business/AdminReviews.tsx'),client=read('backend/src/routes/academyAdminRoutes.js'),admin=read('backend/src/routes/adminRoutes.js');
 assert.match(portal,/items:\['students','subscriptions','forms','reviews'\]/);
 assert.match(portal,/items:\['content_overview','courses','team','events','plans','reviews','social','website'\]/);
 assert.match(portal,/AdminReviews readOnly=\{!isSuper\}/);
 assert.match(component,/Reviews are read-only in Client Admin/);
 assert.match(component,/Super Admin can correct review text\/rating\/name/);
 assert.doesNotMatch(component,/Legacy pending|Approve review|Awaiting approval/i);
 assert.match(client,/r\.get\('\/reviews'/);
 assert.match(admin,/r\.patch\('\/reviews\/:id',requireRole\('super_admin'\)/);
 assert.match(admin,/r\.delete\('\/reviews\/:id',requireRole\('super_admin'\)/);
});

test('approved certificate master implementation remains byte-for-byte unchanged',()=>{
 const expected={
  'backend/src/services/certificatePdf.js':'7dfac1e4f2a9cee2916f05c29407941248b6ecfd96d641a8a14a7ebf43f8d4d3',
  'backend/src/routes/certificateRoutes.js':'2788bec427fdffa4610a1b232525e34dde8ef2e2417aca847590e50050b9736f',
  'backend/src/assets/certificate-logo-original.png':'fbfcc3260a9d4784703e4c7be03f2b440224383cdb5c888a572a93defbb886d0',
  'backend/src/assets/certificate-signature.png':'94f1226a2a520c79370e839e0c367c105265a52351fd8e7e869efa959fe39418',
  'frontend/app/certificates/page.tsx':'17880a8d51f82f81e5adeb79fab471f6b8365fc3e7ee784e5de49bd36720f6ad',
  'frontend/components/CertificateStatus.tsx':'2814ef64f585e894cf50151e6907eefb7b978ab3565f352ebb8ce31fea544809',
  'frontend/components/business/Certificates.tsx':'1e1f9fc95f5564545414cfeca25e7661b8fe19028cafb22e7d3327f8c584def2'
 };
 for(const [file,sum] of Object.entries(expected))assert.equal(hash(file),sum,file);
});
