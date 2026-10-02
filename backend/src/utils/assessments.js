import crypto from 'node:crypto';
import {businessError} from './business.js';
const KINDS=new Set(['short-text','long-text','multiple-choice','multiple-select','true-false','rating','file']);
export function assessmentDefinition(lesson){
 const fields=[],id=String(lesson._id);
 const question=(q,key)=>{if(!q||typeof q.prompt!=='string')return;
  fields.push({key,prompt:q.prompt,kind:KINDS.has(q.kind)?q.kind:'long-text',required:q.required!==false,
   options:q.kind==='true-false'?['True','False']:(q.options||[]).map(String),points:Number(q.points)||0,correctAnswer:q.correctAnswer??null});};
 (lesson.questions||[]).forEach((q,i)=>question(q,`${id}-${i}`));
 if(typeof lesson.assignmentInstructions==='string'&&lesson.assignmentInstructions.trim())fields.push({key:`${id}-assignment`,prompt:lesson.assignmentInstructions,kind:'long-text',required:true,options:[],points:0,correctAnswer:null});
 (lesson.contentBlocks||[]).forEach((b,i)=>{
  (b.questions||[]).forEach((q,j)=>question(q,`${id}-block-${i}-${j}`));
  if(['assignment','reflection'].includes(b.type)&&!(b.questions||[]).length)fields.push({key:`${id}-block-${i}-response`,prompt:[b.title,b.body].filter(Boolean).join('\n')||'Write your response.',kind:'long-text',required:b.settings?.required!==false,options:[],points:0,correctAnswer:null});
 });
 if(fields.length>120)throw businessError('This lesson contains too many assessment fields. Ask the Academy to split it into smaller lessons.',409);
 const version=crypto.createHash('sha256').update(JSON.stringify(fields)).digest('hex');return {version,fields};
}
export function publicAssessment(def){return {version:def.version,fields:def.fields.map(({correctAnswer,...f})=>f)};}
export function validateAnswers(def,answers,{complete=false}={}){
 if(!answers||typeof answers!=='object'||Array.isArray(answers)||![Object.prototype,null].includes(Object.getPrototypeOf(answers)))throw businessError('Answers must be a field/value object.');
 const known=new Set(def.fields.map(f=>f.key));
 if(Object.keys(answers).some(k=>!known.has(k)))throw businessError('The assessment changed. Reload the lesson before saving.',409);
 let length=0;
 return def.fields.map(f=>{
  const answer=answers[f.key]??'';
  if(typeof answer!=='string'||answer.length>12000)throw businessError('Each answer must be text of at most 12,000 characters.');
  length+=answer.length;if(length>120000)throw businessError('Answers exceed the per-lesson size limit.');
  const value=answer.trim();
  if(complete&&f.required&&!value)throw businessError('Please answer every required quiz, reflection or assignment question before completing the lesson.',409);
  if(value&&['multiple-choice','true-false'].includes(f.kind)&&(!/^\d+$/.test(value)||Number(value)>=f.options.length))throw businessError('Choose a valid answer from the available options.');
  if(value&&f.kind==='multiple-select'){let selected;try{selected=JSON.parse(value);}catch{throw businessError('Choose valid answers from the available options.');}if(!Array.isArray(selected)||!selected.length||selected.length>f.options.length||new Set(selected).size!==selected.length||selected.some(n=>!Number.isSafeInteger(n)||n<0||n>=f.options.length))throw businessError('Choose valid answers from the available options.');}
  if(value&&f.kind==='rating'&&(!/^[1-5]$/.test(value)))throw businessError('Rating must be a whole number from 1 to 5.');
  if(value&&f.kind==='file'&&!/^[a-fA-F0-9]{24}$/.test(value))throw businessError('Upload a valid assignment file before saving.');
  return {...f,answer:value};
 });
}
export function savedAnswers(submission){return Object.fromEntries((submission?.fields||[]).map(f=>[f.key,typeof f.answer==='string'?f.answer:'']));}
export function positiveAttempt(value){if(!Number.isSafeInteger(value)||value<1||value>100000)throw businessError('Reload this course to obtain its current attempt number.',409);return value;}
export function assertAttempt(attempt,expected){positiveAttempt(expected);if(attempt.number!==expected)throw businessError('The Academy restarted this course or a newer attempt is open. Reload the course before continuing.',409);
 if(attempt.status!=='in_progress')throw businessError('This attempt is submitted for Academy review. Its answers are read-only until the Academy requests another attempt.',409);}
export function assertRevision(previous,expected){if(!Number.isSafeInteger(expected)||expected<0||expected!==(previous?.revision||0))throw businessError('This answer sheet was updated in another tab. Reload it before saving.',409);}
export function answerCoverage(lessons,submissions,requiredIds){
 const eligible=new Set(requiredIds.map(String)),missing=[];
 for(const lesson of lessons){if(!eligible.has(String(lesson._id)))continue;const def=assessmentDefinition(lesson);if(!def.fields.some(f=>f.required))continue;
  const sub=submissions.find(s=>String(s.lesson)===String(lesson._id)&&s.schemaVersion===def.version&&s.submittedAt);
  if(!sub){missing.push({lessonId:String(lesson._id),lessonTitle:lesson.title,reason:'Required answers have not been submitted for this curriculum version.'});continue;}
  try{validateAnswers(def,savedAnswers(sub),{complete:true});}catch{missing.push({lessonId:String(lesson._id),lessonTitle:lesson.title,reason:'Required answers are incomplete.'});}
 }
 return {complete:missing.length===0,missing};
}
