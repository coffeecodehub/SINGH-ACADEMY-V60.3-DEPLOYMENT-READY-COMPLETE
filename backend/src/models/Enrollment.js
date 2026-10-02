import mongoose from 'mongoose';
const schema=new mongoose.Schema({testMode:{type:Boolean,default:false},user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},courseSlug:{type:String,required:true},
 status:{type:String,enum:['active','expired','cancelled'],default:'active'},accessStartsAt:{type:Date,default:Date.now},accessExpiresAt:Date,
 source:{type:String,enum:['manual_payment','provider','complimentary','membership','free','legacy'],default:'legacy'},
 invoice:{type:mongoose.Schema.Types.ObjectId,ref:'Invoice'},grantedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},reason:String
},{timestamps:true});schema.index({user:1,courseSlug:1},{unique:true});
schema.index({user:1,status:1,accessExpiresAt:1});
export default mongoose.models.Enrollment||mongoose.model('Enrollment',schema);
