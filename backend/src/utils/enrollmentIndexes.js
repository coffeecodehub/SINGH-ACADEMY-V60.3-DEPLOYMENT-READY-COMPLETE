function exactEnrollmentCompoundKey(index){
 if(!index?.key||typeof index.key!=='object')return false;
 const keys=Object.keys(index.key);
 return keys.length===2&&index.key.user===1&&index.key.courseSlug===1;
}
export function legacyEnrollmentUniqueIndex(index){
 if(!index||index.unique!==true||!index.key||typeof index.key!=='object'||index.name==='_id_')return false;
 return !validEnrollmentCompoundIndex(index);
}
export function validEnrollmentCompoundIndex(index){
 if(!exactEnrollmentCompoundKey(index)||index.unique!==true)return false;
 // Enrollment uniqueness must be exactly one student + one course. Any other unique
 // rule (single-field, descending, sparse, partial, collated, or extra-field) can
 // prevent another student from enrolling in the same course.
 if(index.sparse===true||index.partialFilterExpression)return false;
 if(index.collation&&index.collation.locale&&index.collation.locale!=='simple')return false;
 return true;
}

/** Keep enrollment uniqueness scoped only to one student + one course.
 * Safe to run repeatedly. Enrollment has no other intentional unique indexes, so
 * every non-_id unique rule that is not the canonical pair is a legacy/conflicting
 * rule and is removed before the canonical index is ensured.
 */
export async function ensureEnrollmentIndexes(collection){
 let indexes=await collection.indexes(),dropped=[];
 for(const index of indexes){
  if(index.name==='_id_')continue;
  const conflicts=index.unique===true||index.name==='user_1_courseSlug_1'||exactEnrollmentCompoundKey(index);
  if(conflicts&&!validEnrollmentCompoundIndex(index)){
   try{await collection.dropIndex(index.name);dropped.push(index.name);}catch(error){if(error?.code!==27&&error?.codeName!=='IndexNotFound')throw error;}
  }
 }
 indexes=await collection.indexes();
 if(!indexes.some(validEnrollmentCompoundIndex))await collection.createIndex({user:1,courseSlug:1},{unique:true,name:'user_1_courseSlug_1'});
 return dropped;
}
