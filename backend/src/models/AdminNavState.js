import mongoose from 'mongoose';
const schema=new mongoose.Schema({
 user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,unique:true,index:true},
 studentsSeenAt:{type:Date,default:null},
 formsSeenAt:{type:Date,default:null},
 reviewsSeenAt:{type:Date,default:null},
 subscriptionsSeenAt:{type:Date,default:null},
 certificatesSeenAt:{type:Date,default:null},
 notificationsSeenAt:{type:Date,default:null}
},{timestamps:true});
export default mongoose.models.AdminNavState||mongoose.model('AdminNavState',schema);
