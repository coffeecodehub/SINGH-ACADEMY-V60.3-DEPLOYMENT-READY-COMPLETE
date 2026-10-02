'use client';
import {useState} from 'react';
export default function PasswordField({name='password',label='Password',placeholder='Enter your password',minLength}:{name?:string;label?:string;placeholder?:string;minLength?:number}){
 const [show,setShow]=useState(false);return <label>{label}<div style={{display:'flex',alignItems:'center',gap:8}}><input name={name} required type={show?'text':'password'} minLength={minLength} autoComplete={minLength?'new-password':'current-password'} placeholder={placeholder} style={{minWidth:0,flex:1}}/><button type="button" className="backButton" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></div></label>;
}
