import Review from '../models/Review.js';
import {text,businessError} from '../utils/business.js';
export async function listReviews(req,res){
 const reviews=await Review.find({status:'approved'}).select('name rating message createdAt updatedAt').sort({updatedAt:-1,createdAt:-1}).limit(100).lean();
 res.set('Cache-Control','no-store');
 res.json({success:true,reviews});
}
export async function createReview(req,res){
 const rating=Number(req.body?.rating),message=text(req.body?.message,'Review',2000,10);
 if(!Number.isInteger(rating)||rating<1||rating>5)throw businessError('Choose a rating from 1 to 5.');
 const existing=await Review.findOne({user:req.user._id}).sort({updatedAt:-1,createdAt:-1});let review;
 if(existing){existing.name=req.user.name;existing.rating=rating;existing.message=message;existing.status='approved';review=await existing.save();}
 else review=await Review.create({user:req.user._id,name:req.user.name,rating,message,status:'approved'});
 const publicReview={_id:review._id,name:review.name,rating:review.rating,message:review.message,status:'approved',createdAt:review.createdAt,updatedAt:review.updatedAt};
 res.set('Cache-Control','no-store');
 res.status(201).json({success:true,message:'Thank you. Your review is now published.',review:publicReview});
}
