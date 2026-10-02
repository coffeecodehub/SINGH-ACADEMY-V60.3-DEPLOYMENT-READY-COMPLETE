import {Router} from 'express';
import Course from '../models/Course.js';import Module from '../models/Module.js';import Lesson from '../models/Lesson.js';import Enrollment from '../models/Enrollment.js';import Subscription from '../models/Subscription.js';import Progress from '../models/Progress.js';import {requireAuth,requireRole} from '../middleware/auth.js';
import {realAccessFilter,activeEnrollmentWindow} from '../utils/commerce.js';
import {ensureEnrollmentIndexes} from '../utils/enrollmentIndexes.js';
import CourseCompletion from '../models/CourseCompletion.js';
import CourseAttempt from '../models/CourseAttempt.js';
import mongoose from 'mongoose';
import {completionProgress,publicCompletion} from '../utils/completion.js';
import {hasCourseAccess} from '../services/learningAccess.js';
import {currentAttempt,publicAttempt} from '../services/attempts.js';
import {getAnswerSheet,saveLearning} from '../services/learningSubmissions.js';
import {prepareStudentUpload} from '../services/studentFiles.js';
import {uploadAdmission,studentUploadSingle,storeUpload} from '../services/uploads.js';
import {rateLimit} from '../middleware/rateLimit.js';
const r=Router();
import {mediaUrl} from '../utils/media.js';
function normalizeCourse(req,c){if(!c)return c;const out={...c};out.thumbnail=mediaUrl(req,c.thumbnailFileId,c.thumbnail);if(Array.isArray(c.gallery))out.gallery=c.gallery.map(x=>({...x,url:mediaUrl(req,x.fileId,x.url)}));return out;}

