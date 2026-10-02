import slots from '../data/websiteSlots.js';
import {httpError,safeUrl} from './cmsValidation.js';
const textKeys=new Set(slots.texts.map(x=>x.key)),images=new Map(slots.images.map(x=>[x.key,x]));
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function validateWebsiteContent(value){
 if(!object(value)||!object(value.text)||!Array.isArray(value.images))throw httpError(400,'Provide website text and image settings.');
 const text={};for(const [key,v]of Object.entries(value.text)){if(!textKeys.has(key))throw httpError(400,'Unknown website text slot.');if(typeof v!=='string'||v.length>5000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v))throw httpError(400,'Website copy must be ordinary text (maximum 5,000 characters per field).');text[key]=v;}
 if(value.images.length>images.size)throw httpError(400,'Too many website images.');const used=new Set();
 const result=value.images.map(item=>{if(!object(item)||!images.has(item.key)||used.has(item.key))throw httpError(400,'Invalid or duplicate image slot.');used.add(item.key);const slot=images.get(item.key),url=safeUrl(item.url,'Image');if(!url)throw httpError(400,'Remove empty image overrides to restore the original.');const fileId=item.fileId||null;if(fileId&&(typeof fileId!=='string'||!/^[a-f0-9]{24}$/i.test(fileId)))throw httpError(400,'Invalid image file.');if(item.position&&!/^\d{1,3}% (center|\d{1,3}%)$/.test(item.position))throw httpError(400,'Invalid image crop position.');return {key:slot.key,src:slot.src,url,fileId,...(item.position?{position:item.position}:{})};});
 if(JSON.stringify({text,images:result}).length>400000)throw httpError(413,'Website settings are too large.');return {text,images:result};
}
