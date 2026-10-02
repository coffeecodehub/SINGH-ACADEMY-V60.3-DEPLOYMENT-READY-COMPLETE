import mongoose from 'mongoose';
const schema=new mongoose.Schema({scope:{type:String,enum:['academy','business','student_auth','client_auth','super_auth','cms'],required:true,index:true},
 actor:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null},targetUser:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null,index:true},
 action:{type:String,required:true,index:true},entityType:String,entityId:String,outcome:{type:String,enum:['success','denied'],default:'success'},
 reason:{type:String,maxlength:2000},networkId:String,userAgent:{type:String,maxlength:200},changes:mongoose.Schema.Types.Mixed
},{timestamps:true});
schema.index({createdAt:-1});
schema.index({scope:1,createdAt:-1});
export default mongoose.models.AuditLog||mongoose.model('AuditLog',schema);
