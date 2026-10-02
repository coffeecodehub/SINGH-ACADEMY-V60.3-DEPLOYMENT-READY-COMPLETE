import test from 'node:test';
import assert from 'node:assert/strict';
import {assessmentDefinition,validateAnswers} from '../src/utils/assessments.js';
const id='507f1f77bcf86cd799439011';
test('V51 MSQ accepts multiple valid option indices',()=>{
 const def=assessmentDefinition({_id:id,questions:[{prompt:'Choose all that apply',kind:'multiple-select',required:true,options:['A','B','C'],points:2}]});
 const row=validateAnswers(def,{[`${id}-0`]:'[0,2]'},{complete:true});
 assert.equal(row[0].kind,'multiple-select');assert.equal(row[0].answer,'[0,2]');
});
test('V51 MSQ rejects out-of-range and duplicate answers',()=>{
 const def=assessmentDefinition({_id:id,questions:[{prompt:'Choose all that apply',kind:'multiple-select',required:true,options:['A','B','C']}]});
 assert.throws(()=>validateAnswers(def,{[`${id}-0`]:'[0,4]'},{complete:true}));
 assert.throws(()=>validateAnswers(def,{[`${id}-0`]:'[1,1]'},{complete:true}));
});
