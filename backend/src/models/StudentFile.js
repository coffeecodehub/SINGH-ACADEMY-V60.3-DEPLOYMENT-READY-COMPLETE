import mongoose from 'mongoose';
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},course:{type:mongoose.Schema.Types.ObjectId,ref:'Course',required:true},lesson:{type:mongoose.Schema.Types.ObjectId,ref:'Lesson',required:true},attemptNumber:{type:Number,required:true},fieldKey:{type:String,required:true},fileId:{type:mongoose.Schema.Types.ObjectId,required:true,unique:true},name:String,mime:String,size:Number},{timestamps:true});
schema.index({user:1,course:1,lesson:1,attemptNumber:1});
export default mongoose.models.StudentFile||mongoose.model('StudentFile',schema);
