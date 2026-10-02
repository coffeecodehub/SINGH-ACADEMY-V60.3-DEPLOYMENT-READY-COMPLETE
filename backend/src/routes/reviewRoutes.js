import {Router} from 'express';import {listReviews,createReview} from '../controllers/reviewController.js';import {requireAuth,requireRole} from '../middleware/auth.js';
import {rateLimit} from '../middleware/rateLimit.js';
const r=Router();r.get('/',listReviews);r.post('/',requireAuth,requireRole('student'),rateLimit('student-review',5,3600000,{authenticated:true}),createReview);export default r;
