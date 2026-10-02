'use client';
import {useWebsiteContent,websiteText} from "../../components/WebsiteContent";

import AcademyImage from '../../components/AcademyImage';

import {useEffect,useMemo,useState} from 'react';import PageShell from '../../components/layout/PageShell';import {apiFetch} from '../../lib/api';
const tabs=[['all','All'],['founder','The Founder'],['faculty','Faculty'],['board','Board of Advisors'],['core','Core Team']];
export default function Page(){const website=useWebsiteContent();const[team,setTeam]=useState<any[]>([]),[tab,setTab]=useState('all'),[loading,setLoading]=useState(true);
useEffect(()=>{apiFetch('/content/team').then(d=>setTeam(d.team||[])).catch(()=>setTeam([])).finally(()=>setLoading(false))},[]);
const shown=useMemo(()=>tab==='all'?team:team.filter(x=>x.category===tab),[team,tab]);
return <PageShell kicker={websiteText(website,"team-001","GLOBAL TEAM")} title={websiteText(website,"team-002","Meet the people behind the learning.")} intro={websiteText(website,"team-003","Faculty, advisors and leadership supporting Singh Academy.")}>
<section className="contentWrap teamTabs">{tabs.map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={tab===k?'teamTab active':'teamTab'}>{l}</button>)}</section>
<section className="contentWrap teamStatic">{loading?<div className="emptyState"><b>{websiteText(website,"team-004","Loading team…")}</b></div>:shown.length?shown.map(m=><article className="contentCard" key={m._id||m.slug}><AcademyImage src={m.image||'/images/team/faculty-placeholder.jpg'} onError={e=>{(e.currentTarget as HTMLImageElement).src='/images/team/faculty-placeholder.jpg'}} alt={m.name}/><span className="kicker">{m.category}</span><h3>{m.name}</h3><p><b>{m.role}</b>{m.country?` • ${m.country}`:''}</p><p>{m.bio}</p></article>):<div className="emptyState"><b>{websiteText(website,"team-005","No team members in this category yet.")}</b><p>{websiteText(website,"team-006","New profiles added in the backend will appear here automatically.")}</p></div>}</section></PageShell>}
