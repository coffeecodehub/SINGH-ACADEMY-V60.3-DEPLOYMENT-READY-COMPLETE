import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {payloadFor} from '../src/utils/cmsValidation.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('V55 signed-in students always get My Courses navigation, even before an enrollment exists',()=>{
 const header=read('frontend/components/SiteHeader.tsx');
 assert.match(header,/displayUser\?\.role==='student'.*My Courses/s);
 assert.doesNotMatch(header,/displayUser&&enrollment&&.*My Course/s);
 assert.match(header,/pathname\.startsWith\('\/learn\/'\)/);
});

test('V55 internal media download adds an explicit download request',()=>{
 const api=read('frontend/lib/api.ts'),media=read('backend/src/routes/mediaRoutes.js');
 assert.match(api,/export function portalMediaDownloadUrl/);
 assert.match(api,/searchParams\.set\('download','1'\)/);
 assert.match(media,/forceDownload=.*req\.query\?\.download/);
 assert.match(media,/Content-Disposition.*attachment/s);
});

test('V55 course player uses the saved lesson thumbnail for a real play gate',()=>{
 const player=read('frontend/app/learn/[course]/page.tsx');
 assert.match(player,/className="lessonVideoPoster"/);
 assert.match(player,/poster=\{lesson\.videoThumbnailUrl\}/);
 assert.match(player,/portalMediaDownloadUrl/);
 assert.match(player,/Download lesson PDF/);
});

test('V55 client lesson editor retains thumbnail data and previews it before playback',()=>{
 const editor=read('frontend/components/cms/LessonEditor.tsx');
 assert.match(editor,/Video thumbnail \/ poster/);
 assert.match(editor,/className="cmsVideoPoster"/);
 const out=payloadFor('lessons',{title:'Lesson',videoThumbnailUrl:'/api/media/0123456789abcdef01234567',videoThumbnailFileId:'0123456789abcdef01234567'},{creating:true});
 assert.equal(out.videoThumbnailUrl,'/api/media/0123456789abcdef01234567');
 assert.equal(out.videoThumbnailFileId,'0123456789abcdef01234567');
});
