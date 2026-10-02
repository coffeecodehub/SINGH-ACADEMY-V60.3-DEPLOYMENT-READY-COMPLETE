import User from '../models/User.js';import Progress from '../models/Progress.js';import LessonSubmission from '../models/LessonSubmission.js';
import CourseCompletion from '../models/CourseCompletion.js';
import {transaction} from './businessWrite.js';import {lessonContext} from './learningAccess.js';
import {currentAttempt,ensureAttempt,publicAttempt} from './attempts.js';
import {assessmentDefinition,publicAssessment,validateAnswers,savedAnswers,assertAttempt,assertRevision} from '../utils/assessments.js';
import {businessError} from '../utils/business.js';import {recordCourseCompletion} from './completions.js';
import {validateStudentFiles} from './studentFiles.js';
export async function getAnswerSheet(req){
 const {course,lesson}=await lessonContext(req),attempt=await currentAttempt(req.user._id,course._id),def=assessmentDefinition(lesson);
 const sub=await LessonSubmission.findOne({user:req.user._id,course:course._id,lesson:lesson._id,attemptNumber:attempt.number,schemaVersion:def.version}).lean();
 return {assessment:publicAssessment(def),answers:savedAnswers(sub),revision:sub?.revision||0,attempt:publicAttempt(attempt),savedAt:sub?.updatedAt,submittedAt:sub?.submittedAt};
}
export async function saveLearning(req,complete=false){
 return transaction(async session=>{
  // All answer/completion/review/restart writes take the same per-student lock.
  const user=await User.findOneAndUpdate({_id:req.user._id,role:'student',status:{$ne:'blocked'}},{$inc:{commerceVersion:1}},{session,new:true});
  if(!user)throw businessError('Student account is not active.',403);
  const {course,lesson,module}=await lessonContext(req,session),attempt=await ensureAttempt(user._id,course._id,session);
  assertAttempt(attempt,req.body?.attemptNumber);
  const def=assessmentDefinition(lesson);
  if(req.body?.schemaVersion!==def.version)throw businessError('The lesson questions changed. Reload before submitting answers.',409);
  const filter={user:user._id,course:course._id,lesson:lesson._id,attemptNumber:attempt.number,schemaVersion:def.version};
  const previous=await LessonSubmission.findOne(filter).session(session);
  assertRevision(previous,req.body?.revision);
  const alreadyDone=await Progress.exists({user:user._id,course:course._id,lesson:lesson._id,completed:true}).session(session);
  const fields=validateAnswers(def,req.body?.answers||{},{complete:complete||!!alreadyDone});
  await validateStudentFiles(fields,{user:user._id,course:course._id,lesson:lesson._id,attemptNumber:attempt.number},session);
  let sub=previous;
  if(sub){sub.fields=fields;sub.revision++;if(complete)sub.submittedAt=new Date();await sub.save({session});}
  else sub=(await LessonSubmission.create([{...filter,lessonTitle:lesson.title,moduleTitle:module?.title||'',fields,revision:1,submittedAt:complete?new Date():null}],{session}))[0];
  let completion=null;
  if(complete){await Progress.findOneAndUpdate({user:user._id,lesson:lesson._id},{$set:{course:course._id,completed:true,completedAt:new Date()}},{upsert:true,new:true,runValidators:true,session});completion=await recordCourseCompletion(user,course,session,attempt);}
  return {answers:savedAnswers(sub),revision:sub.revision,savedAt:sub.updatedAt,submittedAt:sub.submittedAt,attempt:publicAttempt(attempt),lessonId:String(lesson._id),completion};
 });
}
