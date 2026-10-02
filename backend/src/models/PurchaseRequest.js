import mongoose from 'mongoose';
const schema=new mongoose.Schema({
 user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 kind:{type:String,enum:['course','membership'],required:true},product:{type:String,required:true,maxlength:200},title:{type:String,required:true,maxlength:250},
 status:{type:String,enum:['new','contacted','invoiced','closed'],default:'new'},
 message:{type:String,maxlength:1000,default:''},quotedAmountMinor:{type:Number,min:0,validate:Number.isSafeInteger},currency:{type:String,default:'USD'},
 activeKey:{type:String,unique:true,sparse:true},invoice:{type:mongoose.Schema.Types.ObjectId,ref:'Invoice'},
 updatedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},closedAt:Date
},{timestamps:true});
schema.index({status:1,createdAt:-1});schema.index({user:1,createdAt:-1});
export default mongoose.models.PurchaseRequest||mongoose.model('PurchaseRequest',schema);
