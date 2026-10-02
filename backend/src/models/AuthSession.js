import mongoose from 'mongoose';
const schema=new mongoose.Schema({tokenHash:{type:String,required:true,unique:true},user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 portal:{type:String,enum:['student','client_admin','super_admin'],required:true},tokenVersion:{type:Number,required:true},
 expiresAt:{type:Date,required:true},lastSeenAt:{type:Date,required:true},revokedAt:{type:Date,default:null},
 setupOnly:{type:Boolean,default:false},userAgent:{type:String,maxlength:200},networkId:String
},{timestamps:true});
schema.index({expiresAt:1},{expireAfterSeconds:0});
export default mongoose.models.AuthSession||mongoose.model('AuthSession',schema);
