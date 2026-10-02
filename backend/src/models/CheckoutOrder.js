import mongoose from 'mongoose';
const schema=new mongoose.Schema({
 user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 provider:{type:String,enum:['stripe','paypal'],required:true},environment:{type:String,enum:['test','live'],required:true},
 kind:{type:String,enum:['course','membership'],required:true},product:{type:String,required:true},title:{type:String,required:true},
 optionKey:{type:String,default:''},optionLabel:String,amountMinor:{type:Number,required:true,min:1,validate:Number.isSafeInteger},currency:{type:String,required:true},
 renewalOf:{type:mongoose.Schema.Types.ObjectId,ref:'Subscription'},
 accessDays:{type:Number,default:0},durationMonths:Number,
 status:{type:String,enum:['creating','pending','paid','expired','failed','cancelled'],default:'creating',index:true},
 providerOrderId:String,approvalUrl:{type:String,select:false},expiresAt:{type:Date,required:true},paidAt:Date,
 invoice:{type:mongoose.Schema.Types.ObjectId,ref:'Invoice'},payment:{type:mongoose.Schema.Types.ObjectId,ref:'Payment'},
 requestKey:{type:String,unique:true,required:true},requestFingerprint:{type:String,required:true,select:false},
 grantNote:String,accessStartsAt:Date,accessExpiresAt:Date,
 creationClaim:{type:String,select:false},creationClaimUntil:Date
},{timestamps:true,optimisticConcurrency:true});
schema.index({provider:1,environment:1,providerOrderId:1},{unique:true,partialFilterExpression:{providerOrderId:{$type:'string'}}});
schema.index({user:1,createdAt:-1});
export default mongoose.models.CheckoutOrder||mongoose.model('CheckoutOrder',schema);
