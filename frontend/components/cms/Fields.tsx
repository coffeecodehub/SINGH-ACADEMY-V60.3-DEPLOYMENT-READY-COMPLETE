'use client';
import AcademyImage from '../AcademyImage';
import CropMediaField from './CropMediaField';

import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {API_URL,requestHeaders,portalMediaUrl,portalMediaDownloadUrl} from '../../lib/api';
export type RecordData = Record<string,any>;
export const UploadContext=createContext<(delta:number)=>void>(()=>{});
export function clean(value:RecordData){const {_id,__v,createdAt,updatedAt,module,course,...body}=value;return body;}
export function Field({label,value,onChange,type='text',wide=false,options,disabled=false,min,step,placeholder}:any){
  return <label className={wide?'wide':''}>{label}{options?<select className="field" disabled={disabled} value={value??''} onChange={e=>onChange(e.target.value)}>{options.map((x:any)=>{const [v,t]=Array.isArray(x)?x:[x,x];return <option key={v} value={v}>{t}</option>})}</select>:type==='textarea'?<textarea className="field tall" placeholder={placeholder} value={value??''} disabled={disabled} onChange={e=>onChange(e.target.value)}/>:<input className="field" placeholder={placeholder} type={type} value={value??''} min={min} step={step} disabled={disabled} onChange={e=>onChange(type==='number'?(e.target.value===''?'':Number(e.target.value)):e.target.value)}/>}</label>;
}
export function Check({label,checked,onChange}:any){return <label className="check"><input type="checkbox" checked={Boolean(checked)} onChange={e=>onChange(e.target.checked)}/>{label}</label>}
export function useDirty(value:any,onDirty?:((dirty:boolean)=>void),blocking=false){
  const [saved,setSaved]=useState(()=>JSON.stringify(value));
  const dirty=JSON.stringify(value)!==saved||blocking;
  useEffect(()=>{onDirty?.(dirty);return ()=>onDirty?.(false)},[dirty,onDirty]);
  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return ()=>window.removeEventListener('beforeunload',warn)},[dirty]);
  return {dirty,markSaved:(next:any)=>setSaved(JSON.stringify(next)),mayClose:()=>!dirty||window.confirm('Discard unsaved changes?')};
}
export function MediaField({label='Image',url='',fileId=null,onChange,kind='image',cropEnabled=false,originalUrl='',originalFileId=null,imageEdit=null}:any){
  const notify=useContext(UploadContext),[busy,setBusy]=useState(false),[error,setError]=useState(''),[local,setLocal]=useState(''),[progress,setProgress]=useState(0);
  const alive=useRef(true),abort=useRef<AbortController|null>(null),xhrRef=useRef<XMLHttpRequest|null>(null);
  useEffect(()=>{alive.current=true;return ()=>{alive.current=false;abort.current?.abort();xhrRef.current?.abort()}},[]);
  useEffect(()=>()=>{if(local)URL.revokeObjectURL(local)},[local]);
  async function upload(file:File){
    const limit=kind==='image'?10*1024*1024:250*1024*1024;
    if(file.size>limit){setError(`Maximum file size: ${kind==='image'?'10':'250'} MB.`);return}
    if(kind==='image'&&!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)){setError('Use a JPG, PNG, WebP or GIF image.');return}
    setError('');setBusy(true);setProgress(0);notify(1);if(kind==='image')setLocal(URL.createObjectURL(file));abort.current=new AbortController();
    let heartbeat:ReturnType<typeof setInterval>|null=null;
    try{
      const body=new FormData();body.append('file',file);
      // Keep the admin session active during large uploads. This request is deliberately separate from the upload stream.
      heartbeat=setInterval(()=>{fetch(`${API_URL}/auth/session`,{credentials:'include',headers:requestHeaders(),cache:'no-store'}).catch(()=>{});},4*60*1000);
      const d:any=await new Promise((resolve,reject)=>{
        const xhr=new XMLHttpRequest();xhrRef.current=xhr;xhr.open('POST',`${API_URL}/admin/upload`);xhr.withCredentials=true;xhr.timeout=30*60*1000;
        requestHeaders({method:'POST',body}).forEach((v,k)=>xhr.setRequestHeader(k,v));
        xhr.upload.onprogress=e=>{if(alive.current&&e.lengthComputable)setProgress(Math.max(1,Math.min(99,Math.round(e.loaded/e.total*100))));};
        xhr.onload=()=>{let data:any={};try{data=xhr.responseText?JSON.parse(xhr.responseText):{};}catch{return reject(new Error('The upload server returned an invalid response.'));}if(xhr.status<200||xhr.status>=300)return reject(new Error(data.message||`Upload failed (${xhr.status}).`));resolve(data);};
        xhr.onerror=()=>reject(new Error('Upload connection failed. Check your network and try again.'));
        xhr.ontimeout=()=>reject(new Error('Upload timed out after 30 minutes. Use a smaller optimized video or a hosted video URL.'));
        xhr.onabort=()=>reject(Object.assign(new Error('Upload cancelled.'),{name:'AbortError'}));
        abort.current?.signal.addEventListener('abort',()=>xhr.abort(),{once:true});xhr.send(body);
      });
      if(alive.current){setProgress(100);onChange({url:d.url,fileId:d.fileId,fileName:d.name,mime:d.mime});}
    }
    catch(e:any){if(alive.current){setError(e.name==='AbortError'?'Upload cancelled.':e.message);setLocal('')}}
    finally{if(heartbeat)clearInterval(heartbeat);xhrRef.current=null;if(alive.current){setBusy(false);setLocal('');setTimeout(()=>alive.current&&setProgress(0),700)}notify(-1)}
  }
  if(cropEnabled&&kind==='image')return <CropMediaField {...{label,url,fileId,originalUrl,originalFileId,imageEdit,onChange,notify}}/>;
  return <div className="cmsMedia wide"><b>{label}</b>{kind==='image'&&(local||url)&&<AcademyImage className="cmsImagePreview" src={local||portalMediaUrl(url)} alt={`${label} preview`}/>}{kind==='video'&&url&&fileId&&<video className="cmsVideoPreview" src={portalMediaUrl(url)} controls preload="metadata"/>}{busy&&<div className="cmsUploadProgress" role="progressbar" aria-label={`Uploading ${label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{width:`${progress}%`}}/><span>{progress?`${progress}% uploaded`:'Preparing upload…'}</span></div>}<div className="cmsActions"><label className="cmsUploadLabel">{url?'Replace file':'Upload file'}<input aria-label={`Upload ${label}`} type="file" disabled={busy} accept={kind==='image'?'image/jpeg,image/png,image/webp,image/gif':kind==='video'?'video/mp4,video/webm,video/quicktime':'.pdf,.doc,.docx'} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)upload(file)}}/></label>{busy&&<button type="button" className="danger" onClick={()=>{abort.current?.abort();xhrRef.current?.abort();}}>Cancel upload</button>}{url&&<><a className="edit" href={portalMediaUrl(url)} target="_blank" rel="noopener noreferrer">Open file ↗</a>{fileId&&kind==='document'&&<a className="edit" href={portalMediaDownloadUrl(url)} download>Download file ↓</a>}<button type="button" className="danger" disabled={busy} onClick={()=>onChange({url:'',fileId:null,fileName:'',mime:''})}>Remove file</button></>}</div><small>{busy?'Large uploads stay signed in and show real transfer progress. Keep this tab open until processing finishes.':`${kind==='image'?'JPG, PNG, WebP, GIF · up to 10 MB':kind==='video'?'MP4, WebM or MOV · up to 250 MB. For fastest delivery, use an optimized MP4 or a YouTube/Vimeo URL.':'PDF, DOC or DOCX · up to 250 MB'} · changes apply when you save.`}</small>{error&&<p className="errorNotice" role="alert">{error}</p>}</div>;
}
export function Questions({value=[],onChange}:any){
  const patch=(i:number,part:any)=>onChange(value.map((q:any,n:number)=>n===i?{...q,...part}:q));
  return <div className="questionBox wide"><div className="cmsActions"><b>Quiz / self-assessment questions</b><button type="button" className="edit" onClick={()=>onChange([...value,{prompt:'',kind:'long-text',required:true,points:1,options:[]}])}>＋ Add question</button></div>{value.map((q:any,i:number)=><div className="contentBlockCard" key={i}><div className="cmsActions"><b>Question {i+1}</b><button type="button" className="danger" onClick={()=>onChange(value.filter((_:any,j:number)=>j!==i))}>Delete question</button></div><div className="formGrid"><Field label="Question" value={q.prompt} wide onChange={(prompt:string)=>patch(i,{prompt})}/><Field label="Answer type" value={q.kind} onChange={(kind:string)=>patch(i,{kind,correctAnswer:''})} options={[['long-text','Long text'],['short-text','Short text'],['rating','Rating'],['multiple-choice','MCQ — one answer'],['multiple-select','MSQ — multiple answers'],['true-false','True / False'],['file','File upload']]}/><Field label="Points" type="number" min="0" value={q.points??1} onChange={(points:number)=>patch(i,{points})}/>{['multiple-choice','multiple-select'].includes(q.kind)&&<Field label="Answer options (one per line)" type="textarea" wide value={(q.options||[]).join('\n')} onChange={(text:string)=>patch(i,{options:text.split('\n')})}/>}{['multiple-choice','multiple-select','true-false','short-text'].includes(q.kind)&&<Field label="Answer key (teacher reference; automatic grading not enabled)" wide value={String(q.correctAnswer??'')} options={q.kind==='true-false'?[['','No answer key'],['true','True'],['false','False']]:undefined} onChange={(correctAnswer:string)=>patch(i,{correctAnswer})}/>}<Check label="Required question" checked={q.required!==false} onChange={(required:boolean)=>patch(i,{required})}/></div></div>)}</div>;
}
export function Resources({value=[],onChange}:any){return <div className="wide"><b>Learning resources</b>{value.map((x:any,i:number)=><div className="contentBlockCard" key={i}><div className="formGrid"><Field label="Resource label" value={x.label} onChange={(label:string)=>onChange(value.map((a:any,j:number)=>j===i?{...a,label}:a))}/><Field label="Resource URL" value={x.url} onChange={(url:string)=>onChange(value.map((a:any,j:number)=>j===i?{...a,url,fileId:null}:a))}/><MediaField label={`Resource ${i+1}`} kind="document" url={x.url} fileId={x.fileId} onChange={(p:any)=>onChange(value.map((a:any,j:number)=>j===i?{...a,...p}:a))}/></div><button type="button" className="danger" onClick={()=>onChange(value.filter((_:any,j:number)=>j!==i))}>Remove resource</button></div>)}<button type="button" className="edit" onClick={()=>onChange([...value,{label:'',url:'',kind:'link'}])}>＋ Add resource</button></div>}

export function MoneyField({label,value,onChange,currency='USD'}:any){return <label>{label} ({currency==='USD'?'$ USD':currency})<span className="cmsMoneyInput"><span aria-hidden="true">{currency==='USD'?'$':currency}</span><input className="field" type="number" min="0" step="0.01" value={value??''} onChange={e=>onChange(e.target.value===''?'':Number(e.target.value))}/></span></label>;}
