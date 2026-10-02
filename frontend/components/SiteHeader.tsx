'use client';
import AcademyImage from './AcademyImage';

import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useState,MouseEvent} from 'react';
import {useAuth} from './auth/AuthProvider';

const links=[['Home','/home'],['About','/about'],['Courses','/courses'],['Team','/team'],['Reviews','/reviews'],['Academy Plans','/academy'],['Events','/events'],['Contact','/contact']];

/** Single global navbar. Logged-out navigation is authentication-gated without changing the menu structure. */
export default function SiteHeader({landing=false}:{landing?:boolean}){
  const {user,ready,logout}=useAuth();
  // The public landing page intentionally never exposes a stale/private account state.
  const displayUser = landing ? null : user;
  const displayReady = landing ? true : ready;
  const [menu,setMenu]=useState(false);
  const pathname=usePathname();
  const router=useRouter();
  async function signOut(){await logout();router.replace('/');router.refresh()}
  function protectedNavigate(e:MouseEvent<HTMLAnchorElement>,href:string){
    setMenu(false);
    if(!landing && user)return;
    e.preventDefault();
    router.push(`/login?next=${encodeURIComponent(href)}`);
  }
  return <header className="nav">
    <Link className="brand" href={displayUser?'/home':'/'}><span className="logoShell"><AcademyImage src="/singh-academy-logo-clean.png" alt="Singh Academy"/></span><span>SINGH ACADEMY</span></Link>
    <nav className={menu?'open':''}>{links.map(([label,href])=>{
      const active=!landing && pathname===href || (!landing && href!=='/home' && pathname.startsWith(href+'/'));
      return <Link key={href} className={active?'navActive':''} href={displayUser?href:`/login?next=${encodeURIComponent(href)}`} onClick={e=>protectedNavigate(e,href)}>{label}</Link>
    })}{displayReady&&displayUser?.role==='student'&&<Link className={(pathname.startsWith('/my-course')||pathname.startsWith('/learn/'))?'navActive':''} href="/my-course" onClick={()=>setMenu(false)}>My Courses</Link>}{displayReady&&displayUser?.role==='student'&&<Link className={pathname==='/billing'?'navActive':''} href="/billing" onClick={()=>setMenu(false)}>My Billing</Link>}</nav>
    <div className="actions">{!displayReady?<span className="authPlaceholder" aria-label="Checking session"/>:displayUser?<><span className="userChip"><span className="userDot">{String(displayUser.name||'U')[0]}</span><span className="userNameText">{String(displayUser.name).split(' ')[0]}</span></span><button className="authBtn logoutBtn" onClick={signOut}>Logout</button></>:<><Link className="authBtn signInBtn" href="/login">Sign In</Link><Link className="authBtn registerBtn" href="/register">Register</Link></>}
      <button aria-label="Toggle navigation" aria-expanded={menu} className="menuButton" onClick={()=>setMenu(!menu)}>{menu?'×':'☰'}</button>
    </div>
  </header>
}