function stripAnswers(l){const q=xs=>(xs||[]).map(({correctAnswer,...x})=>x);return {...l,questions:q(l.questions),contentBlocks:(l.contentBlocks||[]).map(b=>({...b,questions:q(b.questions)}))};}
function normalizeLesson(req,l){const out={...l};if(l.videoFileId)out.videoUrl=mediaUrl(req,l.videoFileId,l.videoUrl);if(l.videoThumbnailFileId)out.videoThumbnailUrl=mediaUrl(req,l.videoThumbnailFileId,l.videoThumbnailUrl);if(l.pdfFileId)out.pdfUrl=mediaUrl(req,l.pdfFileId,l.pdfUrl);if(Array.isArray(l.resources))out.resources=l.resources.map(x=>({...x,url:mediaUrl(req,x.fileId,x.url)}));if(Array.isArray(l.contentBlocks))out.contentBlocks=l.contentBlocks.map(b=>({...b,url:mediaUrl(req,b.fileId,b.url),items:(b.items||[]).map(x=>({...x,url:mediaUrl(req,x.fileId,x.url)}))}));return stripAnswers(out);}
r.get('/',async(req,res,next)=>{try{const courses=await Course.find({published:true}).sort({featured:-1,createdAt:-1}).lean();res.set('Cache-Control','public, max-age=30, stale-while-revalidate=120');res.json({success:true,courses:courses.map(c=>normalizeCourse(req,c))})}catch(e){next(e)}});
r.get('/enrolled/mine',requireAuth,requireRole('student'),async(req,res)=>{
 const now=new Date();
 const [es,membership]=await Promise.all([
  Enrollment.find({user:req.user.id,status:'active',...realAccessFilter(),...activeEnrollmentWindow(now)}).select('courseSlug source accessStartsAt accessExpiresAt invoice testMode').lean(),
  Subscription.findOne({user:req.user.id,status:'active',...realAccessFilter(),startsAt:{$lte:now},endsAt:{$gt:now}}).sort({endsAt:-1}).lean()
 ]);
 const slugs=[...new Set(es.map(e=>e.courseSlug).filter(Boolean))];
 // An active Academy membership always includes the entire currently published
 // library, including courses published after the membership was purchased.
 const courses=await Course.find(membership?{published:true}:{published:true,slug:{$in:slugs}}).sort({title:1}).lean();
 if(!courses.length)return res.json({success:true,courses:[]});
 const courseIds=courses.map(c=>c._id);
 const [modules,completions]=await Promise.all([Module.find({course:{$in:courseIds}}).select('_id course').lean(),CourseCompletion.find({user:req.user._id,course:{$in:courseIds}}).lean()]);
 const lessons=modules.length?await Lesson.find({published:{$ne:false},module:{$in:modules.map(m=>m._id)}}).select('_id module completionRequired').lean():[];
 const progress=lessons.length?await Progress.find({user:req.user.id,completed:true,lesson:{$in:lessons.map(l=>l._id)}}).select('lesson').lean():[];
 const completed=progress.map(p=>String(p.lesson)),parents=new Map(modules.map(m=>[String(m._id),String(m.course)])),lessonsByCourse=new Map();
 for(const lesson of lessons){const courseId=parents.get(String(lesson.module));if(!courseId)continue;if(!lessonsByCourse.has(courseId))lessonsByCourse.set(courseId,[]);lessonsByCourse.get(courseId).push(lesson);}
 const completionByCourse=new Map(completions.map(x=>[String(x.course),x])),enrollmentBySlug=new Map(es.map(x=>[x.courseSlug,x]));
 res.set('Cache-Control','private, no-store');
 res.json({success:true,courses:courses.map(c=>{const visible=lessonsByCourse.get(String(c._id))||[],n=completionProgress(visible,completed),enrollment=enrollmentBySlug.get(c.slug),membershipAccess=!enrollment&&membership;return {...normalizeCourse(req,c),progress:n.percent,completion:publicCompletion(completionByCourse.get(String(c._id))),enrollment:{source:enrollment?.source||(membershipAccess?'membership':'legacy'),accessStartsAt:enrollment?.accessStartsAt||membershipAccess?.startsAt||null,accessExpiresAt:enrollment?.accessExpiresAt||membershipAccess?.endsAt||null}};})});
});
r.get('/:slug',async(req,res,next)=>{try{const course=await Course.findOne({slug:req.params.slug,published:true}).lean();if(!course)return res.status(404).json({success:false,message:'Course not found'});const modules=await Module.find({course:course._id}).sort({order:1,_id:1}).lean();const lessons=await Lesson.find({published:{$ne:false},module:{$in:modules.map(m=>m._id)}}).sort({order:1,_id:1}).lean();res.set('Cache-Control','public, max-age=30, stale-while-revalidate=120');res.json({success:true,course:normalizeCourse(req,course),modules:modules.map(m=>({...m,lessons:lessons.filter(l=>String(l.module)===String(m._id)).map(l=>{const x=normalizeLesson(req,l);return l.preview?stripAnswers(x):{_id:l._id,title:l.title,order:l.order,type:l.type,description:l.description,durationMinutes:l.durationMinutes,preview:false,completionRequired:l.completionRequired}})}))})}catch(e){next(e)}});
r.post('/:slug/enroll',requireAuth,requireRole('student'),rateLimit('course-enroll',30,60000,{authenticated:true}),async(req,res)=>{
 const course=await Course.findOne({slug:req.params.slug,published:true}).select('_id slug accessType').lean();if(!course)return res.status(404).json({success:false,message:'Course not found'});
 const access=await hasCourseAccess(req.user._id,course.slug);if(!access)return res.status(403).json({success:false,message:'This course is not available on your account.'});
 if(access.type==='course')return res.json({success:true,enrollment:access.enrollment,created:false});
 const now=new Date(),membership=access.type==='membership'?access.membership:null;
 const filter={user:req.user._id,courseSlug:course.slug},update={$set:{status:'active',accessStartsAt:now,accessExpiresAt:membership?.endsAt||null,source:membership?'membership':'free',invoice:membership?.invoice||null,reason:membership?'Enrolled through active Academy membership.':'Enrolled in a free Singh Academy course.',testMode:Boolean(membership?.testMode)}};
 let enrollment,created=true;
 try{enrollment=await Enrollment.findOneAndUpdate(filter,update,{upsert:true,new:true,runValidators:true,setDefaultsOnInsert:true});}
 catch(error){
  if(error?.code!==11000)throw error;
  const existing=await Enrollment.findOne(filter);if(existing){enrollment=existing;created=false;}
  else{
   // A legacy courseSlug-only/user-only unique index can survive an old deployment.
   // Repair it in place and retry once so another student can enroll immediately.
   await ensureEnrollmentIndexes(Enrollment.collection);
   enrollment=await Enrollment.findOneAndUpdate(filter,update,{upsert:true,new:true,runValidators:true,setDefaultsOnInsert:true});
  }
 }
 res.json({success:true,enrollment,created});
});
r.get('/:slug/learn',requireAuth,requireRole('student'),async(req,res,next)=>{try{
 const course=await Course.findOne({slug:req.params.slug,published:true}).lean();if(!course)return res.status(404).json({success:false,message:'Course not found'});
 const [access,modules,p,attempt,completion]=await Promise.all([hasCourseAccess(req.user.id,req.params.slug),Module.find({course:course._id}).sort({order:1,_id:1}).lean(),Progress.find({user:req.user.id,course:course._id,completed:true}).select('lesson').lean(),currentAttempt(req.user._id,course._id),CourseCompletion.findOne({user:req.user._id,course:course._id}).lean()]);
 if(!access)return res.status(403).json({success:false,message:'This course is not available on your account. Purchase this course or activate an Academy membership.'});
 const rawLessons=modules.length?await Lesson.find({published:{$ne:false},module:{$in:modules.map(m=>m._id)}}).sort({order:1,_id:1}).lean():[];
 const lessonsByModule=new Map();for(const l of rawLessons){const key=String(l.module);if(!lessonsByModule.has(key))lessonsByModule.set(key,[]);lessonsByModule.get(key).push(l);}const visibleIds=new Set(rawLessons.map(l=>String(l._id)));
 res.set('Cache-Control','private, no-store');
 res.json({success:true,attempt:publicAttempt(attempt),completion:publicCompletion(completion),course:normalizeCourse(req,course),modules:modules.map(m=>({...m,lessons:(lessonsByModule.get(String(m._id))||[]).map(l=>normalizeLesson(req,l))})),completedLessonIds:p.filter(x=>visibleIds.has(String(x.lesson))).map(x=>String(x.lesson))});
 }catch(e){next(e)}});
