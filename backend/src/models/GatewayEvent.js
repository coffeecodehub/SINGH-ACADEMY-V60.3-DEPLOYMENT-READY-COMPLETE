import mongoose from 'mongoose';
// Only a verified, successfully handled event is recorded. No raw payment/card payload is stored.
const schema=new mongoose.Schema({key:{type:String,required:true,unique:true},provider:{type:String,enum:['stripe','paypal'],required:true},eventType:String,order:{type:mongoose.Schema.Types.ObjectId,ref:'CheckoutOrder'},processedAt:{type:Date,default:Date.now}},{timestamps:true});
export default mongoose.models.GatewayEvent||mongoose.model('GatewayEvent',schema);
