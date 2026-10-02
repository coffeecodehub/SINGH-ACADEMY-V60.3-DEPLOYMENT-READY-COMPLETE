import StudentFile from '../models/StudentFile.js';import User from '../models/User.js';
import {businessError} from '../utils/business.js';import {assessmentDefinition,assertAttempt,positiveAttempt} from '../utils/assessments.js';
import {lessonContext} from './learningAccess.js';import {currentAttempt} from './attempts.js';import {transaction} from './businessWrite.js';
export async function validateStudentFiles(fields,owner,session){
 for(const field of fields){if(field.kind!=='file'||!field.answer)continue;
  if(!await StudentFile.exists({...owner,fieldKey:field.key,fileId:field.answer}).session(session))throw businessError('This file does not belong to this student, question or course attempt.',403);
 }
}
export async function prepareStudentUpload(req,res,next){
 try{
  const {course,lesson}=await lessonContext(req),attempt=await currentAttempt(req.user._id,course._id);
  const expected=Number(req.query.attempt);positiveAttempt(expected);assertAttempt(attempt,expected);
  const definition=assessmentDefinition(lesson);
  const field=definition.fields.find(f=>f.key===req.query.field&&f.kind==='file');
  if(!field)throw businessError('File question not found. Reload the lesson.',400);
  if(await StudentFile.countDocuments({user:req.user._id,course:course._id,attemptNumber:attempt.number})>=200)throw businessError('The file limit for this course attempt was reached. Contact the Academy.',429);
  req.studentUpload={user:req.user._id,course:course._id,lesson:lesson._id,attemptNumber:attempt.number,fieldKey:field.key};
  req.onUploadStored=async file=>transaction(async session=>{
   const user=await User.findOneAndUpdate({_id:req.user._id,role:'student',status:{$ne:'blocked'}},{$inc:{commerceVersion:1}},{session,new:true});
   if(!user)throw businessError('Student account is not active.',403);
   const context=await lessonContext(req,session),current=await currentAttempt(user._id,context.course._id,session);assertAttempt(current,expected);
   if(assessmentDefinition(context.lesson).version!==definition.version)throw businessError('This file question changed while uploading.',409);
   if(await StudentFile.countDocuments({user:user._id,course:course._id,attemptNumber:expected}).session(session)>=200)throw businessError('Course attempt upload limit reached.',429);
   await StudentFile.create([{...req.studentUpload,...file}],{session});
  });next();
 }catch(error){next(error);}
}
