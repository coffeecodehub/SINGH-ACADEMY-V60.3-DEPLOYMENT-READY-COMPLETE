import mongoose from 'mongoose';
const pricingSchema=new mongoose.Schema({key:String,label:String,price:Number,compareAtPrice:Number,billing:String,durationMonths:{type:Number,min:1,max:120},accessDays:Number,features:[String]},{_id:false});
const schema=new mongoose.Schema({
 title:{type:String,required:true,trim:true},
 slug:{type:String,required:true,unique:true,index:true,trim:true},
 shortDescription:String,description:String,
 instructor:{type:String,default:'Dr. Sukhsimranjit Singh'},
 thumbnail:String,
 thumbnailFileId:{type:mongoose.Schema.Types.ObjectId,default:null},
 thumbnailFit:{type:String,enum:['cover','contain','fill'],default:'cover'},
 thumbnailPositionX:{type:Number,default:50,min:0,max:100},
 thumbnailPositionY:{type:Number,default:50,min:0,max:100},
 thumbnailZoom:{type:Number,default:1,min:1,max:2},
 gallery:[{url:String,fileId:mongoose.Schema.Types.ObjectId,alt:String,caption:String}],
 introVideoUrl:String,
 learningField:String,learningPath:String,category:String,level:{type:String,enum:['beginner','intermediate','advanced','all-levels'],default:'all-levels'},
 durationMinutes:Number,estimatedWeeks:Number,creditHours:Number,
 prerequisites:[String],tools:[String],skills:[String],learningOutcomes:[String],
 currency:{type:String,default:'USD'},accessType:{type:String,enum:['free','one_time','subscription','membership'],default:'one_time'},price:{type:Number,default:0},salePrice:{type:Number,default:null},accessMonths:{type:Number,min:1,max:120,default:1},pricing:[pricingSchema],
 certificate:String,seoTitle:String,seoDescription:String,
 published:{type:Boolean,default:false},featured:{type:Boolean,default:false},
 archivedAt:{type:Date,default:null},archivedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null}
},{timestamps:true});
schema.index({published:1,featured:-1,createdAt:-1});
schema.index({thumbnailFileId:1});
export default mongoose.models.Course||mongoose.model('Course',schema);
