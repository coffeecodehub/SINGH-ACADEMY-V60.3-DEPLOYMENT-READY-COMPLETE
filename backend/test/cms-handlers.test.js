/** Handler unit tests with in-memory dependency stubs; NOT MongoDB/HTTP integration tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {realAccessFilter,activeEnrollmentWindow} from '../src/utils/commerce.js';
import {normalizeRole} from '../src/utils/security.js';
import {httpError,payloadFor,siteValue} from '../src/utils/cmsValidation.js';
function load(relative, dependencies, returns){
  const url=new URL(relative,import.meta.url);
  const code=fs.readFileSync(url,'utf8').replace(/import\s+[\s\S]*?\sfrom\s+['"][^'"]+['"];?/g,'').replaceAll('import.meta.url',JSON.stringify(url.href)).replace(/export default r;?/g,'').replace(/export\s*\{[^}]*\};?/g,'').replace(/export (async )?function/g,'$1function');
  return Function(...Object.keys(dependencies),code+';return '+returns)(...Object.values(dependencies));
}
const auth=load('../src/middleware/auth.js',{normalizeRole,User:{}},'({normalizeRole,requireRole})');
function response(){return {code:200,status(code){this.code=code;return this},json(body){this.body=body;return this}}}
for(const role of ['client_admin','admin','administrator','client-admin','super_admin','superadmin'])test('admin role accepted: '+role,()=>{const res=response();let next=false;auth.requireRole('client_admin','super_admin')({user:{role}},res,()=>next=true);assert.equal(next,true)});
test('student role denied CMS access',()=>{const res=response();auth.requireRole('client_admin','super_admin')({user:{role:'student'}},res,()=>assert.fail());assert.equal(res.code,403)});
const id='123456789012345678901234';
function makeAdmin(overrides={}){
  const routes=new Map();const router={use(...args){routes.set('middleware',args)}};
  for(const method of ['get','post','patch','delete','put'])router[method]=(url,...fns)=>routes.set(method+' '+url,fns);
  const multer=Object.assign(()=>({single:()=>()=>{}}),{diskStorage:()=>({})});
  const dependencies={uploadSingle:()=>{},uploadAdmission:()=>{},storeUpload:()=>{},rateLimit:()=>()=>{},cmsAudit:()=>{},Router:()=>router,multer,path,fs:{mkdirSync(){}},fileURLToPath,requireAuth:()=>{},...auth,mongoose:{isValidObjectId:x=>/^[a-f0-9]{24}$/.test(String(x))},httpError,payloadFor,siteValue,deleteUnusedMedia:async()=>{},lessonMediaIds:()=>[],activeEnrollmentWindow,process:{env:{}}};
  for(const name of ['CourseAttempt','CourseCompletion','Invoice','Progress','User','Course','Enrollment','Subscription','Payment','Review','TeamMember','SiteContent','Event','Notification','Module','Lesson'])dependencies[name]={};
  dependencies.CourseAttempt={exists:async()=>false};dependencies.CourseCompletion={exists:async()=>false};
  Object.assign(dependencies,overrides);load('../src/routes/adminRoutes.js',dependencies,'r');
  return async(method,route,req)=>{const handlers=routes.get(method+' '+route);assert.ok(handlers,route);const res=response();await handlers.at(-1)(req,res,error=>{throw error});return res};
}
test('client admin creates an event with generated slug',async()=>{let body;const run=makeAdmin({Event:{create:async value=>(body=value,{_id:id,...value})}});const res=await run('post','/content/:kind',{params:{kind:'events'},user:{normalizedRole:'client_admin'},body:{title:'Training Day',status:'draft'}});assert.equal(res.code,201);assert.equal(body.slug,'training-day')});
test('client admin can create team members',async()=>{const run=makeAdmin({TeamMember:{create:async value=>value}});const res=await run('post','/content/:kind',{params:{kind:'team'},user:{normalizedRole:'client_admin'},body:{name:'New member',active:true}});assert.equal(res.body.item.slug,'new-member')});
test('reviews cannot be fabricated through admin Add',async()=>{const run=makeAdmin();await assert.rejects(()=>run('post','/content/:kind',{params:{kind:'reviews'},body:{name:'Fake'}}),{status:405})});
test('client admin cannot modify footer settings',async()=>{const run=makeAdmin();await assert.rejects(()=>run('put','/site/:key',{params:{key:'footerSocial'},user:{normalizedRole:'client_admin'},body:{value:{facebook:'https://facebook.com/example'}}}),{status:403})});
test('V50 client admin can edit Academy Plans definitions',async()=>{let filter;const run=makeAdmin({SiteContent:{findOneAndUpdate:async(f,body)=>(filter=f,{value:body.$set.value})}});const res=await run('put','/site/:key',{params:{key:'membershipPlans'},user:{normalizedRole:'client_admin'},body:{value:[{name:'Annual',price:149,durationMonths:12,active:true}]}});assert.equal(filter.key,'membershipPlans');assert.equal(res.body.item.value[0].name,'Annual');assert.equal(res.body.item.value[0].durationMonths,12);});
test('super admin can save footer settings',async()=>{const run=makeAdmin({SiteContent:{findOneAndUpdate:async(_,body)=>({value:body.$set.value})}});const res=await run('put','/site/:key',{params:{key:'footerSocial'},user:{normalizedRole:'super_admin'},body:{value:{facebook:'https://facebook.com/example'}}});assert.equal(res.body.item.value.facebook,'https://facebook.com/example')});
test('new lessons default to draft',async()=>{const run=makeAdmin({Module:{findById:async()=>({_id:id})},Lesson:{findOne:()=>({sort:()=>({lean:async()=>null})}),create:async value=>value}});const res=await run('post','/modules/:moduleId/lessons',{params:{moduleId:id},body:{title:'Lesson'}});assert.equal(res.body.item.published,false);assert.equal(res.body.item.module,id)});
test('course with enrollment history is safely archived instead of returning 409',async()=>{let update;const run=makeAdmin({Course:{findById:async()=>({_id:id,slug:'course'}),updateOne:async(f,u)=>(update={f,u})},Enrollment:{exists:async()=>true}});const res=await run('delete','/content/:kind/:id',{params:{kind:'courses',id},user:{_id:'admin'}});assert.equal(res.body.success,true);assert.equal(res.body.archived,true);assert.equal(update.u.$set.published,false);assert.equal(update.u.$set.featured,false);assert.ok(update.u.$set.archivedAt instanceof Date)});
test('invalid record identifier rejected before database use',async()=>{const run=makeAdmin();await assert.rejects(()=>run('patch','/content/:kind/:id',{params:{kind:'team',id:'wrong'},body:{name:'Member'}}),{status:400})});
test('cross-parent curriculum reorder rejected',async()=>{const run=makeAdmin({Course:{findById:async()=>({_id:id})},Module:{find:()=>({select:()=>({lean:async()=>[{_id:id}]})})}});await assert.rejects(()=>run('put','/course-builder/:id/module-order',{params:{id},body:{ids:['aaaaaaaaaaaaaaaaaaaaaaaa']}}),{status:409})});
test('valid curriculum reorder keeps parent filter',async()=>{let writes;const run=makeAdmin({Course:{findById:async()=>({_id:id})},Module:{find:()=>({select:()=>({lean:async()=>[{_id:id}]})}),bulkWrite:async value=>writes=value}});await run('put','/course-builder/:id/module-order',{params:{id},body:{ids:[id]}});assert.equal(writes[0].updateOne.filter.course,id);assert.equal(writes[0].updateOne.update.$set.order,1)});
for(const [env,enabled,status] of [['production','true',404],['development','false',404],['development','true',200]])test(`testing route guard: ${env}, flag=${enabled}`,()=>{let guard;const router={use(fn){guard=fn},post(){}};load('../src/routes/testingRoutes.js',{Router:()=>router,Enrollment:{},Course:{},requireAuth:()=>{},requireRole:auth.requireRole,process:{env:{NODE_ENV:env,ENABLE_TEST_ENROLLMENT:enabled}}},'r');const res=response();guard({},res,()=>{res.code=200});assert.equal(res.code,status)});
function mediaAccess(overrides={}){
  const empty=()=>({select:()=>({lean:async()=>[]})});
  const dependencies={realAccessFilter,activeEnrollmentWindow,Router:()=>({get(){}}),mongoose:{},jwt:{},User:{},Course:{exists:async()=>false,find:empty},SiteContent:{exists:async()=>false},TeamMember:{exists:async()=>false},Event:{exists:async()=>false},Lesson:{find:empty},Module:{find:empty},Enrollment:{exists:async()=>false},Subscription:{exists:async()=>false},normalizeRole:auth.normalizeRole,lessonMediaQuery:()=>({}),httpError,parseByteRange:()=>null};
  return load('../src/routes/mediaRoutes.js',{...dependencies,...overrides},'visibleTo');
}
const lean=value=>({select:()=>({lean:async()=>value})});
const paidFixtures={Lesson:{find:()=>lean([{module:'m',preview:false}])},Module:{find:()=>lean([{_id:'m',course:'c'}])},Course:{exists:async()=>false,find:()=>lean([{_id:'c',slug:'paid',accessType:'one_time'}])}};
test('admin can preview uploaded media before publishing',async()=>assert.equal(await mediaAccess()({},id,{role:'client_admin'}),true));
test('published course cover is public',async()=>assert.equal(await mediaAccess({Course:{exists:async()=>true}})({},id,null),true));
test('unreferenced media is not public',async()=>assert.equal(await mediaAccess()({},id,null),false));
test('paid lesson media denied to guests',async()=>assert.equal(await mediaAccess(paidFixtures)({},id,null),false));
test('paid lesson media denied without an entitlement',async()=>assert.equal(await mediaAccess(paidFixtures)({},id,{_id:'student',role:'student'}),false));
test('enrolled student can access paid lesson media',async()=>assert.equal(await mediaAccess({...paidFixtures,Enrollment:{exists:async()=>true}})({},id,{_id:'student',role:'student'}),true));
test('active academy member can access paid lesson media',async()=>assert.equal(await mediaAccess({...paidFixtures,Subscription:{exists:async()=>true}})({},id,{_id:'student',role:'student'}),true));
test('published preview lesson media is public',async()=>assert.equal(await mediaAccess({...paidFixtures,Lesson:{find:()=>lean([{module:'m',preview:true}])}})({},id,null),true));
test('media under an unpublished course remains hidden',async()=>assert.equal(await mediaAccess({...paidFixtures,Course:{exists:async()=>false,find:()=>lean([])}})({},id,{_id:'student',role:'student'}),false));
