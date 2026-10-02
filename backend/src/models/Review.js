import mongoose from 'mongoose';
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},name:{type:String,required:true},rating:{type:Number,min:1,max:5,required:true},message:{type:String,required:true,trim:true,maxlength:2000},status:{type:String,enum:['pending','approved','rejected'],default:'approved'}},{timestamps:true});
schema.index({status:1,createdAt:-1});
schema.index({user:1},{name:'one_pending_review_per_student',unique:true,partialFilterExpression:{status:'pending'}});
export default mongoose.models.Review||mongoose.model('Review',schema);
