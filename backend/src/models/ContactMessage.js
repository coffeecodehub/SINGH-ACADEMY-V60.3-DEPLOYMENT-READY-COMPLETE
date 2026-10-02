import mongoose from 'mongoose';
const schema=new mongoose.Schema({name:{type:String,required:true,maxlength:120},email:{type:String,required:true,maxlength:254},topic:{type:String,maxlength:80,default:'General enquiry'},message:{type:String,required:true,maxlength:4000},status:{type:String,enum:['new','responded','closed'],default:'new'},updatedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}},{timestamps:true});
schema.index({status:1,createdAt:-1});
export default mongoose.models.ContactMessage||mongoose.model('ContactMessage',schema);
