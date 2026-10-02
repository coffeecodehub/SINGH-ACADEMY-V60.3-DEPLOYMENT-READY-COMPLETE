import test from 'node:test';
import assert from 'node:assert/strict';
import {payloadFor} from '../src/utils/cmsValidation.js';

test('V53 team editor can omit slug and backend generates it from name',()=>{
  const out=payloadFor('team',{name:'Jane Doe',category:'faculty',role:'Mediator'},{creating:true});
  assert.equal(out.slug,'jane-doe');
  assert.equal(out.name,'Jane Doe');
});

test('V53 lesson preserves validated video thumbnail/poster fields',()=>{
  const out=payloadFor('lessons',{
    title:'Video lesson',
    videoUrl:'https://vimeo.com/123456',
    videoThumbnailUrl:'/api/media/0123456789abcdef01234567',
    videoThumbnailFileId:'0123456789abcdef01234567',
    published:true
  },{creating:true});
  assert.equal(out.videoThumbnailUrl,'/api/media/0123456789abcdef01234567');
  assert.equal(out.videoThumbnailFileId,'0123456789abcdef01234567');
});

test('V53 unsafe video thumbnail URL is rejected',()=>{
  assert.throws(()=>payloadFor('lessons',{title:'Video lesson',videoThumbnailUrl:'javascript:alert(1)'},{creating:true}),/valid HTTP or HTTPS link/);
});
