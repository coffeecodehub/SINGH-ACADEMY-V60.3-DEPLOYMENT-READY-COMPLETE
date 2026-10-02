const DAY=86400000;
const valid=x=>x!=null&&x!==''&&Number.isFinite(new Date(x).getTime());
export function subscriptionDisplay(term,now=new Date()){
 const at=new Date(now).getTime(),start=valid(term.startsAt)?new Date(term.startsAt).getTime():null,end=valid(term.endsAt)?new Date(term.endsAt).getTime():null;
 const known=start!==null&&end!==null&&end>start;
 const state=term.status==='cancelled'?'cancelled':term.status==='past_due'?'past_due':term.status==='expired'?'expired':(term.status!=='active'||!known)?'needs_review':at>=end?'expired':at<start?'scheduled':'active';
 const durationDays=known?Math.max(1,Math.ceil((end-start)/DAY)):null;
 const remainingDays=!known||state==='needs_review'?null:['cancelled','past_due','expired'].includes(state)?0:state==='scheduled'?durationDays:Math.max(0,Math.ceil((end-at)/DAY));
 const remainingPercent=!known||state==='needs_review'?null:['cancelled','past_due','expired'].includes(state)?0:state==='scheduled'?100:Math.max(0,Math.min(100,(end-at)/(end-start)*100));
 return {effectiveStatus:state,durationDays,remainingDays,remainingPercent,serverNow:new Date(now).toISOString()};
}
