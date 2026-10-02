export const DAY=86400000;
export function inReminderWindow(term,now=new Date()){
 if(!term.startsAt||!term.endsAt||!now)return false;
 const start=new Date(term.startsAt).getTime(),end=new Date(term.endsAt).getTime(),at=new Date(now).getTime();
 return term.status==='active'&&Number.isFinite(start)&&Number.isFinite(end)&&end>start&&start<=at&&end>at&&end-at<=7*DAY;
}
export function coversRenewal(term,next){
 if(!term.endsAt||!next.startsAt||!next.endsAt)return false;
 const end=new Date(term.endsAt).getTime(),start=new Date(next.startsAt).getTime(),until=new Date(next.endsAt).getTime();
 return String(next._id)!==String(term._id)&&String(next.user)===String(term.user)&&next.status==='active'&&Boolean(next.testMode)===Boolean(term.testMode)&&Number.isFinite(start)&&Number.isFinite(until)&&start<=end&&until>end;
}
export function subscriptionNotice(term,type,now=new Date()){
 if(!['subscription_confirmed','subscription_expiring'].includes(type))throw new Error('Invalid subscription notification type.');
 if(!term.startsAt||!term.endsAt||!now)throw new Error('Subscription dates need review.');
 const date=x=>new Date(x).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'});
 const end=new Date(term.endsAt),start=new Date(term.startsAt),at=new Date(now);if(!Number.isFinite(end.getTime())||!Number.isFinite(start.getTime())||!Number.isFinite(at.getTime())||end<=start)throw new Error('Subscription dates need review.');
 const plan=String(term.plan||'Academy membership').slice(0,200),days=Math.max(0,Math.ceil((end-at)/DAY));
 const prefix=term.testMode?'Sandbox — ':'';
 return {user:term.user,subscription:term._id,dedupeKey:`${type}:${term._id}`+(type==='subscription_expiring'?':'+end.toISOString():''),type,plan,termEnd:end,testMode:term.testMode===true,
  title:prefix+(type==='subscription_confirmed'?'Congratulations! Your subscription is confirmed.':`Your subscription expires in ${days} ${days===1?'day':'days'}.`),
  message:type==='subscription_confirmed'?`${plan} has been purchased successfully. Your access ${start>at?'starts':'started'} on ${date(start)} and ends on ${date(end)} (UTC). View your plan, invoice and receipt in My Billing.`:`Your ${plan} access ends on ${date(end)} (UTC). ${days} ${days===1?'day remains':'days remain'}. Renew from My Billing to continue learning. This reminder does not charge your card.`,
  link:'/billing?section=plans',emailState:'queued',nextAttemptAt:at};
}
