/** Executes the installed Sharp binary and the actual resize/WebP pipeline. No database or uploads touched. */
import assert from 'node:assert/strict';import sharp from 'sharp';
const source=await sharp({create:{width:1280,height:720,channels:3,background:{r:155,g:102,b:61}}}).png().toBuffer();
const result=await sharp(source,{limitInputPixels:20000000}).rotate().resize({width:480,height:480,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer({resolveWithObject:true});
assert.equal(result.info.format,'webp');assert.equal(result.info.width,480);assert.equal(result.info.height,270);const metadata=await sharp(result.data).metadata();assert.equal(metadata.format,'webp');console.log('Installed Sharp image smoke test passed:',JSON.stringify({sharp:sharp.versions.sharp,vips:sharp.versions.vips,width:result.info.width,height:result.info.height,bytes:result.data.length}));
