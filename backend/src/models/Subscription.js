import mongoose from 'mongoose';
const schema=new mongoose.Schema({testMode:{type:Boolean,default:false},user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},plan:{type:String,trim:true},
 status:{type:String,enum:['active','past_due','cancelled','expired'],default:'active',index:true},startsAt:{type:Date,default:Date.now},endsAt:Date,
 // An absent dueAt is UNKNOWN. It is never guessed from the access expiry.
 dueAt:{type:Date,default:null},durationMonths:Number,priceMinor:{type:Number,min:0,validate:Number.isSafeInteger},currency:String,
 invoice:{type:mongoose.Schema.Types.ObjectId,ref:'Invoice'},source:{type:String,enum:['manual_payment','provider','complimentary','legacy'],default:'legacy'},
 cancelAtPeriodEnd:{type:Boolean,default:false},cancelledAt:Date,cancellationReason:String,
 stripeCustomerId:String,stripeSubscriptionId:String
},{timestamps:true});schema.index({status:1,endsAt:1});schema.index({invoice:1},{unique:true,sparse:true});
schema.index({user:1,status:1,startsAt:1,endsAt:1});
export default mongoose.models.Subscription||mongoose.model('Subscription',schema);
