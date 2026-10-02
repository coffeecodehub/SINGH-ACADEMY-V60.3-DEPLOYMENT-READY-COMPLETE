import mongoose from 'mongoose';
/** Separate from the shared admin inbox. Each notification and delivery lease belongs to one student. */
const schema=new mongoose.Schema({
 user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 subscription:{type:mongoose.Schema.Types.ObjectId,ref:'Subscription',required:true},
 dedupeKey:{type:String,required:true,unique:true},type:{type:String,enum:['subscription_confirmed','subscription_expiring'],required:true},
 title:{type:String,required:true,maxlength:200},message:{type:String,required:true,maxlength:1500},
 link:{type:String,default:'/billing'},plan:String,termEnd:Date,testMode:{type:Boolean,default:false},readAt:{type:Date,default:null},
 emailState:{type:String,enum:['queued','sending','sent','deferred','skipped','dev_preview','failed'],default:'queued'},
 attempts:{type:Number,default:0},nextAttemptAt:{type:Date,default:Date.now},leaseToken:String,leaseUntil:Date,
 emailAcceptedAt:Date,lastError:{type:String,maxlength:100},
},{timestamps:true});
schema.index({user:1,createdAt:-1,_id:-1});schema.index({user:1,readAt:1});
schema.index({emailState:1,nextAttemptAt:1,leaseUntil:1});
export default mongoose.models.StudentNotification||mongoose.model('StudentNotification',schema);