r.post('/:slug/resume',requireAuth,requireRole('student'),rateLimit('course-resume',120,60000,{authenticated:true}),async(req,res)=>{
 const lessonId=String(req.body?.lessonId||'');if(!mongoose.isValidObjectId(lessonId))return res.status(400).json({success:false,message:'Choose a valid lesson.'});
 const course=await Course.findOne({slug:req.params.slug,published:true}).select('_id slug').lean();if(!course)return res.status(404).json({success:false,message:'Course not found'});
 if(!await hasCourseAccess(req.user.id,req.params.slug))return res.status(403).json({success:false,message:'This course is not available on your account.'});
 const modules=await Module.find({course:course._id}).select('_id').lean();const lesson=await Lesson.findOne({_id:lessonId,module:{$in:modules.map(m=>m._id)},published:{$ne:false}}).select('_id').lean();if(!lesson)return res.status(404).json({success:false,message:'Lesson not found in this course.'});
 const attempt=await CourseAttempt.findOne({user:req.user._id,course:course._id}).sort({number:-1});
 if(attempt&&attempt.status==='in_progress'){attempt.lastLesson=lesson._id;attempt.lastViewedAt=new Date();await attempt.save();}
 res.json({success:true});
});
r.get('/:slug/lessons/:lessonId/submission',requireAuth,requireRole('student'),async(req,res)=>res.json({success:true,...await getAnswerSheet(req)}));
r.put('/:slug/lessons/:lessonId/submission',requireAuth,requireRole('student'),rateLimit('lesson-save',100,60000,{authenticated:true}),async(req,res)=>res.json({success:true,...await saveLearning(req,false)}));
r.post('/:slug/lessons/:lessonId/complete',requireAuth,requireRole('student'),rateLimit('lesson-complete',60,60000,{authenticated:true}),async(req,res)=>res.json({success:true,...await saveLearning(req,true)}));
r.post('/:slug/lessons/:lessonId/attachments',requireAuth,requireRole('student'),rateLimit('student-upload',15,60000,{authenticated:true}),prepareStudentUpload,uploadAdmission,studentUploadSingle,storeUpload);
export default r;
