import mongoose from 'mongoose';
const schema=new mongoose.Schema({payment:{type:mongoose.Schema.Types.ObjectId,ref:'Payment',required:true,index:true},
 invoice:{type:mongoose.Schema.Types.ObjectId,ref:'Invoice'},user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 amountMinor:{type:Number,required:true,min:1,validate:Number.isSafeInteger},currency:{type:String,required:true},
 refundedAt:{type:Date,required:true},reference:{type:String,required:true,maxlength:180},referenceKey:{type:String,required:true,unique:true},
 reason:{type:String,required:true,maxlength:500},recordedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:function(){return this.source!=='provider_webhook';}},
 source:{type:String,enum:['manual_record','provider_webhook'],default:'manual_record'},testMode:{type:Boolean,default:false},provider:{type:String,enum:['stripe','paypal']},providerRefundId:String,revokeAccess:{type:Boolean,default:false},
 requestKey:{type:String,required:true,unique:true},requestFingerprint:{type:String,required:true}
},{timestamps:true});schema.index({refundedAt:-1,currency:1});
export default mongoose.models.Refund||mongoose.model('Refund',schema);
