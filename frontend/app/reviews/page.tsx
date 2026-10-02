'use client';
import {useWebsiteContent,websiteText} from "../../components/WebsiteContent";

import {FormEvent,useEffect,useMemo,useState} from 'react';
import PageShell from '../../components/layout/PageShell';
import {apiFetch} from '../../lib/api';
import {useAuth} from '../../components/auth/AuthProvider';
import Link from 'next/link';
const originals:any[]=[];
export default function Page(){const website=useWebsiteContent();
 const{user}=useAuth(); const[reviews,setReviews]=useState<any[]>([]),[rating,setRating]=useState(5),[message,setMessage]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false),[loadError,setLoadError]=useState('');
 useEffect(()=>{apiFetch('/reviews').then(d=>setReviews(d.reviews||[])).catch(()=>setLoadError('Reviews are temporarily unavailable. Please try again shortly.'))},[]);
 const all=useMemo(()=>[...originals,...reviews],[reviews]);
 const average=all.length?(all.reduce((s:any,r:any)=>s+Number(r.rating||5),0)/all.length).toFixed(1):'—';
 async function submit(e:FormEvent){e.preventDefault();if(busy)return;setBusy(true);setFailed(false);setStatus('');try{const d=await apiFetch('/reviews',{method:'POST',body:JSON.stringify({rating,message})});if(d.review)setReviews(prev=>[d.review,...prev.filter((r:any)=>String(r._id)!==String(d.review._id))]);setStatus(d.message||'Your review is now published.');setMessage('');setRating(5);}catch(x:any){setFailed(true);setStatus(x.message);}finally{setBusy(false);}}

 return <PageShell kicker={websiteText(website,"reviews-001","REVIEWS")} title={websiteText(website,"reviews-002","What learners and colleagues say.")} intro={websiteText(website,"reviews-003","Learner testimonials and feedback.")} backLabel="Back">
  <section className="contentWrap reviewTop">{loadError&&<div className="authError" role="alert">{loadError}</div>}
   <div className="ratingSummary"><span className="kicker">{websiteText(website,"reviews-004","COMMUNITY RATING")}</span><div><strong>{average}</strong><span>/ 5</span></div><div className="ratingStars" aria-label={all.length?`${average} out of five stars`:"No ratings yet"}>{all.length?'★'.repeat(Math.round(Number(average))):'No ratings yet'}</div><p>{websiteText(website,"reviews-006","Based on ")}{all.length}{websiteText(website,"reviews-007"," learner reviews")}</p></div>
   <div className="reviewSubmitCard"><div className="sectionHead compact"><div><span className="kicker">{websiteText(website,"reviews-008","YOUR FEEDBACK")}</span><h2>{websiteText(website,"reviews-009","Share your Singh Academy experience")}</h2></div></div>
    {user?<form className="reviewForm" onSubmit={submit}><label>{websiteText(website,"reviews-010","Your rating")}<div className="starPicker" role="radiogroup" aria-label="Rating out of five">{[1,2,3,4,5].map(n=><button type="button" role="radio" aria-checked={rating===n} key={n} className={n<=rating?'starOn':''} onClick={()=>setRating(n)} aria-label={`${n} stars`}>★</button>)}</div></label><label>{websiteText(website,"reviews-012","Review")}<textarea value={message} onChange={e=>setMessage(e.target.value)} minLength={10} maxLength={2000} required placeholder="Tell us about your learning experience…"/></label><button className="button reviewSubmitBtn" type="submit" disabled={busy}>{busy?'Submitting…':'Submit Review →'}</button>{status&&<div className="reviewToast" role={failed?'alert':'status'}><span>{failed?'!':'✓'}</span><div><b>{failed?'Review not submitted':'Review submitted'}</b><small>{status}</small></div></div>}<small>{websiteText(website,"reviews-013","Your review is published after submission.")}</small></form>:<div className="emptyState"><p>{websiteText(website,"reviews-014","Please sign in before submitting a review.")}</p><Link className="button" href="/login?next=/reviews">{websiteText(website,"reviews-015","Sign In to Review →")}</Link></div>}
   </div>
  </section>
  <section className="contentWrap reviewFull">{all.map((r:any,i)=><blockquote key={r._id||`${r.name}-${i}`}><div className="reviewStars">{'★'.repeat(Number(r.rating||5))}</div>“{r.message}”<footer>{r.name}</footer></blockquote>)}</section>
 </PageShell>
}
