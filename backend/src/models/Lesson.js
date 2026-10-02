import mongoose from 'mongoose';
const q=new mongoose.Schema({prompt:String,kind:{type:String,default:'long-text'},required:{type:Boolean,default:true},options:[String],correctAnswer:mongoose.Schema.Types.Mixed,points:{type:Number,default:1}},{_id:false});
const r=new mongoose.Schema({label:String,url:String,fileId:mongoose.Schema.Types.ObjectId,kind:String,fileName:String,mime:String},{_id:false});
const contentBlock=new mongoose.Schema({
 type:{type:String,enum:['rich_text','video','pdf','document','external_link','image','embed','reflection','assignment','quiz','resource_list'],required:true},
 title:String,body:String,url:String,provider:String,fileId:{type:mongoose.Schema.Types.ObjectId,default:null},fileName:String,mime:String,caption:String,
 items:[{label:String,url:String,kind:String,fileId:mongoose.Schema.Types.ObjectId,fileName:String,mime:String}],
 questions:[q],settings:{type:mongoose.Schema.Types.Mixed,default:{}}
},{_id:true});
const schema=new mongoose.Schema({module:{type:mongoose.Schema.Types.ObjectId,ref:'Module',required:true,index:true},title:{type:String,required:true},order:{type:Number,default:0},type:{type:String,enum:['theory','video','pdf','quiz','assignment','journal','resource','mixed'],default:'mixed'},description:String,videoUrl:String,videoProvider:String,videoFileId:{type:mongoose.Schema.Types.ObjectId,default:null},videoThumbnailUrl:String,videoThumbnailFileId:{type:mongoose.Schema.Types.ObjectId,default:null},pdfUrl:String,pdfFileId:{type:mongoose.Schema.Types.ObjectId,default:null},textNotes:String,durationMinutes:Number,questions:[q],resources:[r],assignmentInstructions:String,contentBlocks:{type:[contentBlock],default:[]},published:{type:Boolean,default:true},preview:{type:Boolean,default:false},completionRequired:{type:Boolean,default:true},passingScore:{type:Number,default:0}},{timestamps:true});
schema.index({module:1,published:1,order:1});
export default mongoose.models.Lesson||mongoose.model('Lesson',schema);
