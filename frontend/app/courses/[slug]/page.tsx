'use client';
import AcademyImage from '../../../components/AcademyImage';

import {useEffect,useState} from 'react';
import {useParams,useRouter} from 'next/navigation';
import BackButton from '../../../components/layout/BackButton';
import SiteHeader from '../../../components/SiteHeader';
import SiteFooter from '../../../components/layout/SiteFooter';
import {apiFetch} from '../../../lib/api';
import {useAuth} from '../../../components/auth/AuthProvider';

/** Existing course detail layout; access checks lead to verified hosted checkout when required. */
export default function CourseDetail(){
 const params=useParams<{slug:string}>(); const router=useRouter(); const {user,ready}=useAuth();
 const[c,setC]=useState<any>(null),[modules,setModules]=useState<any[]>([]),[loading,setLoading]=useState(true),[enrolling,setEnrolling]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{if(!params?.slug)return;apiFetch(`/courses/${params.slug}`).then(d=>{setC(d.course);setModules(d.modules||[])}).catch(()=>{setC(null);setModules([])}).finally(()=>setLoading(false))},[params?.slug]);
 async function openCourse(){if(!ready||enrolling)return;if(!user){router.push(`/login?next=${encodeURIComponent(`/courses/${params.slug}`)}`);return}setEnrolling(true);setMessage('');try{const d=await apiFetch(`/payments/access/${params.slug}`);if(d.hasAccess){if(!d.enrollment)await apiFetch(`/courses/${params.slug}/enroll`,{method:'POST'});router.push(`/learn/${params.slug}`);}else router.push(`/checkout?course=${encodeURIComponent(params.slug)}`);}catch(e:any){setMessage(e.message||'Unable to open this course right now.');}finally{setEnrolling(false)}}
 if(loading)return <main><SiteHeader/><section className="innerHero"><BackButton fallback="/courses" label="Back to Courses"/><h1>Loading course…</h1></section><SiteFooter/></main>;
 if(!c)return <main><SiteHeader/><section className="innerHero"><BackButton fallback="/courses" label="Back to Courses"/><span className="kicker">COURSE</span><h1>Course content coming soon</h1><p>This course does not have published content yet. Once modules and lessons are added in the backend, they will appear here automatically.</p></section><SiteFooter/></main>;
 return <main><SiteHeader/><section className="courseDetailHero"><div className="courseBackRow"><BackButton fallback="/courses" label="Back to Courses"/></div><div><AcademyImage priority className="courseCoverImage" src={c.thumbnail||'/images/courses/course-placeholder.jpg'} alt={c.title}/><span className="kicker">SINGH ACADEMY COURSE</span><h1>{c.title}</h1><p>{c.shortDescription||c.description}</p><div className="courseFacts"><span><b>{c.instructor}</b></span><span>{modules.length} modules</span><span>Videos • readings • reflections • resources</span></div></div><aside className="enrollPanel"><span className="kicker">COURSE ACCESS</span><h3>Choose how you want to access this course.</h3><p>Purchase this course individually, or use an active Academy membership to unlock the complete course library.</p><button className="button" disabled={enrolling} onClick={openCourse}>{enrolling?'Opening course…':'Open / Purchase Course →'}</button>{message&&<div className="noticeCard">{message}</div>}<small>Already enrolled or covered by membership? The course opens directly.</small></aside></section><section className="contentWrap courseCurriculum"><div><span className="kicker">CURRICULUM</span><h2>Course → Modules → Lessons</h2><p>Videos, readings, reflections, journals and assignments are loaded from the backend.</p></div><div className="moduleList">{modules.length?modules.map((m:any,i:number)=><article className="moduleCard" key={m._id||m.title}><div><span>{String(i+1).padStart(2,'0')}</span><h3>{m.title}</h3></div><p>{m.lessons?.length||0} lessons • sequential learning</p></article>):<div className="emptyState"><b>Course content coming soon.</b><p>No module data has been published for this course yet.</p></div>}</div></section><SiteFooter/></main>}
