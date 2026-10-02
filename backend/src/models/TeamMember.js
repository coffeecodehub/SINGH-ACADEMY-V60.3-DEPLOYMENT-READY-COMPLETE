import mongoose from 'mongoose';
const schema=new mongoose.Schema({
 name:{type:String,required:true,trim:true}, slug:{type:String,required:true,unique:true,index:true},
 category:{type:String,enum:['founder','faculty','board','core'],required:true,index:true},
 role:{type:String,default:''}, country:{type:String,default:''}, bio:{type:String,default:''},
 image:{type:String,default:'/images/team/faculty-placeholder.jpg'}, imageFileId:{type:String,default:''}, order:{type:Number,default:0},
 imageOriginal:{type:String,default:''},imageOriginalFileId:{type:String,default:null},
 imageEdit:{aspect:String,zoom:Number,x:Number,y:Number,rotation:Number,flipX:Boolean,flipY:Boolean,brightness:Number,contrast:Number},
 active:{type:Boolean,default:true}
},{timestamps:true});
schema.index({active:1,order:1});
schema.index({imageFileId:1});
export default mongoose.models.TeamMember||mongoose.model('TeamMember',schema);
