import {Router} from 'express';import CourseCompletion from '../models/CourseCompletion.js';
import {requireAuth,requireRole} from '../middleware/auth.js';import {rateLimit} from '../middleware/rateLimit.js';
import {pagination,text,businessError} from '../utils/business.js';import {objectId} from '../services/businessRead.js';import {publicCompletion} from '../utils/completion.js';import {issueCertificate,revokeCertificate,checkCompletion,assessmentReview,retryCourse} from '../services/completions.js';import Course from '../models/Course.js';import CourseAttempt from '../models/CourseAttempt.js';
import {positiveAttempt} from '../utils/assessments.js';
const r=Router();
// Sharing this random verification token is voluntary. No email, login, contact, payment or PDF bytes are public.
r.get('/verify/:token',rateLimit('certificate-verify',40,60000),async(req,res)=>{if(!/^[a-f0-9]{48}$/.test(req.params.token))throw businessError('Certificate not found.',404);const item=await CourseCompletion.findOne({verificationToken:req.params.token,status:{$in:['issued','revoked']}}).lean();if(!item)throw businessError('Certificate not found.',404);res.set('Cache-Control','no-store');res.json({success:true,certificate:{number:item.certificateNumber,status:item.status,name:item.certificateName,course:item.certificateTitle,completedAt:item.completedAt,issuedAt:item.issuedAt,revokedAt:item.revokedAt}});});
r.use(requireAuth);
r.get('/mine',requireRole('student'),async(req,res)=>{const {page,pageSize,skip}=pagination(req.query),filter={user:req.user._id};const [items,total]=await Promise.all([CourseCompletion.find(filter).sort({completedAt:-1,_id:-1}).skip(skip).limit(pageSize).lean(),CourseCompletion.countDocuments(filter)]);res.json({success:true,items:items.map(publicCompletion),total,page,pageSize});});
r.get('/admin',requireRole('client_admin'),async(req,res)=>{const {page,pageSize,skip}=pagination(req.query),filter={};if(req.query.status){if(!['pending','issued','revoked','retry_requested'].includes(req.query.status))throw businessError('Invalid certificate status.');filter.status=req.query.status;}if(req.query.q){const q=text(req.query.q,'Search',120).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');filter.$or=[{studentName:{$regex:q,$options:'i'}},{courseTitle:{$regex:q,$options:'i'}},{certificateNumber:{$regex:q,$options:'i'}}];}const [items,total]=await Promise.all([CourseCompletion.find(filter).populate('user','name email status').sort({completedAt:-1,_id:-1}).skip(skip).limit(pageSize).lean(),CourseCompletion.countDocuments(filter)]);res.json({success:true,items,total,page,pageSize});});
r.get('/admin/:id',requireRole('client_admin'),async(req,res)=>{
 const item=await CourseCompletion.findById(objectId(req.params.id)).populate('user','name email status').lean();
 if(!item)throw businessError('Completion not found.',404);
 if(req.query.attempt!==undefined&&(typeof req.query.attempt!=='string'||!/^\d+$/.test(req.query.attempt)))throw businessError('Invalid attempt.',400);
 const number=req.query.attempt?positiveAttempt(Number(req.query.attempt)):(item.attemptNumber||1);
 if(number>(item.attemptNumber||1))throw businessError('Attempt not found.',404);
 const course=await Course.findById(item.course).lean();
 const checked=course&&item.user?._id?await checkCompletion(item.user._id,course,null):null;
 const review=await assessmentReview(item,null,number);
 const [attempt,attempts]=await Promise.all([CourseAttempt.findOne({user:item.user?._id,course:item.course,number}).lean(),CourseAttempt.find({user:item.user?._id,course:item.course}).select('number status startedAt completedAt reviewedAt feedback legacy').sort({number:-1}).limit(20).lean()]);
 res.json({success:true,item,selectedAttempt:number,attempt,attempts,historyTruncated:(item.attemptNumber||1)>20,eligible:item.status==='pending'&&number===(item.attemptNumber||1)&&!!checked?.progress.complete&&review.coverage.complete,progress:checked?.progress,review});
});
r.post('/admin/:id/try-again',requireRole('client_admin'),rateLimit('certificate-retry',20,60000,{authenticated:true}),async(req,res)=>res.json({success:true,item:await retryCourse(req)}));
r.post('/admin/:id/issue',requireRole('client_admin'),rateLimit('certificate-issue',30,60000,{authenticated:true}),async(req,res)=>res.json({success:true,item:await issueCertificate(req)}));
r.post('/admin/:id/revoke',requireRole('client_admin'),rateLimit('certificate-revoke',20,60000,{authenticated:true}),async(req,res)=>res.json({success:true,item:await revokeCertificate(req)}));
r.get('/:id/download',requireRole('student','client_admin'),async(req,res)=>{const filter={_id:objectId(req.params.id),...(req.user.role==='student'?{user:req.user._id}:{})};const item=await CourseCompletion.findOne(filter).select('+pdf');if(!item||item.status!=='issued'||!item.pdf)throw businessError('An issued certificate is not available.',404);res.set({'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${item.certificateNumber}.pdf"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});res.send(Buffer.from(item.pdf));});
export default r;
