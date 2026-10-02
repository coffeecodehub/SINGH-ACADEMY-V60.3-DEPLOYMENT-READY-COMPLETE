/** Money is stored as integer minor units. UTC reporting; access and billing dates stay distinct. */
export const CURRENCIES=['USD','PKR','EUR','GBP','CAD','AUD'];
export const businessError=(message,status=400)=>Object.assign(new Error(message),{status});
export function text(value,label,max=200,min=0){if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)throw businessError(`${label} must contain ${min}–${max} characters.`);return value.trim();}
export function currency(value){const c=typeof value==='string'?value.toUpperCase():'';if(!CURRENCIES.includes(c))throw businessError('Choose USD, PKR, EUR, GBP, CAD or AUD.');return c;}
export function toMinor(value,{allowZero=false}={}){if(!['string','number'].includes(typeof value))throw businessError('Enter a numeric amount.');const s=String(value??'').trim();if(!/^\d{1,9}(\.\d{1,2})?$/.test(s))throw businessError('Enter an amount with at most two decimal places.');const [whole,fraction='']=s.split('.');const n=Number(whole)*100+Number(fraction.padEnd(2,'0'));if(!Number.isSafeInteger(n)||n<(allowZero?0:1))throw businessError('Amount must be greater than zero.');return n;}
export function amountOf(payment){if(Number.isSafeInteger(payment.amountMinor)&&payment.amountMinor>=0)return payment.amountMinor;if(typeof payment.amount==='number'&&Number.isFinite(payment.amount)&&payment.amount>=0){const v=Math.floor(payment.amount*100+0.5);return Number.isSafeInteger(v)?v:null;}return null;}
export function isRecognized(payment){return payment.testMode!==true&&payment.status==='paid'&&amountOf(payment)!==null&&Boolean(payment.verifiedAt)&&(['stripe','paypal'].includes(payment.provider)||(payment.provider==='manual'&&payment.verificationSource==='admin_recorded'));}
export function strictDate(value,label='Date'){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw businessError(`${label} must use YYYY-MM-DD.`);const d=new Date(value+'T00:00:00.000Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)throw businessError(`${label} is invalid.`);return d;}
export function dueDate(value){const d=strictDate(value,'Due date');d.setUTCHours(23,59,59,999);return d;}
export function addMonths(value,months){if(!Number.isFinite(new Date(value).getTime()))throw businessError('Invalid access start date.');if(!Number.isInteger(months)||months<1||months>120)throw businessError('Duration must be 1–120 months.');const d=new Date(value),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d;}
export function afterDays(value,days){if(!Number.isFinite(new Date(value).getTime()))throw businessError('Invalid access start date.');if(!Number.isInteger(days)||days<1||days>36500)throw businessError('Access duration must be 1–36500 days.');return new Date(new Date(value).getTime()+days*86400000);}
export function dateRange(query={},now=new Date()){
 const defaultTo=now.toISOString().slice(0,10),defaultFrom=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-29)).toISOString().slice(0,10);
 const from=strictDate(query.from||defaultFrom,'From date'),last=strictDate(query.to||defaultTo,'To date'),to=new Date(last.getTime()+86400000);
 if(last<from||to-from>366*86400000)throw businessError('Choose a date range of 1–366 days.');
 return {from,to,fromDate:from.toISOString().slice(0,10),toDate:last.toISOString().slice(0,10),timezone:'UTC'};
}
export function pagination(query={}){const page=Number(query.page||1),pageSize=Number(query.pageSize||20);if(!Number.isInteger(page)||page<1||page>100000||!Number.isInteger(pageSize)||pageSize<1||pageSize>100)throw businessError('Invalid page or page size.');return {page,pageSize,skip:(page-1)*pageSize};}
export function escapeRegex(value){return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
export function searchTerm(value){return value==null?'':text(value,'Search',100);}
const validDate=d=>d!=null&&Number.isFinite(new Date(d).getTime());
export function subscriptionState(s,now=new Date()){
 if(s.status==='cancelled')return 'cancelled';
 if(!validDate(s.startsAt)||!validDate(s.endsAt)||new Date(s.endsAt)<=new Date(s.startsAt))return 'needs_review';
 if(s.status==='expired'||new Date(s.endsAt)<=now)return 'expired';
 if(s.status==='past_due')return 'past_due';
 if(new Date(s.startsAt)>now)return 'scheduled';
 return 'active';
}
export function enrollmentState(e,now=new Date()){
 if(e.status==='cancelled')return 'cancelled';
 if(!validDate(e.accessStartsAt)||(e.accessExpiresAt&&!validDate(e.accessExpiresAt)))return 'needs_review';
 if(e.accessExpiresAt&&new Date(e.accessExpiresAt)<=new Date(e.accessStartsAt))return 'needs_review';
 if(e.status==='expired'||(e.accessExpiresAt&&new Date(e.accessExpiresAt)<=now))return 'expired';
 return new Date(e.accessStartsAt)>now?'scheduled':'active';
}
export function invoiceState(i,now=new Date()){
 if(i.status==='void')return 'void';
 if(!Number.isSafeInteger(i.totalMinor)||i.totalMinor<=0||!Number.isSafeInteger(i.paidMinor)||i.paidMinor<0||i.paidMinor>i.totalMinor)return 'needs_review';
 if(i.paidMinor===i.totalMinor)return 'paid';
 if(validDate(i.dueAt)&&new Date(i.dueAt)<now)return 'overdue';
 return i.paidMinor>0?'partial':'open';
}
export function invoiceBalance(i){return i.status==='void'?0:Math.max(0,Number(i.totalMinor||0)-Number(i.paidMinor||0));}
export function daysRemaining(value,now=new Date()){return validDate(value)?Math.ceil((new Date(value)-now)/86400000):null;}
export function csvCell(value){let s=value==null?'':String(value);if(/^[\s]*[=+\-@\t\r]/.test(s)||/^[\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
export function toCsv(headers,rows){return [headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');}
export function requestKey(req){const value=req.get('Idempotency-Key');if(typeof value!=='string'||!/^[-_a-zA-Z0-9]{16,128}$/.test(value))throw businessError('A valid idempotency key is required. Reload the form and try again.');return value;}
export function stableJson(value){if(Array.isArray(value))return '['+value.map(stableJson).join(',')+']';if(value&&typeof value==='object'&&!(value instanceof Date))return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableJson(value[k])).join(',')+'}';return JSON.stringify(value);}
