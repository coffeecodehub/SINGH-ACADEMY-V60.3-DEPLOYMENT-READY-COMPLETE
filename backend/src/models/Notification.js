import mongoose from 'mongoose';
const schema=new mongoose.Schema({dedupeKey:{type:String,unique:true,sparse:true},link:{type:String,maxlength:250},entityId:String,type:{type:String,default:'info'},title:{type:String,required:true},message:String,user:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null},read:{type:Boolean,default:false}},{timestamps:true});
schema.index({read:1,createdAt:-1});
export default mongoose.models.Notification||mongoose.model('Notification',schema);
