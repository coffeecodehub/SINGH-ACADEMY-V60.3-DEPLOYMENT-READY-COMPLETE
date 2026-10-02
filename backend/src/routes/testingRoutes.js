import {Router} from 'express';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import {requireAuth,requireRole} from '../middleware/auth.js';
const r=Router();
// Testing is opt-in, admin-only, and can never be enabled in production.
r.use((req,res,next)=>process.env.NODE_ENV!=='production'&&process.env.ENABLE_TEST_ENROLLMENT==='true'?next():res.status(404).json({success:false,message:'Testing access is disabled.'}));
r.post('/enroll/:courseSlug',requireAuth,requireRole('client_admin','super_admin'),async(req,res)=>{
  const course=await Course.findOne({slug:req.params.courseSlug,published:true});
  if(!course)return res.status(404).json({success:false,message:'Course not found.'});
  const enrollment=await Enrollment.findOneAndUpdate({user:req.user._id,courseSlug:course.slug},{$set:{status:'active',accessStartsAt:new Date(),accessExpiresAt:null}},{upsert:true,new:true,setDefaultsOnInsert:true});
  res.json({success:true,message:'Development-only admin access enabled.',enrollment});
});
export default r;
