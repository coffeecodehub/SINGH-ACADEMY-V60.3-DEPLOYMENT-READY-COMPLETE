import crypto from 'node:crypto';
import StudentNotification from '../models/StudentNotification.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import {subscriptionNotice,inReminderWindow} from '../utils/subscriptionNotifications.js';
import {sendAcademyEmail} from '../utils/mailer.js';
import {frontendOrigin} from '../utils/commerce.js';
const DAY=86400000;
export async function queueSubscriptionConfirmation(term,session){
 const payload=subscriptionNotice(term,'subscription_confirmed');
 // Called in the verified-payment transaction. Retried fulfillment cannot enqueue a second message.
 return StudentNotification.updateOne({dedupeKey:payload.dedupeKey},{$setOnInsert:payload},{upsert:true,session});
}
async function hasRenewal(term){return !!await Subscription.exists({_id:{$ne:term._id},user:term.user,status:'active',testMode:term.testMode===true?true:{$ne:true},startsAt:{$type:'date',$lte:term.endsAt},endsAt:{$type:'date',$gt:term.endsAt}});}
export async function enqueueExpiryReminders(now=new Date()){
 let queued=0,covered=0;
 const filter={status:'active',startsAt:{$lte:now},endsAt:{$gt:now,$lte:new Date(now.getTime()+7*DAY)},...(process.env.NODE_ENV==='production'?{testMode:{$ne:true}}:{})};
 // Cursor bounds memory, not the number of students who may receive a reminder.
 for await(const term of Subscription.find(filter).lean().cursor({batchSize:100})){
  if(!inReminderWindow(term,now))continue;
  const user=await User.exists({_id:term.user,role:'student',status:{$ne:'blocked'}});if(!user)continue;
  if(await hasRenewal(term)){covered++;continue;}
  const payload=subscriptionNotice(term,'subscription_expiring',now);
  try{const result=await StudentNotification.updateOne({dedupeKey:payload.dedupeKey},{$setOnInsert:payload},{upsert:true});if(result.upsertedCount)queued++;}
  catch(error){if(error.code!==11000)throw error;}// Another instance inserted the same unique reminder.
 }
 return {queued,covered};
}
export async function deliverStudentNotifications({now=new Date(),limit=100}={}){
 let claimed=0,sent=0,skipped=0,failed=0;
 for(let i=0;i<Math.min(Math.max(1,limit),200);i++){
  const token=crypto.randomUUID(),at=new Date(now);
  const item=await StudentNotification.findOneAndUpdate({$or:[{emailState:{$in:['queued','deferred']},nextAttemptAt:{$lte:now}},{emailState:'sending',leaseUntil:{$lt:at}}]},{$set:{emailState:'sending',leaseToken:token,leaseUntil:new Date(at.getTime()+300000)},$inc:{attempts:1}},{new:true,sort:{nextAttemptAt:1,_id:1}});
  if(!item)break;claimed++;
  const finish=async data=>StudentNotification.updateOne({_id:item._id,leaseToken:token},{$set:data,$unset:{leaseToken:1,leaseUntil:1}});
  try{
   const [user,term]=await Promise.all([User.findById(item.user).select('email name role status emailVerified').lean(),Subscription.findById(item.subscription).lean()]);
   if(!user||user.role!=='student'||user.status==='blocked'||!term||term.status==='cancelled'||item.testMode){await finish({emailState:'skipped',lastError:item.testMode?'sandbox_record':'account_or_term_unavailable'});skipped++;continue;}
   if(item.type==='subscription_expiring'&&(!inReminderWindow(term,at)||new Date(term.endsAt).getTime()!==new Date(item.termEnd).getTime()||await hasRenewal(term))){await finish({emailState:'skipped',lastError:'reminder_superseded'});skipped++;continue;}
   if(!user.emailVerified){await finish({emailState:'deferred',nextAttemptAt:new Date(at.getTime()+6*3600000),lastError:'email_not_verified'});continue;}
   // Refresh wording after delays: never tell a student '7 days' when only 2 remain.
   const content=subscriptionNotice(term,item.type,at);
   const result=await sendAcademyEmail({to:user.email,subject:content.title,text:`${content.message}\n\nOpen My Billing: ${frontendOrigin()}/billing\n\nSingh Academy`});
   if(!result.dev&&result.rejected?.length)throw new Error('SMTP_REJECTED');
   await finish({title:content.title,message:content.message,emailState:result.dev?'dev_preview':'sent',emailAcceptedAt:result.dev?null:new Date(),lastError:''});sent++;
  }catch(error){failed++;await finish({emailState:item.attempts>=8?'failed':'deferred',nextAttemptAt:new Date(at.getTime()+Math.min(24*3600000,60000*2**Math.min(item.attempts,10))),lastError:'email_delivery_not_confirmed'});}
 }
 return {claimed,sent,skipped,failed};
}
let running=null;
export function runStudentNotificationCycle(){
 if(running)return running;
 running=(async()=>({reminders:await enqueueExpiryReminders(),delivery:await deliverStudentNotifications()}))().finally(()=>{running=null;});return running;
}
export function startStudentNotificationWorker(){
 if(process.env.STUDENT_NOTIFICATIONS_ENABLED==='false')return async()=>{};
 const tick=()=>runStudentNotificationCycle().then(result=>{if(result.reminders.queued||result.delivery.claimed)console.log(JSON.stringify({event:'student_notifications',...result}));}).catch(()=>console.error(JSON.stringify({event:'student_notifications_failed',message:'Check database and mail configuration.'})));
 const timer=setInterval(tick,15*60000);timer.unref();void tick();
 return async()=>{clearInterval(timer);if(running)await running;};
}
