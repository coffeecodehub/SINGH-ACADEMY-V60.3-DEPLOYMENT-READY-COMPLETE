import {businessError,escapeRegex,searchTerm,strictDate} from './business.js';
export function subscriptionFilters(query={},now=new Date()){
 const filter={};const status=query.status||'';
 const valid={$expr:{$gt:['$endsAt','$startsAt']}};
 if(status==='active')Object.assign(filter,{status:'active',startsAt:{$lte:now},endsAt:{$gt:now}},valid);
 else if(status==='expiring')Object.assign(filter,{status:'active',startsAt:{$lte:now},endsAt:{$gt:now,$lte:new Date(now.getTime()+7*86400000)}},valid);
 else if(status==='scheduled')Object.assign(filter,{status:'active',startsAt:{$gt:now}},valid);
 else if(status==='expired')filter.$or=[{status:'expired'},{status:'active',endsAt:{$lte:now}}];
 else if(['cancelled','past_due'].includes(status))filter.status=status;
 else if(status)throw businessError('Invalid subscription status.');
 if(query.plan){const plan=searchTerm(query.plan);filter.plan=plan;}
 if(query.from||query.to){const start=query.from?strictDate(query.from,'From date'):null,end=query.to?new Date(strictDate(query.to,'To date').getTime()+86400000):null;if(start&&end&&start>=end)throw businessError('From date must be before the end date.');filter.createdAt={...(start?{$gte:start}:{}),...(end?{$lt:end}:{})};}
 const q=searchTerm(query.q);return {filter,search:q?{$regex:escapeRegex(q),$options:'i'}:null};
}
