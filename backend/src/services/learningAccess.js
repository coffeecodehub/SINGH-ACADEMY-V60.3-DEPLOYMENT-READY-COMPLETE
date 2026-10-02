import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';import Subscription from '../models/Subscription.js';
import Module from '../models/Module.js';import Lesson from '../models/Lesson.js';import Progress from '../models/Progress.js';
import {realAccessFilter,activeEnrollmentWindow} from '../utils/commerce.js';import {businessError} from '../utils/business.js';
export async function hasCourseAccess(userId,slug,session=null){
 const now=new Date();
 if(await Course.exists({slug,published:true,accessType:'free'}).session(session))return {type:'free'};
 const enrollment=await Enrollment.findOne({user:userId,courseSlug:slug,status:'active',...realAccessFilter(),...activeEnrollmentWindow(now)}).session(session).lean();
 if(enrollment)return {type:'course',enrollment};
 const membership=await Subscription.findOne({user:userId,status:'active',...realAccessFilter(),startsAt:{$lte:now},endsAt:{$gt:now}}).session(session).lean();
 return membership?{type:'membership',membership}:null;
}
export async function orderedCurriculum(courseId,session=null){
 const modules=await Module.find({course:courseId}).sort({order:1,_id:1}).session(session).lean();
 const raw=await Lesson.find({module:{$in:modules.map(m=>m._id)},published:{$ne:false}}).sort({order:1,_id:1}).session(session).lean();
 return {modules,lessons:modules.flatMap(m=>raw.filter(l=>String(l.module)===String(m._id)))};
}
export async function lessonContext(req,session=null){
 const course=await Course.findOne({slug:req.params.slug,published:true}).session(session).lean();
 if(!course)throw businessError('Course not found.',404);
 if(!await hasCourseAccess(req.user._id,course.slug,session))throw businessError('Your course access is not active. Renew access from My Billing or choose a membership.',403);
 const {modules,lessons}=await orderedCurriculum(course._id,session),index=lessons.findIndex(l=>String(l._id)===String(req.params.lessonId));
 if(index<0)throw businessError('Lesson not found.',404);
 const lesson=lessons[index],module=modules.find(m=>String(m._id)===String(lesson.module));
 const requiredBefore=module?.sequential===false?[]:lessons.slice(0,index).filter(l=>l.completionRequired!==false);
 const done=await Progress.countDocuments({user:req.user._id,course:course._id,lesson:{$in:requiredBefore.map(l=>l._id)},completed:true}).session(session);
 if(done<requiredBefore.length)throw businessError('Complete the previous required lessons first.',409);
 return {course,lesson,module,lessons,modules};
}
