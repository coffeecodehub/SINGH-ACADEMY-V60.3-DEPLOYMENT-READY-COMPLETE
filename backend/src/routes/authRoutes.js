import {Router} from 'express';
import {register,loginFor,logout,me,forgotPassword,verifyResetOtp,resetPassword,session} from '../controllers/authController.js';
import {requireAuth} from '../middleware/auth.js';
import {rateLimit} from '../middleware/rateLimit.js';
import securityRoutes from './securityRoutes.js';
const r=Router();
r.use('/security',securityRoutes);
r.get('/session',session);r.get('/me',requireAuth,me);r.post('/logout',logout);
r.use(rateLimit('auth-ip',100,900000));
r.post('/register',rateLimit('register-ip',8,3600000),register);
for(const [path,portal] of [['/login','student'],['/admin/login','client_admin'],['/super-admin/login','super_admin']])
 r.post(path,rateLimit('login-account',12,900000,{account:true}),loginFor(portal));
r.post('/forgot-password',rateLimit('forgot-email',5,3600000,{account:true}),forgotPassword);
r.post('/verify-reset-otp',rateLimit('reset-code',10,900000,{account:true}),verifyResetOtp);
r.post('/reset-password',rateLimit('reset-password-ip',10,900000),resetPassword);
export default r;
