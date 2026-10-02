'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {apiFetch} from '../lib/api';
export type WebsiteConfig={text:Record<string,string>;images:{key:string;src:string;url:string;fileId?:string|null;position?:string}[]};
const empty:WebsiteConfig={text:{},images:[]};
const Context=createContext<WebsiteConfig>(empty);
/** No visible wrapper. Empty configuration is the exact retained public copy and original imagery. */
export function WebsiteContentProvider({children}:{children:ReactNode}){const[value,setValue]=useState<WebsiteConfig>(empty);useEffect(()=>{let active=true;const refresh=()=>apiFetch('/content/site').then(d=>{if(active)setValue(d.content?.websiteContent||empty)}).catch(()=>{});refresh();const focus=()=>{if(document.visibilityState==='visible')refresh();};window.addEventListener('sa-website-content',refresh);window.addEventListener('focus',focus);return()=>{active=false;window.removeEventListener('sa-website-content',refresh);window.removeEventListener('focus',focus);};},[]);return <Context.Provider value={value}>{children}</Context.Provider>;}
export function useWebsiteContent(){return useContext(Context);}
export function websiteText(config:WebsiteConfig,key:string,fallback:string):string{return typeof config.text?.[key]==='string'?config.text[key]:fallback;}
