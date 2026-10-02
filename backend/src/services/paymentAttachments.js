import PaymentAttachment from '../models/PaymentAttachment.js';import Payment from '../models/Payment.js';import User from '../models/User.js';
import {businessError} from '../utils/business.js';import {objectId} from './businessRead.js';import {transaction} from './businessWrite.js';
export async function prepareReceiptUpload(req,res,next){
 try{
  const paymentId=objectId(req.params.id),owner={user:req.user._id,payment:paymentId};
  if(!await Payment.exists({_id:paymentId,user:req.user._id,status:'paid'}))throw businessError('A paid receipt on your own account is required.',404);
  if(await PaymentAttachment.countDocuments(owner)>=3||await PaymentAttachment.countDocuments({user:req.user._id})>=100)throw businessError('Receipt image limit reached (3 per payment, 100 per account). Remove an old attachment first.',429);
  req.paymentReceiptUpload=owner;
  req.onUploadStored=async file=>transaction(async session=>{
   const user=await User.findOneAndUpdate({_id:req.user._id,role:'student',status:{$ne:'blocked'}},{$inc:{commerceVersion:1}},{session,new:true});if(!user)throw businessError('Student account is unavailable.',403);
   if(!await Payment.exists({_id:paymentId,user:user._id,status:'paid'}).session(session))throw businessError('Payment receipt is unavailable.',404);
   if(await PaymentAttachment.countDocuments(owner).session(session)>=3||await PaymentAttachment.countDocuments({user:user._id}).session(session)>=100)throw businessError('Receipt image limit reached.',429);
   await PaymentAttachment.create([{...owner,...file}],{session});
  });next();
 }catch(error){next(error);}
}
