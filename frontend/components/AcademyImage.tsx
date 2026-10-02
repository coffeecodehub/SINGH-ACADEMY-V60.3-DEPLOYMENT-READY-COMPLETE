 'use client';
import {useState,useEffect,type ImgHTMLAttributes} from 'react';
import manifestData from '../lib/image-manifest.json';
import {useWebsiteContent} from './WebsiteContent';
import {portalMediaUrl} from '../lib/api';
type Variant={src:string;width:number;height:number;bytes:number};
type ImageEntry={src:string;width:number;height:number;variants:Variant[]};
const manifest=manifestData as Record<string,ImageEntry>;
type Props=Omit<ImgHTMLAttributes<HTMLImageElement>,'src'> & {src?:string|null;priority?:boolean};
/** Local WebP/srcset without changing legacy CSS sizing. Only explicit caller dimensions become HTML attributes; card/hero CSS reserves the display box. Private media keeps portal authentication. */
export default function AcademyImage({src,alt='',priority=false,sizes,loading,decoding,width,height,onError,...rest}:Props){
 const website=useWebsiteContent();const supplied=typeof src==='string'?src:'';const replacement=website.images?.find(i=>i.src===supplied);
 const raw=replacement?.url||supplied,local=raw.split('?')[0],entry=manifest[local];
 const original=portalMediaUrl(raw),[fallback,setFallback]=useState<string|null>(null);
 useEffect(()=>setFallback(null),[raw]);
 const logo=local.includes('logo-clean'),eager=priority||logo||loading==='eager';
 return <img {...rest} style={replacement?.position?{...rest.style,objectPosition:replacement.position}:rest.style} src={fallback||entry?.src||original||undefined} alt={alt}
  srcSet={!fallback&&entry?entry.variants.map(v=>`${v.src} ${v.width}w`).join(', '):rest.srcSet}
  sizes={sizes||(logo?'140px':priority?'100vw':'(max-width: 640px) 90vw, (max-width: 1100px) 45vw, 420px')}
  width={width} height={height}
  loading={loading||(eager?'eager':'lazy')} decoding={decoding||'async'} fetchPriority={priority?'high':rest.fetchPriority}
  onError={event=>{
   const before=event.currentTarget.getAttribute('src');event.currentTarget.removeAttribute('srcset');
   onError?.(event);const after=event.currentTarget.getAttribute('src');
   if(after&&after!==before){if(after!==fallback)setFallback(after);}
   else if(entry&&!fallback)setFallback(original);
  }}/>
}
