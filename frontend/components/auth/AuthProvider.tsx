'use client';
import {createContext,useContext,useEffect,useMemo,useState,useCallback,useRef} from 'react';
import {usePathname} from 'next/navigation';
import {apiFetch,portalForPath,Portal} from '../../lib/api';
type AuthState={user:any;enrollment:any;ready:boolean;setupRequired:boolean;portal:Portal;refresh:()=>Promise<void>;logout:()=>Promise<void>};
const AuthContext=createContext<AuthState>({user:null,enrollment:null,ready:false,setupRequired:false,portal:'student',refresh:async()=>{},logout:async()=>{}});
export function AuthProvider({children}:{children:React.ReactNode}){
 const pathname=usePathname()||'/',portal=portalForPath(pathname),generation=useRef(0);
 const [state,setState]=useState<any>({portal:null,user:null,enrollment:null,ready:false,setupRequired:false});
 const refresh=useCallback(async()=>{const ticket=++generation.current;try{const d=await apiFetch('/auth/session',{headers:{'X-SA-Portal':portal}});if(ticket===generation.current)setState({portal,user:d.user||null,enrollment:d.enrollment||null,ready:true,setupRequired:Boolean(d.setupRequired)});}catch{if(ticket===generation.current)setState({portal,user:null,enrollment:null,ready:true,setupRequired:false});}},[portal]);
 const logout=useCallback(async()=>{await apiFetch('/auth/logout',{method:'POST',headers:{'X-SA-Portal':portal}});generation.current++;setState({portal,user:null,enrollment:null,ready:true,setupRequired:false});},[portal]);
 useEffect(()=>{refresh();const expired=(e:Event)=>{if((e as CustomEvent).detail?.portal===portal){generation.current++;setState({portal,user:null,enrollment:null,ready:true,setupRequired:false});}};const focused=()=>{refresh();};const heartbeat=portal==='student'?null:setInterval(()=>{if(document.visibilityState==='visible')refresh();},5*60*1000);window.addEventListener('sa:session-expired',expired);window.addEventListener('focus',focused);return()=>{generation.current++;if(heartbeat)clearInterval(heartbeat);window.removeEventListener('sa:session-expired',expired);window.removeEventListener('focus',focused);};},[portal,refresh]);
 const value=useMemo(()=>({user:state.portal===portal?state.user:null,enrollment:state.portal===portal?state.enrollment:null,ready:state.portal===portal&&state.ready,setupRequired:state.portal===portal&&state.setupRequired,portal,refresh,logout}),[state,portal,refresh,logout]);
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
