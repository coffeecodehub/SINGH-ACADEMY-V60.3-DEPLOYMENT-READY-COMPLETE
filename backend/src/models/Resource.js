import mongoose from 'mongoose';
const schema=new mongoose.Schema({title:{type:String,required:true},type:{type:String,default:'link'},category:String,url:String,description:String,status:{type:String,enum:['draft','published'],default:'published'}},{timestamps:true});
export default mongoose.models.Resource||mongoose.model('Resource',schema);
