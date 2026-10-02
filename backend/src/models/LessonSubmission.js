import mongoose from 'mongoose';
const field=new mongoose.Schema({key:String,prompt:String,kind:String,required:Boolean,options:[String],points:Number,
 correctAnswer:mongoose.Schema.Types.Mixed,answer:mongoose.Schema.Types.Mixed},{_id:false});
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
 course:{type:mongoose.Schema.Types.ObjectId,ref:'Course',required:true},lesson:{type:mongoose.Schema.Types.ObjectId,ref:'Lesson',required:true},
 attemptNumber:{type:Number,required:true,min:1},schemaVersion:{type:String,required:true},lessonTitle:String,moduleTitle:String,
 fields:{type:[field],default:[]},revision:{type:Number,default:1},submittedAt:Date
},{timestamps:true,optimisticConcurrency:true});
// Old curriculum versions and previous attempts are retained for review, not overwritten by a restart.
schema.index({user:1,course:1,lesson:1,attemptNumber:1,schemaVersion:1},{unique:true});
schema.index({user:1,course:1,attemptNumber:1,updatedAt:-1});
export default mongoose.models.LessonSubmission||mongoose.model('LessonSubmission',schema);
