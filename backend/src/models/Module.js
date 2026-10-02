import mongoose from 'mongoose';
const schema=new mongoose.Schema({course:{type:mongoose.Schema.Types.ObjectId,ref:'Course',required:true,index:true},title:{type:String,required:true},description:String,order:{type:Number,default:0},sequential:{type:Boolean,default:true}},{timestamps:true});
schema.index({course:1,order:1});
export default mongoose.models.Module||mongoose.model('Module',schema);
