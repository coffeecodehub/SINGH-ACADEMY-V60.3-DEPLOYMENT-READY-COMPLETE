import {realAccessFilter,activeEnrollmentWindow} from '../utils/commerce.js';
import {Router} from 'express';
import mongoose from 'mongoose';
import {resolveSession} from '../middleware/auth.js';
import {validPortal,configuredOrigins} from '../utils/security.js';
import SiteContent from '../models/SiteContent.js';
import User from '../models/User.js';
import StudentFile from '../models/StudentFile.js';
import PaymentAttachment from '../models/PaymentAttachment.js';
import Course from '../models/Course.js';
import TeamMember from '../models/TeamMember.js';
import Event from '../models/Event.js';
import Lesson from '../models/Lesson.js';
import Module from '../models/Module.js';
import Enrollment from '../models/Enrollment.js';
import Subscription from '../models/Subscription.js';
import {normalizeRole} from '../middleware/auth.js';
import {lessonMediaQuery} from '../utils/media.js';
import {httpError,parseByteRange} from '../utils/cmsValidation.js';
const r=Router();
async function optionalUser(req){
 const portal=typeof req.query?.portal==='string'?req.query.portal:'student';
 if(!validPortal(portal))return null;
 const found=await resolveSession(req,portal);
 return found&&!found.session.setupOnly?found.user:null;
}
async function visibleTo(req,id,user){
  if(['client_admin','super_admin'].includes(normalizeRole(user?.role)))return true;
  const publicRefs=await Promise.all([
    Course.exists({published:true,$or:[{thumbnailFileId:id},{'gallery.fileId':id}]}),
    TeamMember.exists({active:true,imageFileId:String(id)}),Event.exists({status:'published',imageFileId:String(id)}),SiteContent.exists({key:'websiteContent','value.images.fileId':String(id)})
  ]);
  if(publicRefs.some(Boolean))return true;
  const lessons=await Lesson.find({published:{$ne:false},...lessonMediaQuery(id)}).select('module preview').lean();
  if(!lessons.length)return false;
  const modules=await Module.find({_id:{$in:lessons.map(l=>l.module)}}).select('course').lean();
  const courses=await Course.find({_id:{$in:modules.map(m=>m.course)},published:true}).select('slug accessType').lean();
  for(const course of courses){
    const moduleIds=modules.filter(m=>String(m.course)===String(course._id)).map(m=>String(m._id));
    if(lessons.some(l=>l.preview&&moduleIds.includes(String(l.module))))return true;
    if(!user)continue;
    if(course.accessType==='free')return true;
    const now=new Date();
    if(await Enrollment.exists({user:user._id,courseSlug:course.slug,status:'active',...realAccessFilter(),...activeEnrollmentWindow(now)}))return true;
    if(await Subscription.exists({user:user._id,status:'active',...realAccessFilter(),startsAt:{$lte:now},endsAt:{$gt:now}}))return true;
  }
  return false;
}
r.get('/:id',async(req,res,next)=>{
  if(!mongoose.isValidObjectId(req.params.id))throw httpError(400,'Invalid media identifier.');
  const id=new mongoose.Types.ObjectId(req.params.id),user=await optionalUser(req);
  
  const bucket=new mongoose.mongo.GridFSBucket(mongoose.connection.db,{bucketName:'academyMedia'}),files=await bucket.find({_id:id}).toArray();
  if(!files.length)throw httpError(404,'Media not found.');
  const file=files[0],total=file.length,type=file.contentType||'application/octet-stream';
  if(file.metadata?.purpose==='payment-receipt'){
    const owned=user&&await PaymentAttachment.exists({fileId:id,...(user.role==='student'?{user:user._id}:{})});
    if(!owned||!['student','client_admin'].includes(user?.role))throw httpError(user?403:401,'This receipt screenshot is private to its owner and Academy administrator.');
  }else if(file.metadata?.purpose==='student-assessment'){
    const owned=user&&user.role==='student'&&await StudentFile.exists({fileId:id,user:user._id});
    if(!owned&&user?.role!=='client_admin')throw httpError(user?403:401,'This assignment file is private to its student and Academy reviewer.');
  }else if(!await visibleTo(req,id,user))throw httpError(user?403:401,'Sign in with course access to open this file.');
  res.set('Accept-Ranges','bytes');res.set('X-Content-Type-Options','nosniff');res.set('Cache-Control','private, no-store');res.set('Content-Type',type);
  const safeName=String(file.filename||'download').replace(/[^a-zA-Z0-9._-]/g,'_'),forceDownload=['1','true','yes'].includes(String(req.query?.download||'').toLowerCase());
  if(forceDownload){
    res.set('Content-Disposition',`attachment; filename="${safeName}"`);
    res.set('Content-Security-Policy',"sandbox; default-src 'none'");
  }else if(type==='application/pdf'){
    res.removeHeader('X-Frame-Options');res.set('Content-Disposition',`inline; filename="${safeName}"`);res.set('Content-Security-Policy',"sandbox; default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self' "+configuredOrigins().join(' '));
  }else if(!/^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime))$/.test(type)){
    res.set('Content-Disposition',`attachment; filename="${safeName}"`);
    res.set('Content-Security-Policy',"sandbox; default-src 'none'");
  }
  const sendStream=options=>{
    if(req.method==='HEAD')return res.end();
    const input=bucket.openDownloadStream(id,options);
    const abort=()=>input.destroy();res.once('close',abort);
    input.once('error',error=>{res.removeListener('close',abort);if(res.headersSent)res.destroy();else next(error);});
    input.once('end',()=>res.removeListener('close',abort));input.pipe(res);return input;
  };
  if(req.headers.range){
    const range=parseByteRange(req.headers.range,total);
    if(!range)return res.status(416).set('Content-Range',`bytes */${total}`).end();
    const {start,end}=range;res.status(206).set('Content-Range',`bytes ${start}-${end}/${total}`).set('Content-Length',String(end-start+1));
    return sendStream({start,end:end+1});
  }
  res.set('Content-Length',String(total));return sendStream();
});
export default r;
