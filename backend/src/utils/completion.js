/** Only published, required lessons form the completion boundary. Empty courses never complete. */
export function completionProgress(lessons,completedIds){
 const visible=lessons.filter(l=>l.published!==false),required=visible.filter(l=>l.completionRequired!==false),eligible=required.length?required:visible;
 const ids=[...new Set(eligible.map(l=>String(l._id)))],done=new Set(completedIds.map(String)),count=ids.filter(id=>done.has(id)).length;
 return {requiredLessonIds:ids,done:count,total:ids.length,percent:ids.length?Math.floor(count/ids.length*100):0,complete:ids.length>0&&count===ids.length};
}
export function publicCompletion(record){if(!record)return null;return {_id:record._id,courseSlug:record.courseSlug,courseTitle:record.courseTitle,status:record.status,attemptNumber:record.attemptNumber||1,retryFeedback:record.retryFeedback||'',reviewedAt:record.reviewedAt,completedAt:record.completedAt,issuedAt:record.issuedAt,certificateNumber:record.certificateNumber,certificateName:record.certificateName};}
