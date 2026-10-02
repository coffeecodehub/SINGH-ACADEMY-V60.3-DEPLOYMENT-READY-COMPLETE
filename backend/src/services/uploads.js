import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import {pipeline} from 'node:stream/promises';
import mongoose from 'mongoose';
import multer from 'multer';
import sharp from 'sharp';
import {envInteger} from '../utils/deployment.js';
import {httpError} from '../utils/cmsValidation.js';
import {validateSignature} from '../utils/fileSignature.js';
import {mediaUrl} from '../utils/media.js';
import {scanFile} from './uploadScan.js';
const dir=process.env.UPLOAD_TEMP_DIR||path.join(os.tmpdir(),'singh-academy-uploads');fs.mkdirSync(dir,{recursive:true,mode:0o700});
const limit=()=>envInteger(process.env.MAX_UPLOAD_MB,250,1,500)*1024*1024;
const accepted=new Set(['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','video/quicktime','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
const storage=multer.diskStorage({destination:(_,__,cb)=>cb(null,dir),filename:(_,__,cb)=>cb(null,crypto.randomUUID()+'.upload')});
export const uploadSingle=multer({storage,limits:{fileSize:limit(),files:1,fields:0,parts:1,headerPairs:40},fileFilter:(_,file,cb)=>accepted.has(file.mimetype)?cb(null,true):cb(httpError(400,'Use JPG/PNG/WebP/GIF, MP4/WebM/MOV, PDF, DOC or DOCX.'))}).single('file');
export const studentUploadSingle=multer({storage,limits:{fileSize:20*1024*1024,files:1,fields:0,parts:1,headerPairs:40},fileFilter:(_,file,cb)=>new Set(['image/jpeg','image/png','image/webp','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']).has(file.mimetype)?cb(null,true):cb(httpError(400,'Assignments support PDF, DOCX, JPG, PNG or WebP, up to 20 MB.'))}).single('file');
export const receiptUploadSingle=multer({storage,limits:{fileSize:10*1024*1024,files:1,fields:0,parts:1,headerPairs:40},fileFilter:(_,file,cb)=>['image/jpeg','image/png','image/webp'].includes(file.mimetype)?cb(null,true):cb(httpError(400,'Receipt screenshots must be JPG, PNG or WebP, up to 10 MB.'))}).single('file');
let active=0;
export function uploadAdmission(req,res,next){
 const maximum=envInteger(process.env.MAX_CONCURRENT_UPLOADS,2,1,8);
 if(active>=maximum)return res.status(429).set('Retry-After','10').json({success:false,message:'Uploads are busy. Please retry in a few seconds.'});
 active++;let released=false;const release=()=>{if(released)return;released=true;active--;};
 req.releaseUploadSlot=release;
 const responseFinished=()=>{if(!req.uploadProcessing)release();};
 res.once('finish',responseFinished);res.once('close',responseFinished);next();
}
export async function storeUpload(req,res,next){
 req.uploadProcessing=true;
 let file=req.file,output='',stream=null,completed=false;
 const abort=new AbortController(),disconnected=()=>{if(!res.writableEnded)abort.abort();};res.once('close',disconnected);
 try{
  if(res.destroyed)throw httpError(499,'Upload cancelled.');
  if(!file)throw httpError(400,'Choose a file to upload.');
  if(file.size===0)throw httpError(400,'Empty files cannot be uploaded.');
  const handle=await fs.promises.open(file.path,'r');let head,tail;
  try{head=Buffer.alloc(Math.min(file.size,65536));tail=Buffer.alloc(Math.min(file.size,131072));await handle.read(head,0,head.length,0);await handle.read(tail,0,tail.length,Math.max(0,file.size-tail.length));}finally{await handle.close();}
  let mime=validateSignature(head,tail,file.mimetype),name=String(file.originalname||'upload').replace(/[\x00-\x1f\x7f]/g,'').slice(0,150),size=file.size;
  if(mime.startsWith('image/')&&size>10*1024*1024)throw httpError(400,'Images must be 10 MB or smaller.');
  const scan=await scanFile(file.path,{signal:abort.signal});let source=file.path,width,height;
  if(mime.startsWith('image/')){
   output=file.path+'.webp';
   // Decode and re-encode, strip EXIF/GPS, cap pixels and physical width. Animated uploads become a still thumbnail.
   const image=sharp(file.path,{limitInputPixels:25000000,failOn:'warning',animated:false}).rotate().resize({width:1920,height:1920,fit:'inside',withoutEnlargement:true}).webp({quality:82,effort:4});
   const stopImage=()=>image.destroy();abort.signal.addEventListener('abort',stopImage,{once:true});let info;
   try{info=await image.toFile(output);}finally{abort.signal.removeEventListener('abort',stopImage);}
   source=output;mime='image/webp';name=name.replace(/\.[^.]*$/,'')+'.webp';size=info.size;width=info.width;height=info.height;
  }
  if(abort.signal.aborted)throw httpError(499,'Upload cancelled.');
  const bucket=new mongoose.mongo.GridFSBucket(mongoose.connection.db,{bucketName:'academyMedia'});
  stream=bucket.openUploadStream(name,{contentType:mime,metadata:{purpose:req.paymentReceiptUpload?'payment-receipt':req.studentUpload?'student-assessment':'cms',uploadedBy:String(req.user._id),uploadedAt:new Date(),scan,signatureChecked:true,width,height,originalSize:file.size}});
  await pipeline(fs.createReadStream(source),stream,{signal:abort.signal});completed=true;
  const fileId=String(stream.id);
  if(req.onUploadStored)await req.onUploadStored({fileId,name,mime,size});
  res.status(201).json({success:true,url:mediaUrl(req,fileId),fileId,name,mime,size,width,height});
 }catch(error){
  if(stream&&!completed)await stream.abort().catch(()=>{});
  if(stream&&completed&&(req.studentUpload||req.paymentReceiptUpload))await new mongoose.mongo.GridFSBucket(mongoose.connection.db,{bucketName:'academyMedia'}).delete(stream.id).catch(()=>{});
  if(!abort.signal.aborted&&!res.destroyed)next(error.status?error:httpError(400,'The uploaded file could not be processed. Use a valid supported file.'));
 }finally{
  res.removeListener('close',disconnected);
  await Promise.all([file?.path,output].filter(Boolean).map(p=>fs.promises.unlink(p).catch(()=>{})));
  req.uploadProcessing=false;req.releaseUploadSlot?.();
 }
}
