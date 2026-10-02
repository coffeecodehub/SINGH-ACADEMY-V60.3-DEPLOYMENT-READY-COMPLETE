import mongoose from 'mongoose';
/** Immutable collection record. Old major-unit amount is retained for compatibility; new records use amountMinor. */
const schema=new mongoose.Schema({
 user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},courseSlug:{type:String,index:true},
 kind:{type:String,enum:['course','membership'],default:'course'},invoice:{type:mongoose.Schema.Types.ObjectId,ref:'Invoice',default:null},
 testMode:{type:Boolean,default:false},checkoutOrder:{type:mongoose.Schema.Types.ObjectId,ref:'CheckoutOrder'},providerRecordKey:{type:String,unique:true,sparse:true},
 provider:{type:String,enum:['stripe','paypal','manual'],required:true},providerPaymentId:String,
 status:{type:String,enum:['pending','paid','failed','cancelled'],default:'pending',index:true},
 amount:Number,amountMinor:{type:Number,min:0,validate:Number.isSafeInteger},currency:{type:String,default:'USD'},
 verifiedAt:Date,paidAt:Date,verificationSource:{type:String,enum:['provider_webhook','provider_api','admin_recorded']},
 method:{type:String,enum:['bank_transfer','cash','cheque','other']},reference:{type:String,maxlength:180},
 referenceKey:{type:String,unique:true,sparse:true},refundedMinor:{type:Number,default:0,min:0,validate:Number.isSafeInteger},
 recordedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},notes:{type:String,maxlength:1000},
 requestKey:{type:String,unique:true,sparse:true},requestFingerprint:String
},{timestamps:true,optimisticConcurrency:true});
schema.index({paidAt:-1,currency:1});schema.index({user:1,createdAt:-1});
schema.index({invoice:1,status:1,paidAt:-1});
export default mongoose.models.Payment||mongoose.model('Payment',schema);
