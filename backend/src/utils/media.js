import mongoose from 'mongoose';
import Course from '../models/Course.js';
import TeamMember from '../models/TeamMember.js';
import Event from '../models/Event.js';
import Lesson from '../models/Lesson.js';
export function lessonMediaIds(lesson) {
  return [lesson.videoFileId,lesson.videoThumbnailFileId,lesson.pdfFileId,...(lesson.resources||[]).map(x=>x.fileId),...(lesson.contentBlocks||[]).flatMap(b=>[b.fileId,...(b.items||[]).map(i=>i.fileId)])].filter(Boolean);
}
export function lessonMediaQuery(id) { return {$or:['videoFileId','videoThumbnailFileId','pdfFileId','resources.fileId','contentBlocks.fileId','contentBlocks.items.fileId'].map(k=>({[k]:id}))}; }
export async function deleteUnusedMedia(ids) {
  // V46 deliberately does not automatically delete GridFS objects after an editor saves.
  // Another valid draft may be attaching the same ID concurrently. The media audit
  // reports scan-status totals; retention/orphan cleanup requires a separate owner review.
  return [...new Set((ids||[]).filter(Boolean).map(String))];
}
export function mediaUrl(req,id,current='') { const base=process.env.PUBLIC_API_URL||(process.env.NODE_ENV==='production'?'/api':'http://localhost:5000/api'); return id?`${base.replace(/\/$/,'')}/media/${id}`:current; }
