'use client';
import {useEffect} from 'react';
export function adminSaved(message:string){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('sa-admin-feedback',{detail:{message}}));}
export default function AdminConfirm({open,title='Confirm update',message='Save these changes?',busy=false,onCancel,onConfirm}:{open:boolean;title?:string;message?:string;busy?:boolean;onCancel:()=>void;onConfirm:()=>void}){
 useEffect(()=>{if(!open)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy)onCancel();};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[open,busy,onCancel]);
 if(!open)return null;
 return <div className="cmsConfirmBackdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onCancel();}}><section className="cmsConfirmCard" role="dialog" aria-modal="true" aria-labelledby="cmsConfirmTitle"><div className="cmsConfirmIcon">✓</div><span className="eyebrow">CONFIRM CHANGES</span><h3 id="cmsConfirmTitle">{title}</h3><p>{message}</p><div className="cmsConfirmActions"><button type="button" className="pill" disabled={busy} onClick={onCancel}>Cancel</button><button type="button" className="primary" disabled={busy} onClick={onConfirm}>{busy?'Saving…':'Confirm & save'}</button></div></section></div>;
}
