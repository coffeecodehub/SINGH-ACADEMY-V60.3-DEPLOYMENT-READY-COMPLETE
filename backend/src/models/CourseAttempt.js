import mongoose from 'mongoose';
const schema=new mongoose.Schema({
 user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
 course:{type:mongoose.Schema.Types.ObjectId,ref:'Course',required:true},
 number:{type:Number,required:true,min:1,validate:Number.isSafeInteger},
 status:{type:String,enum:['in_progress','submitted','retry_requested','issued','revoked'],default:'in_progress'},
 startedAt:{type:Date,default:Date.now},completedAt:Date,reviewedAt:Date,lastLesson:{type:mongoose.Schema.Types.ObjectId,ref:'Lesson'},lastViewedAt:Date,
 reviewedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},feedback:{type:String,maxlength:2000,default:''},
 legacy:{type:Boolean,default:false},requiredLessonIds:[mongoose.Schema.Types.ObjectId],
 progressSnapshot:[{lesson:mongoose.Schema.Types.ObjectId,completedAt:Date,_id:false}]
},{timestamps:true,optimisticConcurrency:true});
schema.index({user:1,course:1,number:1},{unique:true});
schema.index({course:1,status:1,completedAt:-1});
export default mongoose.models.CourseAttempt||mongoose.model('CourseAttempt',schema);
