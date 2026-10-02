'use client';
import {useRouter} from 'next/navigation';
export default function BackButton({fallback='/home',label='Back'}:{fallback?:string;label?:string}){const router=useRouter();return <button className="pageBack" onClick={()=>{if(window.history.length>1)router.back();else router.push(fallback)}}>← {label}</button>}
