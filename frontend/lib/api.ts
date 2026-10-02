/** All portal selection is explicit. The backend separately binds cookies, sessions and stored roles. */
export const API_URL=(process.env.NEXT_PUBLIC_API_URL||'http://localhost:5000/api').replace(/\/$/,'');
export type Portal='student'|'client_admin'|'super_admin';
export function portalForPath(path:string):Portal {return /^\/super-admin(?:\/|$)/.test(path)?'super_admin':/^\/admin(?:\/|$)/.test(path)?'client_admin':'student';}
export function currentPortal():Portal {return typeof window==='undefined'?'student':portalForPath(window.location.pathname);}
export function requestHeaders(options:RequestInit={},portal:Portal=currentPortal()){
 const headers=new Headers(options.headers||{});if(!headers.has('X-SA-Portal'))headers.set('X-SA-Portal',portal);
 if(!['GET','HEAD','OPTIONS'].includes((options.method||'GET').toUpperCase()))headers.set('X-SA-CSRF','1');
 if(options.body&&!(options.body instanceof FormData)&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');return headers;
}
export class ApiError extends Error {status:number;code?:string;constructor(message:string,status:number,code?:string){super(message);this.name='ApiError';this.status=status;this.code=code;}}
export async function apiFetch(path:string,options:RequestInit={}){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000),onAbort=()=>controller.abort();
 if(options.signal?.aborted)controller.abort();else options.signal?.addEventListener('abort',onAbort,{once:true});
 const headers=requestHeaders(options);
 try{
  const response=await fetch(`${API_URL}${path}`,{...options,credentials:'include',headers,signal:controller.signal,cache:'no-store'});
  const text=await response.text();let data:any={};try{data=text?JSON.parse(text):{};}catch{throw new ApiError('The API returned an invalid response. Check the backend URL and server logs.',response.status);}
  if(!response.ok){if(response.status===401&&!path.startsWith('/auth/')&&typeof window!=='undefined')window.dispatchEvent(new CustomEvent('sa:session-expired',{detail:{portal:headers.get('X-SA-Portal')}}));throw new ApiError(data.message||`Request failed (${response.status})`,response.status,data.code);}
  return data;
 }catch(error:any){if(error?.name==='AbortError')throw new ApiError('The request timed out. For a payment, refresh the records or retry this same form; do not create a duplicate receipt.',408);if(error instanceof TypeError)throw new ApiError('Cannot reach the API. Check that the backend is running and the frontend API URL is correct.',0);throw error;}
 finally{clearTimeout(timeout);options.signal?.removeEventListener('abort',onAbort);}
}
export function portalMediaUrl(value:string){
 if(!value)return value;
 try{
  const origin=typeof window==='undefined'?'http://localhost':window.location.origin;
  const base=new URL(API_URL,origin),u=new URL(value,origin);
  const mediaId=u.pathname.match(/\/api\/media\/([a-f0-9]{24})$/i)?.[1];
  // Media URLs may have been stored when the API used localhost, Render or another host.
  // A valid internal /api/media/<ObjectId> is always remapped through the CURRENT API base
  // so Vercel/Hostinger proxy cookies continue to work after deployment changes.
  if(mediaId){const portal=currentPortal();const mapped=new URL(base.pathname+'/media/'+mediaId,base.origin);if(portal!=='student')mapped.searchParams.set('portal',portal);return mapped.origin===origin?mapped.pathname+mapped.search:mapped.href;}
 }catch{}
 return value;
}
export function portalMediaDownloadUrl(value:string){
 const mapped=portalMediaUrl(value);if(!mapped)return mapped;
 try{
  const origin=typeof window==='undefined'?'http://localhost':window.location.origin,u=new URL(mapped,origin);
  // The backend uses this flag to send Content-Disposition: attachment with the original GridFS filename.
  u.searchParams.set('download','1');
  return u.origin===origin?u.pathname+u.search:u.href;
 }catch{return mapped;}
}
export function safeStudentNext(value:string|null) {try{
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//'))return '/home';
 let decoded=value;for(let i=0;i<2;i++)decoded=decodeURIComponent(decoded);
 if(/[\\\u0000-\u0020]/.test(decoded)||decoded.startsWith('//'))return '/home';
 const target=new URL(decoded,'https://academy.invalid');
 if(target.origin!=='https://academy.invalid'||/^\/(?:admin|super-admin)(?:\/|$)/i.test(target.pathname))return '/home';
 return target.pathname+target.search+target.hash;
 }catch{return '/home';}}

export async function saveCsv(source:string|{csv:string;filename?:string}){const d=typeof source==='string'?await apiFetch(source):source;const url=URL.createObjectURL(new Blob(['\uFEFF'+d.csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=d.filename||'report.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}

export async function downloadApiFile(path:string,filename='certificate.pdf'){
 const response=await fetch(API_URL+path,{credentials:'include',headers:requestHeaders(),cache:'no-store',signal:AbortSignal.timeout(30000)});
 if(!response.ok){let message='The document could not be downloaded.';try{message=(await response.json()).message||message;}catch{}throw new ApiError(message,response.status);}
 if(!response.headers.get('content-type')?.includes('application/pdf'))throw new ApiError('The server did not return a PDF document.',502);
 const url=URL.createObjectURL(await response.blob()),a=document.createElement('a');a.href=url;a.download=filename.replace(/[^a-zA-Z0-9_.-]/g,'_');document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
