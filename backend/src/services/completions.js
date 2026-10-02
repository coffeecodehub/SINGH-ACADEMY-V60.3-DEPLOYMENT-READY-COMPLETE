import crypto from 'node:crypto';
import CourseAttempt from '../models/CourseAttempt.js';import LessonSubmission from '../models/LessonSubmission.js';
import {ensureAttempt} from './attempts.js';import {orderedCurriculum} from './learningAccess.js';
import {answerCoverage,assessmentDefinition,positiveAttempt} from '../utils/assessments.js';
import Course from '../models/Course.js';import Module from '../models/Module.js';import Lesson from '../models/Lesson.js';import Progress from '../models/Progress.js';import User from '../models/User.js';
import CourseCompletion from '../models/CourseCompletion.js';import Notification from '../models/Notification.js';
import {transaction} from './businessWrite.js';import {audit} from './audit.js';import {confirmIdentity} from './identity.js';import {objectId} from './businessRead.js';
import {completionProgress,publicCompletion} from '../utils/completion.js';import {businessError,text} from '../utils/business.js';import {frontendOrigin} from '../utils/commerce.js';import {certificateText,createCertificatePdf} from './certificatePdf.js';
export async function checkCompletion(userId,course,session){
 const modules=await Module.find({course:course._id}).select('_id').session(session).lean();
 const lessons=await Lesson.find({module:{$in:modules.map(m=>m._id)},published:{$ne:false}}).select('_id published completionRequired').session(session).lean();
 const progress=await Progress.find({user:userId,course:course._id,completed:true}).select('lesson completedAt').session(session).lean();
 return {progress:completionProgress(lessons,progress.map(p=>p.lesson)),records:progress};
}
export async function recordCourseCompletion(user,course,session,providedAttempt=null){
 const attempt=providedAttempt||await ensureAttempt(user._id,course._id,session);
 const existing=await CourseCompletion.findOne({user:user._id,course:course._id}).session(session);
 if(existing&&['issued','revoked'].includes(existing.status))return publicCompletion(existing);
 if(existing?.status==='pending'&&(existing.attemptNumber||1)===attempt.number)return publicCompletion(existing);
 const checked=await checkCompletion(user._id,course,session);if(!checked.progress.complete)return null;
 const ids=new Set(checked.progress.requiredLessonIds),dates=checked.records.filter(p=>ids.has(String(p.lesson))).map(p=>new Date(p.completedAt).getTime()).filter(Number.isFinite);
 const completedAt=dates.length?new Date(Math.max(...dates)):new Date();
 const values={user:user._id,course:course._id,courseSlug:course.slug,courseTitle:course.title,studentName:user.name||'Student',completedAt,requiredLessonIds:checked.progress.requiredLessonIds,status:'pending',attemptNumber:attempt.number};
 let item=existing;
 if(item){Object.assign(item,values);await item.save({session});}else item=(await CourseCompletion.create([values],{session}))[0];
 attempt.status='submitted';attempt.completedAt=completedAt;attempt.requiredLessonIds=checked.progress.requiredLessonIds;
 attempt.progressSnapshot=checked.records.map(p=>({lesson:p.lesson,completedAt:p.completedAt}));await attempt.save({session});
 await Notification.create([{dedupeKey:`completion-${item._id}-attempt-${attempt.number}`,type:'course_completed',title:'Course completed - review answers',message:`${user.name||'Student'} completed ${course.title} (attempt ${attempt.number}). Review quiz and assignment answers, then issue a certificate or request Try Again.`,user:user._id,entityId:String(item._id),link:'/admin?section=certificates'}],{session});
 await audit(null,{scope:'academy',action:'course.completed',targetUser:user._id,entityType:'completion',entityId:String(item._id),changes:{courseSlug:course.slug,attempt:attempt.number,requiredLessons:ids.size}},session);
 return publicCompletion(item);
}
// A read-only response review; ownership is taken from the completion, never the browser.
export async function assessmentReview(item,session=null,number=item.attemptNumber||1){
 positiveAttempt(number);
 const {lessons}=await orderedCurriculum(item.course,session);
 const submissions=await LessonSubmission.find({user:item.user?._id||item.user,course:item.course,attemptNumber:number}).sort({createdAt:1,_id:1}).limit(2001).session(session).lean();
 if(submissions.length>2000)throw businessError('This attempt is too large for a single review. Contact the platform owner for a full evidence export.',409);
 const required=completionProgress(lessons,[]).requiredLessonIds,coverage=answerCoverage(lessons,submissions,required);
 return {submissions,coverage,lessonCount:lessons.length,assessmentCount:lessons.filter(l=>assessmentDefinition(l).fields.length>0).length};
}
export async function retryCourse(req){
 await confirmIdentity(req);const id=objectId(req.params.id),feedback=text(req.body?.reason,'Feedback for student',2000,5),expected=positiveAttempt(req.body?.attemptNumber);
 return transaction(async session=>{
  const item=await CourseCompletion.findById(id).session(session);if(!item)throw businessError('Course completion not found.',404);
  const user=await User.findOneAndUpdate({_id:item.user,role:'student',status:{$ne:'blocked'}},{$inc:{commerceVersion:1}},{session,new:true});
  if(!user)throw businessError('Review the active student account before restarting.',409);
  if(item.status==='retry_requested'&&item.lastReviewedAttempt===expected)return publicCompletion(item);
  if(item.status!=='pending'||(item.attemptNumber||1)!==expected)throw businessError('This review has changed or was already decided. Refresh the certificate queue.',409);
  const attempt=await ensureAttempt(user._id,item.course,session);
  if(attempt.number!==expected||attempt.status!=='submitted')throw businessError('The current course attempt is not awaiting review.',409);
  const progress=await Progress.find({user:user._id,course:item.course,completed:true}).session(session).lean();
  attempt.status='retry_requested';attempt.feedback=feedback;attempt.reviewedAt=new Date();attempt.reviewedBy=req.user._id;
  attempt.progressSnapshot=progress.map(p=>({lesson:p.lesson,completedAt:p.completedAt}));await attempt.save({session});
  await Progress.deleteMany({user:user._id,course:item.course},{session});
  await CourseAttempt.create([{user:user._id,course:item.course,number:expected+1,status:'in_progress',feedback}],{session});
  item.status='retry_requested';item.attemptNumber=expected+1;item.lastReviewedAttempt=expected;item.retryFeedback=feedback;item.reviewedAt=new Date();await item.save({session});
  await Notification.create([{dedupeKey:`retry-${item._id}-${expected}`,type:'course_retry',title:'Course retry requested',message:`${user.name||'Student'}: ${item.courseTitle}, attempt ${expected} returned for another attempt.`,user:user._id,entityId:String(item._id),link:'/admin?section=certificates'}],{session});
  await audit(req,{scope:'academy',action:'course.retry_requested',targetUser:user._id,entityType:'completion',entityId:String(item._id),reason:feedback,changes:{reviewedAttempt:expected,newAttempt:expected+1,progressReset:true}},session);
  return publicCompletion(item);
 });
}
export async function issueCertificate(req){
 await confirmIdentity(req);const id=objectId(req.params.id),reason=text(req.body?.reason,'Reason',2000,5);
 const approvedName=req.body?.studentName==null?'':text(req.body.studentName,'Certificate display name',180),approvedTitle=req.body?.courseTitle==null?'':text(req.body.courseTitle,'Certificate course title',220);
 return transaction(async session=>{
  const item=await CourseCompletion.findById(id).session(session);if(!item)throw businessError('Course completion not found.',404);
  if(req.body?.attemptNumber!==(item.attemptNumber||1))throw businessError('The course attempt changed. Reload the review.',409);
  if(item.status==='issued')return publicCompletion(item);
  if(item.status!=='pending')throw businessError('Only an attempt awaiting review can receive a certificate.',409);
  if(item.status==='revoked')throw businessError('A revoked certificate cannot be silently reissued. Review its activity record.',409);
  const user=await User.findOneAndUpdate({_id:item.user,role:'student',status:{$ne:'blocked'}},{$inc:{commerceVersion:1}},{session,new:true});
  const course=await Course.findById(item.course).session(session);
  if(!user||user.status==='blocked'||!course)throw businessError('Review the course and active student account before issuing.',409);
  const checked=await checkCompletion(user._id,course,session);if(!checked.progress.complete)throw businessError('Required lessons are incomplete, or the published curriculum changed. Use Try Again to let the student complete the current curriculum in a new attempt.',409);
  const evidence=await assessmentReview(item,session);if(!evidence.coverage.complete)throw businessError('Required assessment answers are missing or the curriculum changed. Review the missing items and request Try Again.',409);
  const attempt=await ensureAttempt(user._id,course._id,session);if(attempt.number!==(item.attemptNumber||1)||attempt.status!=='submitted')throw businessError('This attempt is not awaiting review.',409);
  // Snapshot the currently reviewed required curriculum; do not backdate newly added lessons.
  const required=new Set(checked.progress.requiredLessonIds);
  const latest=checked.records.filter(p=>required.has(String(p.lesson))).map(p=>new Date(p.completedAt).getTime()).filter(Number.isFinite);
  if(latest.length&&Math.max(...latest)>new Date(item.completedAt).getTime())item.completedAt=new Date(Math.max(...latest));
  item.requiredLessonIds=checked.progress.requiredLessonIds;
  const name=certificateText(approvedName||user.name,'Student display name').text,title=certificateText(approvedTitle||course.title,'Course title').text;
  if(!Number.isFinite(new Date(item.completedAt).getTime())||new Date(item.completedAt)>new Date())throw businessError('Recorded completion date needs review before issuing.',409);
  const issuedAt=new Date(),number=`SA-${issuedAt.getUTCFullYear()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,token=crypto.randomBytes(24).toString('hex');
  const issuedBy=certificateText(req.user.name||'Academy Administration','Issuer name').text;
  const pdf=createCertificatePdf({studentName:name,courseTitle:title,completedAt:item.completedAt,issuedAt,issuedBy,number,verificationUrl:frontendOrigin()+'/certificates/verify/'+token});
  Object.assign(item,{status:'issued',certificateName:name,certificateTitle:title,issuedAt,issuedBy:req.user._id,issuedByName:issuedBy,certificateNumber:number,verificationToken:token,pdf,pdfSha256:crypto.createHash('sha256').update(pdf).digest('hex')});await item.save({session});
  attempt.status='issued';attempt.reviewedAt=issuedAt;attempt.reviewedBy=req.user._id;attempt.feedback=reason;await attempt.save({session});
  await Notification.create([{dedupeKey:'certificate-issued-'+String(item._id),type:'certificate_issued',title:'Certificate issued',message:`Certificate ${number} issued to ${name} for ${title}.`,user:user._id,entityId:String(item._id),link:'/admin?section=certificates'}],{session});
  await audit(req,{scope:'academy',action:'certificate.issued',targetUser:user._id,entityType:'completion',entityId:String(item._id),reason,changes:{certificateNumber:number,studentName:name,courseTitle:title,pdfSha256:item.pdfSha256}},session);
  return publicCompletion(item);
 });
}
export async function revokeCertificate(req){
 await confirmIdentity(req);const reason=text(req.body?.reason,'Reason',500,5);
 return transaction(async session=>{
  const item=await CourseCompletion.findById(objectId(req.params.id)).session(session);if(!item)throw businessError('Certificate not found.',404);
  if(item.status==='revoked')return publicCompletion(item);if(item.status!=='issued')throw businessError('Only an issued certificate can be revoked.',409);
  await User.findOneAndUpdate({_id:item.user},{$inc:{commerceVersion:1}},{session,new:true});
  item.status='revoked';item.revokedAt=new Date();item.revocationReason=reason;await item.save({session});
  await CourseAttempt.updateOne({user:item.user,course:item.course,number:item.attemptNumber||1},{$set:{status:'revoked',reviewedAt:item.revokedAt,reviewedBy:req.user._id,feedback:reason}},{session});
  await Notification.create([{dedupeKey:'certificate-revoked-'+String(item._id),type:'certificate_revoked',title:'Certificate revoked',message:`Certificate ${item.certificateNumber} was revoked. Review history is retained.`,user:item.user,entityId:String(item._id),link:'/admin?section=certificates'}],{session});
  await audit(req,{scope:'academy',action:'certificate.revoked',targetUser:item.user,entityType:'completion',entityId:String(item._id),reason},session);return publicCompletion(item);
 });
}
