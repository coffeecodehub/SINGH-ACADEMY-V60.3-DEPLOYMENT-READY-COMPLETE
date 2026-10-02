import mongoose from 'mongoose';
const money={type:Number,min:0,validate:Number.isSafeInteger};
const schema=new mongoose.Schema({
 testMode:{type:Boolean,default:false},origin:{type:String,enum:['manual','online_checkout'],default:'manual'},
 number:{type:String,required:true,unique:true},user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 kind:{type:String,enum:['course','membership'],required:true},title:{type:String,required:true},courseSlug:String,planName:String,
 durationMonths:Number,accessDays:Number,accessExpiresAt:Date,noScheduledExpiry:{type:Boolean,default:false},accessStartsAt:{type:Date,required:true},currency:{type:String,required:true},
 creditedMinor:{...money,default:0},totalMinor:{...money,required:true,min:1},paidMinor:{...money,default:0},dueAt:{type:Date,required:true,index:true},
 renewalOf:{type:mongoose.Schema.Types.ObjectId,ref:'Subscription'},lastReminderAt:Date,voidReason:String,
 status:{type:String,enum:['open','paid','void'],default:'open',index:true},paidAt:Date,voidedAt:Date,
 fulfillmentAt:Date,createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
 notes:{type:String,maxlength:1000},requestKey:{type:String,required:true,unique:true},requestFingerprint:{type:String,required:true}
},{timestamps:true,optimisticConcurrency:true});
schema.index({user:1,createdAt:-1});
schema.index({renewalOf:1},{unique:true,partialFilterExpression:{renewalOf:{$type:'objectId'},status:'open'}});
schema.index({status:1,currency:1,dueAt:1});
export default mongoose.models.Invoice||mongoose.model('Invoice',schema);
