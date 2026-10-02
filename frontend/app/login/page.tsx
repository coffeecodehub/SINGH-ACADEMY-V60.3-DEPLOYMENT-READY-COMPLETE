'use client';
import AcademyImage from '../../components/AcademyImage';

import Link from 'next/link';
import {FormEvent,useEffect,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import '../auth.css';
import BackButton from '../../components/layout/BackButton';
import PasswordField from '../../components/auth/PasswordField';
import {apiFetch,safeStudentNext} from '../../lib/api';
import {useAuth} from '../../components/auth/AuthProvider';
export default function Login(){
 const router=useRouter(),{refresh,user,ready}=useAuth(),q=useSearchParams();
 const [email,setEmail]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false),[mfa,setMfa]=useState(false);
 useEffect(()=>{if(ready&&user?.role==='student')router.replace('/home');},[ready,user,router]);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setError('');setLoading(true);const f=new FormData(e.currentTarget);try{await apiFetch('/auth/login',{method:'POST',headers:{'X-SA-Portal':'student'},body:JSON.stringify({email,password:f.get('password'),otp:f.get('otp')||undefined})});await refresh();router.replace(safeStudentNext(q.get('next')));}catch(err:any){setError(err.message);if(err.code==='MFA_REQUIRED')setMfa(true);}finally{setLoading(false);}}
 if(!ready||user?.role==='student')return <main className="authLoading" role="status">Checking student session…</main>;
 return <main className="authPage"><section className="authVisual"><Link href="/" className="authBrand"><AcademyImage src="/singh-academy-logo-clean.png" alt="Singh Academy"/><b>SINGH ACADEMY</b></Link><div><span>STUDENT ACCESS</span><h1>Sign in to enroll and start learning.</h1><p>Your learning account is separate from staff and website administration.</p></div></section><section className="authPanel"><form className="authCard" onSubmit={submit}><BackButton fallback="/" label="Back"/><span className="authKicker">STUDENT PORTAL</span><h2>Sign in</h2><label>Email<input name="email" required type="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254} autoComplete="username" placeholder="you@example.com"/></label><PasswordField name="password" label="Password"/>{mfa&&<label>Authenticator or recovery code<input name="otp" required autoComplete="one-time-code" maxLength={24}/></label>}<div className="authRow"><span/><Link href="/forgot-password">Forgot password?</Link></div>{error&&<div className="authError" role="alert">{error}</div>}<button className="authButton" disabled={loading}>{loading?'Signing in…':'Sign in →'}</button><p className="authSwitch">New to Singh Academy? <Link href="/register">Create an account</Link></p></form></section></main>;
}
