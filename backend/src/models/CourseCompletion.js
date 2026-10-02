import mongoose from 'mongoose';
const schema=new mongoose.Schema({
 user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},course:{type:mongoose.Schema.Types.ObjectId,ref:'Course',required:true},
 attemptNumber:{type:Number,default:1,min:1},lastReviewedAttempt:Number,retryFeedback:{type:String,maxlength:2000,default:''},reviewedAt:Date,
 courseSlug:{type:String,required:true},courseTitle:{type:String,required:true},studentName:{type:String,required:true},
 completedAt:{type:Date,required:true},requiredLessonIds:[mongoose.Schema.Types.ObjectId],
 status:{type:String,enum:['pending','issued','revoked','retry_requested'],default:'pending',index:true},
 certificateNumber:{type:String,unique:true,sparse:true},verificationToken:{type:String,unique:true,sparse:true,select:false},
 issuedAt:Date,issuedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},issuedByName:String,
 certificateName:String,certificateTitle:String,pdf:{type:Buffer,select:false},pdfSha256:{type:String,select:false},
 revokedAt:Date,revocationReason:{type:String,maxlength:500,select:false}
},{timestamps:true,optimisticConcurrency:true});
schema.index({user:1,course:1},{unique:true});schema.index({status:1,completedAt:-1});
export default mongoose.models.CourseCompletion||mongoose.model('CourseCompletion',schema);
