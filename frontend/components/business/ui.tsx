'use client';
import {useEffect,useId,useRef} from 'react';
export type Row=Record<string,any>;
export function Icon({name,size=20}:{name:string;size?:number}){
 const paths:Record<string,React.ReactNode>={
  overview:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  users:<><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5"/></>,
  subscription:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-14 5 3 3 6-6"/></>,
  invoice:<><path d="M5 3h14v19l-3-2-4 2-4-2-3 2zM8 7h8M8 11h8M8 15h5"/></>,
  payment:<><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/></>,
  course:<><path d="M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3zM12 6v16M6 8h3m6 0h3"/></>,
  report:<><path d="M3 3v18h18M7 16v-4m5 4V7m5 9v-7"/><path d="m5 8 4-3 4 2 7-4"/></>,
  activity:<><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
  bell:<><path d="M18 8a6 6 0 0 0-12 0c0 8-3 8-3 10h18c0-2-3-2-3-10M9 21h6"/></>,
  shield:<><path d="m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5zM8 12l3 3 5-6"/></>,
  event:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2m-8 3h2"/></>,
  star:<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>,
  menu:<path d="M3 6h18M3 12h18M3 18h18"/>,close:<path d="m6 6 12 12M6 18 18 6"/>,
  arrow:<path d="M5 12h14m-6-6 6 6-6 6"/>,external:<><path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/></>,
  download:<><path d="M12 3v12m-5-5 5 5 5-5M3 16v5h18v-5"/></>,refresh:<><path d="M20 8A8 8 0 1 0 21 14M20 3v5h-5"/></>,
  search:<><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,edit:<><path d="M4 20h4L20 8l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></>,plus:<path d="M12 5v14M5 12h14"/>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,check:<path d="m5 12 4 4L19 6"/>,
  logout:<><path d="M10 3H4v18h6m4-5 5-4-5-4m-5 4h10"/></>,money:<><circle cx="12" cy="12" r="10"/><path d="M16 7H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H8m4-15v18"/></>,
  help:<><circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 1c0 2-3 2-3 5m0 3h.01"/></>
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.overview}</svg>;
}
export function money(value:any,currency='USD'){if(value==null||typeof value!=='number'||!Number.isFinite(value))return 'Not recorded';try{return new Intl.NumberFormat('en-US',{style:'currency',currency:currency.toUpperCase(),minimumFractionDigits:2,maximumFractionDigits:2}).format(value/100);}catch{return `${currency} ${(value/100).toFixed(2)}`;}}
export function day(value:any,fallback='Not recorded'){if(!value||!Number.isFinite(new Date(value).getTime()))return fallback;return new Intl.DateTimeFormat('en-US',{month:'short',day:'2-digit',year:'numeric',timeZone:'UTC'}).format(new Date(value));}
export function stamp(value:any,fallback='Not recorded'){if(!value||!Number.isFinite(new Date(value).getTime()))return fallback;return new Intl.DateTimeFormat('en-US',{month:'short',day:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).format(new Date(value))+' UTC';}
export function isoDay(value:any=new Date()){return value&&Number.isFinite(new Date(value).getTime())?new Date(value).toISOString().slice(0,10):'';}
export const human=(value:any)=>String(value||'unknown').replace(/[._]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
export function customerId(row:Row){return typeof row.user==='string'?row.user:row.user?._id||(['student'].includes(row.role)?row._id:null);}
export function Badge({value,label}:{value:any;label?:string}){return <span className={'bizBadge bizBadge-'+String(value||'unknown').replace(/[^a-z_]/g,'')}>{label||human(value)}</span>;}
export function Empty({title='No records yet',description='Records will appear here when real activity is recorded.',action}:{title?:string;description?:string;action?:React.ReactNode}){return <div className="bizEmpty"><span className="bizEmptyIcon"><Icon name="invoice" size={28}/></span><h3>{title}</h3><p>{description}</p>{action}</div>;}
export function Loading(){return <div className="bizLoading" role="status"><span className="bizSpinner"/>Loading current records…</div>;}
export function Notice({children,error=false}:{children:React.ReactNode;error?:boolean}){return <div className={error?'bizNotice bizNoticeError':'bizNotice'} role={error?'alert':'status'}><Icon name={error?'help':'shield'} size={18}/><div>{children}</div></div>;}
export function Metric({title,value,note,icon='report',accent=false}:{title:string;value:React.ReactNode;note:string;icon?:string;accent?:boolean}){return <article className={'bizMetric'+(accent?' bizMetricAccent':'')}><div className="bizMetricTop"><span>{title}</span><i><Icon name={icon}/></i></div><strong>{value}</strong><small>{note}</small></article>;}
export function Dialog({title,subtitle,onClose,children,wide=false,busy=false}:{title:string;subtitle?:string;onClose:()=>void;children:React.ReactNode;wide?:boolean;busy?:boolean}){
 const ref=useRef<HTMLDialogElement>(null),id=useId();useEffect(()=>{ref.current?.showModal();const d=ref.current;return()=>{d?.close();};},[]);
 return <dialog ref={ref} className={'bizModal'+(wide?' bizModalWide':'')} aria-labelledby={id} onCancel={e=>{e.preventDefault();if(!busy)onClose();}} onClick={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}><div className="bizModalHead"><div><h2 id={id}>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button type="button" className="bizIconButton" aria-label="Close dialog" onClick={onClose} disabled={busy}><Icon name="close"/></button></div><div className="bizModalBody">{children}</div></dialog>;
}
export function ActionSelect({label='Actions',items,onChoose}:{label?:string;items:{value:string;label:string;disabled?:boolean}[];onChoose:(value:string)=>void}){return <select className="bizActionSelect" aria-label={label} value="" onChange={e=>{if(e.target.value)onChoose(e.target.value);}}><option value="">{label}…</option>{items.map(item=><option key={item.value} value={item.value} disabled={item.disabled}>{item.label}</option>)}</select>;}
export function Person({row,onOpen}:{row:Row;onOpen:(id:string)=>void}){
 const user=row.user&&typeof row.user==='object'?row.user:row,id=customerId(row)|| (row.role==='student'?row._id:null),name=user.name||'Unknown customer';
 return <div className="bizPerson"><span className="bizAvatar">{name.charAt(0).toUpperCase()}</span><div>{id?<button className="bizTextButton" onClick={()=>onOpen(String(id))}>{name}</button>:<b>{name}</b>}<small>{user.email||'No customer record'}</small></div></div>;
}
export function TrendChart({data,currency}:{data:Row[];currency:string}){
 if(!data?.length)return <Empty title="No period selected"/>;
 const max=Math.max(1,...data.flatMap(d=>[d.grossMinor,d.refundMinor])),w=740,h=222,l=72,r=18,t=18,b=32;
 const x=(i:number)=>l+(w-l-r)*(data.length===1?0.5:i/(data.length-1)),y=(n:number)=>h-b-(h-b-t)*(n/max);
 const path=(key:string)=>data.map((d,i)=>`${i?'L':'M'} ${x(i).toFixed(1)} ${y(d[key]||0).toFixed(1)}`).join(' ');
 const indices=Array.from(new Set([0,Math.floor((data.length-1)/2),data.length-1]));
 return <div className="bizChart"><div className="bizLegend"><span><i className="bizLegendGross"/>Gross collections</span><span><i className="bizLegendRefund"/>Refunds recorded</span><small>{currency} · UTC</small></div><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Daily recorded collections and refunds in ${currency}. Detailed values are available in the daily report table and CSV.`}>{[0,0.25,0.5,0.75,1].map(n=><g key={n}><line className="bizChartGrid" x1={l} x2={w-r} y1={y(max*n)} y2={y(max*n)}/><text className="bizChartLabel" x={l-10} y={y(max*n)+4} textAnchor="end">{new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(max*n/100)}</text></g>)}<path className="bizChartArea" d={`${path('grossMinor')} L ${x(data.length-1)} ${y(0)} L ${x(0)} ${y(0)} Z`}/><path className="bizChartGross" d={path('grossMinor')}/><path className="bizChartRefund" d={path('refundMinor')}/>{indices.map(i=><text key={i} className="bizChartLabel" x={x(i)} y={h-7} textAnchor={i===0?'start':i===data.length-1?'end':'middle'}>{day(data[i].date).replace(/, \d{4}/,'')}</text>)}</svg>{data.every(d=>!d.grossMinor&&!d.refundMinor)&&<p className="bizChartEmpty">No recognized collections or refunds in this period.</p>}</div>;
}
