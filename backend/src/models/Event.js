import mongoose from 'mongoose';
const schema=new mongoose.Schema({title:{type:String,required:true},slug:{type:String,required:true,unique:true},date:Date,location:String,description:String,image:String,imageFileId:String,mapUrl:String,status:{type:String,enum:['draft','published'],default:'published'}},{timestamps:true});
schema.index({status:1,date:1});
schema.index({imageFileId:1});
export default mongoose.models.Event||mongoose.model('Event',schema);
