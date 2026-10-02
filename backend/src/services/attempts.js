import CourseAttempt from '../models/CourseAttempt.js';import CourseCompletion from '../models/CourseCompletion.js';
export async function currentAttempt(userId,courseId,session=null){
 const attempt=await CourseAttempt.findOne({user:userId,course:courseId}).sort({number:-1}).session(session).lean();
 if(attempt)return attempt;
 const completion=await CourseCompletion.findOne({user:userId,course:courseId}).session(session).lean();
 return {user:userId,course:courseId,number:completion?.attemptNumber||1,status:completion?.status==='pending'?'submitted':['issued','revoked'].includes(completion?.status)?completion.status:'in_progress',legacy:!!completion};
}
export async function ensureAttempt(userId,courseId,session){
 const current=await currentAttempt(userId,courseId,session);if(current._id)return CourseAttempt.findById(current._id).session(session);
 return (await CourseAttempt.create([{user:userId,course:courseId,number:current.number,status:current.status,legacy:current.legacy}],{session}))[0];
}
export function publicAttempt(attempt){return {number:attempt.number,status:attempt.status,startedAt:attempt.startedAt,completedAt:attempt.completedAt,reviewedAt:attempt.reviewedAt,feedback:attempt.feedback||'',lastLesson:attempt.lastLesson?String(attempt.lastLesson):'',lastViewedAt:attempt.lastViewedAt||null,legacy:!!attempt.legacy};}
