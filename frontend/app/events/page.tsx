'use client';
import {useWebsiteContent,websiteText} from "../../components/WebsiteContent";

import AcademyImage from '../../components/AcademyImage';

import {useEffect,useState} from 'react';
import PageShell from '../../components/layout/PageShell';
import {apiFetch} from '../../lib/api';
export default function Page(){const website=useWebsiteContent();
  const [events,setEvents]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  async function load(){setLoading(true);setError('');try{const d=await apiFetch('/content/events');setEvents(d.events||[])}catch(e:any){setError(e.message)}finally{setLoading(false)}}
  useEffect(()=>{load()},[]);
  return <PageShell kicker={websiteText(website,"events-001","EVENTS")} title={websiteText(website,"events-002","Live learning and Academy conversations.")} intro={websiteText(website,"events-003","Explore Academy sessions, discussions and professional learning events.")}><section className="contentWrap contentGrid">{loading?<p>{websiteText(website,"events-004","Loading events…")}</p>:error?<div className="emptyState"><p>{error}</p><button className="button" onClick={load}>{websiteText(website,"events-005","Retry")}</button></div>:!events.length?<div className="emptyState"><h3>{websiteText(website,"events-006","No published events yet.")}</h3><p>{websiteText(website,"events-007","New Academy events will appear here when they are announced.")}</p></div>:events.map(event=><article className="contentCard" id={event.slug} key={event._id}>{event.image&&<AcademyImage src={event.image} alt={event.title} style={{width:'100%',height:220,objectFit:'cover',borderRadius:12}}/>}<span className="kicker">{event.date&&new Date(event.date).getTime()<Date.now()?'PAST EVENT':'ACADEMY EVENT'}</span><h3>{event.title}</h3>{event.date&&<p><time dateTime={event.date}>{new Date(event.date).toLocaleString(undefined,{dateStyle:'long',timeStyle:'short'})}</time></p>}{event.location&&<p><b>{event.location}</b></p>}<p style={{whiteSpace:'pre-wrap'}}>{event.description}</p>{event.mapUrl&&<a className="button" href={event.mapUrl} target="_blank" rel="noopener noreferrer">{websiteText(website,"events-008","View location ↗")}</a>}</article>)}</section></PageShell>;
}
