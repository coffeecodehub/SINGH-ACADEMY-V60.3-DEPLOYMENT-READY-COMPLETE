import mongoose from 'mongoose';
/** Student-supplied proof only: never a source of payment verification or access entitlement. */
const schema=new mongoose.Schema({
 user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},payment:{type:mongoose.Schema.Types.ObjectId,ref:'Payment',required:true},
 fileId:{type:mongoose.Schema.Types.ObjectId,required:true,unique:true},name:{type:String,maxlength:150},mime:String,size:Number
},{timestamps:true});
schema.index({user:1,payment:1,createdAt:-1});
export default mongoose.models.PaymentAttachment||mongoose.model('PaymentAttachment',schema);
