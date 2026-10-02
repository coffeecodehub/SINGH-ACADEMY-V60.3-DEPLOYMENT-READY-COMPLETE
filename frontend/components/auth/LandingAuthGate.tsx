 'use client';
import {useEffect} from 'react';import {usePathname,useRouter} from 'next/navigation';import {useAuth} from './AuthProvider';
export default function LandingAuthGate(){
 const {user,ready}=useAuth(),router=useRouter(),pathname=usePathname();
 useEffect(()=>{if(ready&&pathname==='/'&&user?.role==='student')router.replace('/home');},[ready,user,pathname,router]);
 return null;
}
