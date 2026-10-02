/** Reproducible local asset optimization. Originals are preserved for legacy database URLs. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),publicDir=path.join(root,'frontend/public');
const sharp=require(process.env.SHARP_PATH||path.join(root,'backend/node_modules/sharp'));
const out=path.join(publicDir,'optimized');fs.mkdirSync(out,{recursive:true});
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()&&d.name!=='optimized'?walk(path.join(dir,d.name)):d.isFile()&&/\.(png|jpe?g|webp)$/i.test(d.name)?[path.join(dir,d.name)]:[]);}
(async()=>{
 const manifest={},cache=new Map(),report=[];
 for(const file of walk(publicDir)){
  const raw=fs.readFileSync(file),hash=crypto.createHash('sha256').update(raw).digest('hex').slice(0,16),url='/'+path.relative(publicDir,file).split(path.sep).join('/');
  if(!cache.has(hash)){
   const meta=await sharp(raw,{limitInputPixels:60000000}).metadata();if(!meta.width||!meta.height)continue;
   const widths=[240,480,800,1280,1920].filter(w=>w<meta.width);widths.push(Math.min(meta.width,1920));
   const variants=[];
   for(const w of [...new Set(widths)]){
    const name=`${hash}-${w}.webp`,target=path.join(out,name);
    const info=await sharp(raw,{limitInputPixels:60000000,animated:false}).rotate().resize({width:w,withoutEnlargement:true}).webp({quality:80,effort:4}).toFile(target);
    variants.push({src:'/optimized/'+name,width:info.width,height:info.height,bytes:info.size});
   }
   const preferred=variants.find(x=>x.width>=800)||variants.at(-1),entry={src:preferred.src,width:meta.width,height:meta.height,variants};
   cache.set(hash,entry);report.push({sample:url,originalBytes:raw.length,originalWidth:meta.width,cardBytes:(variants.find(x=>x.width>=480)||variants.at(-1)).bytes,largestBytes:variants.at(-1).bytes,variants});
  }
  manifest[url]=cache.get(hash);
 }
 fs.mkdirSync(path.join(root,'frontend/lib'),{recursive:true});fs.writeFileSync(path.join(root,'frontend/lib/image-manifest.json'),JSON.stringify(manifest));
 const originalBytes=report.reduce((s,r)=>s+r.originalBytes,0),cardBytes=report.reduce((s,r)=>s+r.cardBytes,0);
 const result={scope:'Unique local source images compared with their approximately 480px WebP card variants; not a page-speed measurement',paths:Object.keys(manifest).length,uniqueImages:report.length,originalBytes,cardBytes,cardByteReductionPercent:Math.round((1-cardBytes/originalBytes)*10000)/100,images:report};
 fs.mkdirSync(path.join(root,'qa'),{recursive:true});fs.writeFileSync(path.join(root,'qa/v46-image-sizes.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({...result,images:undefined},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
