'use client';
import AcademyImage from '../AcademyImage';

import Link from 'next/link';
import {FormEvent,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {apiFetch} from '../../lib/api';
import {useAuth} from '../auth/AuthProvider';
import PasswordField from '../auth/PasswordField';
import '../../app/auth.css';
export default function AdminLogin({mode}:{mode:'client_admin'|'super_admin'}){
 const router=useRouter(),{user,ready,refresh}=useAuth(),[error,setError]=useState(''),[loading,setLoading]=useState(false),[mfa,setMfa]=useState(false);
 const superMode=mode==='super_admin',destination=superMode?'/super-admin':'/admin';
 useEffect(()=>{if(ready&&user?.role===mode)router.replace(destination);},[ready,user,mode,destination,router]);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setError('');setLoading(true);const f=new FormData(e.currentTarget);try{
  await apiFetch(superMode?'/auth/super-admin/login':'/auth/admin/login',{method:'POST',headers:{'X-SA-Portal':mode},body:JSON.stringify({email:f.get('email'),password:f.get('password'),otp:f.get('otp')||undefined})});
  await refresh();router.replace(destination);
 }catch(e:any){if(e.code==='MFA_REQUIRED')setMfa(true);setError(e.message||'Unable to sign in.');}finally{setLoading(false);}}
 if(!ready)return <main className="authLoading" role="status">Checking this portal’s session…</main>;
 return <main className="authPage"><section className="authVisual"><Link href="/" className="authBrand"><AcademyImage src="/singh-academy-logo-clean.png" alt="Singh Academy"/><b>SINGH ACADEMY</b></Link><div><span>{superMode?'BUILDER TEAM WORKSPACE':'CLIENT ACADEMY WORKSPACE'}</span><h1>{superMode?'Website control. Separate access.':'Your academy. One secure workspace.'}</h1><p>{superMode?'Manage academy content, courses, team and events. Business and customer records are restricted to Client Admin.':'Manage courses, team, events, Academy Plans, subscriptions, learner completions and certificates with a dedicated admin session.'}</p></div></section><section className="authPanel"><form className="authCard" onSubmit={submit}><Link href="/" className="backButton">← Back to website</Link><span className="authKicker">{superMode?'SUPER ADMIN':'CLIENT ADMIN'} · SECURE ACCESS</span><h2>{superMode?'Builder team sign in':'Academy admin sign in'}</h2><p>Only accounts assigned to this portal can sign in.</p><label>Email<input name="email" type="email" required maxLength={254} autoComplete="username" placeholder={superMode?'superadmin@singhacademy.com':'admin@singhacademy.com'}/></label><PasswordField name="password" label="Password"/>{mfa&&<label>Authenticator or recovery code<input name="otp" required autoComplete="one-time-code" spellCheck={false} placeholder="6-digit code or one-use recovery code" maxLength={24}/></label>}{error&&<div className="authError" role="alert">{error}</div>}<button className="authButton" disabled={loading}>{loading?'Checking credentials…':'Open secure workspace →'}</button><p className="authSwitch"><Link href="/login">Student sign in</Link></p><small>Admin recovery: contact your authorized account owner. Student password recovery cannot reset admin accounts.</small></form></section></main>;
}
