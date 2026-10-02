'use client';
import {useWebsiteContent,websiteText} from '../../components/WebsiteContent';
import {useState} from 'react';
import PageShell from '../../components/layout/PageShell';
import {apiFetch} from '../../lib/api';

const fallbackEmail=process.env.NEXT_PUBLIC_CONTACT_EMAIL||'singh@singhacademy.com';
const fallbackPhone=process.env.NEXT_PUBLIC_CONTACT_PHONE||'+1 (559) 308 1249';
const fallbackLocation=process.env.NEXT_PUBLIC_CONTACT_LOCATION||'By appointment · USA';
const fallbackMapUrl=process.env.NEXT_PUBLIC_CONTACT_MAP_URL||'';
const telHref=(value:string)=>'tel:'+value.replace(/[^+\d]/g,'');
export default function Contact(){
 const website=useWebsiteContent();
 const contactEmail=websiteText(website,'contact-009',fallbackEmail).trim(),contactPhone=websiteText(website,'contact-010',fallbackPhone).trim(),contactLocation=websiteText(website,'contact-011',fallbackLocation).trim(),contactMapUrl=websiteText(website,'contact-012',fallbackMapUrl).trim();
 const mapHref=contactLocation?(contactMapUrl||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactLocation)}`):'';
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(busy)return;const form=e.currentTarget,values=new FormData(form);setBusy(true);setError('');setSuccess('');try{const d=await apiFetch('/contact',{method:'POST',body:JSON.stringify(Object.fromEntries(values.entries()))});setSuccess(d.message||'Your message has been sent to the Academy team.');form.reset();}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 return <PageShell kicker={websiteText(website,'contact-001','CONTACT')} title={websiteText(website,'contact-002','Start a conversation with Singh Academy.')} intro={websiteText(website,'contact-003','Questions about courses, Academy access, certificates or professional learning? Send a message and the Academy team can follow up.')}>
  <section className="contentWrap contactProGrid">
   <aside className="contactIntroCard">
    <span className="kicker">HOW WE CAN HELP</span>
    <h2>Talk to the right team.</h2>
    <p>Use this form for learner support, course questions, Academy Plans, events, certificate support or professional-learning enquiries.</p>
    {(contactEmail||contactPhone||contactLocation)&&<div className="contactDirect">
      {contactEmail&&<a href={`mailto:${contactEmail}`}><span>✉</span><div><small>Email</small><b>{contactEmail}</b></div></a>}
      {contactPhone&&<a href={telHref(contactPhone)}><span>☎</span><div><small>Call</small><b>{contactPhone}</b></div></a>}
      {contactLocation&&<a href={mapHref} target="_blank" rel="noopener noreferrer"><span>⌖</span><div><small>Location</small><b>{contactLocation}</b></div></a>}
    </div>}
    <div className="contactReasonList">
     <div><span>01</span><div><b>Courses & Academy Plans</b><small>Course access, subscriptions and learning-path questions.</small></div></div>
     <div><span>02</span><div><b>Learner & certificate support</b><small>Progress, course review and certificate-related questions.</small></div></div>
     <div><span>03</span><div><b>Events & professional learning</b><small>Workshops, speaking engagements and Academy events.</small></div></div>
    </div>
    <div className="contactPrivacy"><b>Private by default</b><p>Your message is stored for the Academy team and is not posted publicly.</p></div>
   </aside>
   <form className="formCard contactProForm" onSubmit={submit}>
    <div className="contactFormHead"><span className="kicker">SEND A MESSAGE</span><h2>Tell us how we can help.</h2><p>Share enough detail for the Academy team to understand your question.</p></div>
    <div className="contactFormGrid">
     <label htmlFor="contactName">{websiteText(website,'contact-004','Name')}<input id="contactName" name="name" autoComplete="name" minLength={2} maxLength={120} required placeholder="Your full name"/></label>
     <label htmlFor="contactEmail">{websiteText(website,'contact-005','Email')}<input id="contactEmail" name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com"/></label>
     <label className="wide" htmlFor="contactTopic">Topic<select id="contactTopic" name="topic" defaultValue="Course / Academy access"><option>Course / Academy access</option><option>Learner support</option><option>Certificate support</option><option>Events / workshops</option><option>General enquiry</option></select></label>
     <label className="wide" htmlFor="contactMessage">{websiteText(website,'contact-006','Message')}<textarea id="contactMessage" name="message" minLength={10} maxLength={4000} required placeholder="Write your message here…"/></label>
    </div>
    <div style={{position:'absolute',left:'-10000px'}} aria-hidden="true"><label>{websiteText(website,'contact-007','Leave this empty')}<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
    {error&&<div className="authError" role="alert">{error}</div>}{success&&<div className="authSuccess" role="status">✓ {success}</div>}
    <div className="contactSubmitRow"><button className="button" disabled={busy}>{busy?'Sending message…':'Send message →'}</button><small>{websiteText(website,'contact-008','Your details are shared with the Academy team to respond to this message.')}</small></div>
   </form>
  </section>
 </PageShell>;
}
