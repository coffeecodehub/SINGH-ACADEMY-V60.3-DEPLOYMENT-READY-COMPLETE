import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';

function asDate(value){const d=value?new Date(value):null;return d&&Number.isFinite(d.getTime())?d:null;}
function activeAt(enrollment,at){
 if(!enrollment||enrollment.status!=='active')return false;
 const start=asDate(enrollment.accessStartsAt),end=asDate(enrollment.accessExpiresAt);
 return (!start||start<=at)&&(!end||end>=at);
}
/** Keep My Courses enrollment-driven while a membership still grants the whole published library.
 * The end boundary is inclusive here so a renewal beginning exactly when the previous
 * term ends extends the existing enrollment instead of moving its start into the future. */
export async function syncMembershipCourseEnrollments({userId,startsAt,endsAt,invoice=null,testMode=false,session=null,reason='Active Academy membership'}){
 const start=asDate(startsAt)||new Date(),end=asDate(endsAt);if(!end)throw new Error('Membership end date is required.');
 const courses=await Course.find({published:true}).select('slug').session(session).lean();let changed=0,preserved=0;
 for(const course of courses){
  const existing=await Enrollment.findOne({user:userId,courseSlug:course.slug}).session(session);
  if(existing&&activeAt(existing,start)){
   const existingEnd=asDate(existing.accessExpiresAt);
   if(!existingEnd||existingEnd>=end){preserved++;continue;}
   existing.accessExpiresAt=end;existing.status='active';existing.reason=existing.reason||reason;existing.testMode=Boolean(existing.testMode&&testMode);await existing.save({session});changed++;continue;
  }
  const enrollment=existing||new Enrollment({user:userId,courseSlug:course.slug});
  enrollment.status='active';enrollment.accessStartsAt=start;enrollment.accessExpiresAt=end;enrollment.source='membership';enrollment.invoice=invoice||null;enrollment.reason=reason;enrollment.testMode=Boolean(testMode);await enrollment.save({session});changed++;
 }
 return {changed,preserved,total:courses.length};
}
