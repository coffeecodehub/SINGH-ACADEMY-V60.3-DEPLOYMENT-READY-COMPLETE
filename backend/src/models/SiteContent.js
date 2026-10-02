import mongoose from 'mongoose';
const schema=new mongoose.Schema({key:{type:String,required:true,unique:true},value:{type:mongoose.Schema.Types.Mixed,required:true},revision:{type:Number,default:0}},{timestamps:true});
export default mongoose.models.SiteContent||mongoose.model('SiteContent',schema);
