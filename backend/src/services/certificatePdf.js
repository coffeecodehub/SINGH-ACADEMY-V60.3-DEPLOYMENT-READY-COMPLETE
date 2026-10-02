import fs from 'node:fs';
import {businessError} from '../utils/business.js';
import {assemblePdf,pdfStream} from '../utils/pdfWriter.js';
const widths=JSON.parse(fs.readFileSync(new URL('../assets/certificate-widths.json',import.meta.url),'utf8'));
const logoSize=JSON.parse(fs.readFileSync(new URL('../assets/certificate-logo-original.json',import.meta.url),'utf8'));
const logo=fs.readFileSync(new URL('../assets/certificate-logo-original.rgb.deflate',import.meta.url));
const alpha=fs.readFileSync(new URL('../assets/certificate-logo-original.alpha.deflate',import.meta.url));
const signatureSize=JSON.parse(fs.readFileSync(new URL('../assets/certificate-signature.json',import.meta.url),'utf8'));
const signature=fs.readFileSync(new URL('../assets/certificate-signature.rgb.deflate',import.meta.url));
const signatureAlpha=fs.readFileSync(new URL('../assets/certificate-signature.alpha.deflate',import.meta.url));
const extras=new Map([['€',128],['‚',130],['ƒ',131],['„',132],['…',133],['†',134],['‡',135],['ˆ',136],['‰',137],['Š',138],['‹',139],['Œ',140],['Ž',142],['‘',145],['’',146],['“',147],['”',148],['•',149],['–',150],['—',151],['˜',152],['™',153],['š',154],['›',155],['œ',156],['ž',158],['Ÿ',159]]);
export function certificateText(value,label='Certificate text'){
 if(typeof value!=='string'||!value.trim()||value.length>250||/[\x00-\x1f\x7f]/.test(value))throw businessError(`${label} is missing or too long.`,400);
 const text=value.trim().normalize('NFC'),bytes=[];for(const char of text){const code=char.codePointAt(0);if((code>=32&&code<=126)||(code>=160&&code<=255))bytes.push(code);else if(extras.has(char))bytes.push(extras.get(char));else throw businessError(`${label} contains characters this certificate font cannot print. Enter an approved Latin-script display spelling; do not change the student account name.`,400);}return {text,bytes:Buffer.from(bytes)};
}
function literal(value){return '('+[...certificateText(value).bytes].map(b=>b===40||b===41||b===92?'\\'+String.fromCharCode(b):b>=128?'\\'+b.toString(8).padStart(3,'0'):String.fromCharCode(b)).join('')+')';}
const width=(text,font,size)=>[...certificateText(text).bytes].reduce((n,b)=>n+(widths[font]?.[String(b)]||600),0)/1000*size;
function fitted(text,font,maxSize,maxWidth,minSize=10){let size=maxSize;while(size>minSize&&width(text,font,size)>maxWidth)size-=.5;if(width(text,font,size)>maxWidth)throw businessError('Certificate text is too wide. Use a shorter approved display title.',400);return size;}
function wrap(text,font,size,maxWidth){const lines=[];let line='';for(const word of text.split(/\s+/)){const candidate=line?line+' '+word:word;if(width(candidate,font,size)>maxWidth&&line){lines.push(line);line=word;}else line=candidate;}if(line)lines.push(line);return lines;}
/** A4 landscape certificate matching the approved Singh Academy reference: exact logo, cream paper, repeated shield watermarks, seal and authorized-signature area. */
export function createCertificatePdf({studentName,courseTitle,completedAt,issuedAt,issuedBy,number,verificationUrl,sample=false}){
 for(const [label,value] of Object.entries({studentName,courseTitle,issuedBy,number}))certificateText(value,label);
 const url=new URL(verificationUrl);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw businessError('Invalid certificate verification URL.');
 const date=value=>{const d=new Date(value);if(!Number.isFinite(d.getTime()))throw businessError('Certificate date is invalid.');return d.toLocaleDateString('en-US',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});};
 const W=841.89,H=595.28,ops=[];
 const text=(t,x,y,size=12,font='Helvetica',fill='0.13 0.12 0.10 rg')=>ops.push(`BT ${fill} /${font==='Helvetica'?'F1':font==='Helvetica-Bold'?'F2':'F3'} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm ${literal(t)} Tj ET`);
 const center=(t,y,size=12,font='Helvetica',fill)=>text(t,(W-width(t,font,size))/2,y,size,font,fill);
 // Paper and layered frame.
 ops.push('0.965 0.944 0.895 rg 0 0 841.89 595.28 re f','0.36 0.22 0.12 RG 4 w 18 18 805.89 559.28 re S','0.70 0.48 0.27 RG 1.4 w 27 27 787.89 541.28 re S','0.82 0.70 0.52 RG .55 w 34 34 773.89 527.28 re S');
 // Repeated original-logo watermark pattern (subtle and local; no remote assets).
 const marks=[[72,385,72],[208,397,66],[378,382,75],[590,398,68],[705,392,72],[80,180,70],[210,132,68],[405,108,96],[625,150,74],[724,178,66]];
 for(const [x,y,h] of marks){const w=h*logoSize.width/logoSize.height;ops.push(`q /WM gs ${w} 0 0 ${h} ${x} ${y} cm /Logo Do Q`);}
 // Main exact shield logo in upper-left, like the approved reference.
 const mainH=96,mainW=mainH*logoSize.width/logoSize.height;ops.push(`q ${mainW} 0 0 ${mainH} 55 455 cm /Logo Do Q`);
 center('SINGH ACADEMY',503,13,'Helvetica-Bold','0.22 0.18 0.14 rg');
 center('CERTIFICATE OF COMPLETION',461,30,'Times-Roman','0.12 0.11 0.10 rg');
 center('This certificate is proudly presented to',414,11,'Helvetica','0.39 0.35 0.30 rg');
 const ns=fitted(studentName,'Times-Roman',38,550,18);center(studentName,360,ns,'Times-Roman','0.12 0.11 0.10 rg');
 ops.push('0.36 0.25 0.16 RG 1.1 w 154 344 m 688 344 l S');
 center('for completing the required lessons in',318,11,'Helvetica','0.39 0.35 0.30 rg');
 let ts=31,lines=wrap(courseTitle,'Helvetica-Bold',ts,560);while((lines.length>2||lines.some(line=>width(line,'Helvetica-Bold',ts)>560))&&ts>18){ts--;lines=wrap(courseTitle,'Helvetica-Bold',ts,560);}if(lines.length>2)throw businessError('Course title is too long for the certificate. Use a shorter approved display title.');
 const firstY=lines.length===1?278:291;for(const [i,line] of lines.entries())center(line,firstY-i*(ts*1.18),fitted(line,'Helvetica-Bold',ts,560,16),'Helvetica-Bold','0.13 0.12 0.10 rg');
 center('Awarded in recognition of successful completion of all required course work.',217,10,'Helvetica','0.35 0.32 0.28 rg');
 // Footer facts.
 text('COMPLETED',82,164,8,'Helvetica-Bold','0.43 0.31 0.20 rg');text(date(completedAt),82,144,10);
 text('ISSUED',328,164,8,'Helvetica-Bold','0.43 0.31 0.20 rg');text(date(issuedAt),328,144,10);
 text('AUTHORIZED BY',548,164,8,'Helvetica-Bold','0.43 0.31 0.20 rg');
 // Approved blue signature supplied for Singh Academy certificates. It is embedded locally and never fetched remotely.
 const sigH=58,sigW=sigH*signatureSize.width/signatureSize.height;ops.push(`q ${sigW.toFixed(2)} 0 0 ${sigH} 554 105 cm /Signature Do Q`,'0.55 0.46 0.36 RG .65 w 548 112 m 700 112 l S');
 text('Authorized Signature - Singh Academy',548,91,8,'Helvetica','0.35 0.31 0.27 rg');
 text('CERTIFICATE NO.',82,108,7,'Helvetica-Bold','0.43 0.31 0.20 rg');text(number,82,88,9,'Helvetica-Bold');
 text('Verify certificate online',328,88,8,'Helvetica','0.35 0.31 0.27 rg');
 // Gold seal centered along the lower frame.
 ops.push('0.78 0.55 0.17 rg 390 26 62 62 re f'); // backing square is covered by circles below in rasterless approximation
 ops.push('0.94 0.72 0.28 rg 421 57 30 0 360 arc f');
 // PDF path arc operator is not portable; use concentric Bézier circles instead.
 ops.pop();ops.pop();
 const circle=(cx,cy,r,fill,stroke)=>{const k=.5522847498*r;ops.push(`${fill} rg ${stroke} RG 1 w ${cx+r} ${cy} m ${cx+r} ${cy+k} ${cx+k} ${cy+r} ${cx} ${cy+r} c ${cx-k} ${cy+r} ${cx-r} ${cy+k} ${cx-r} ${cy} c ${cx-r} ${cy-k} ${cx-k} ${cy-r} ${cx} ${cy-r} c ${cx+k} ${cy-r} ${cx+r} ${cy-k} ${cx+r} ${cy} c B`);};
 circle(W/2,54,29,'0.83 0.59 0.20','0.62 0.40 0.11');circle(W/2,54,22,'0.93 0.73 0.32','0.72 0.48 0.15');center('SA',47,15,'Times-Roman','0.43 0.28 0.12 rg');
 if(sample)center('SAMPLE - NOT AN ISSUED CERTIFICATE',18,8,'Helvetica-Bold','0.58 0.16 0.12 rg');
 const stream=Buffer.from(ops.join('\n'),'ascii');
 return assemblePdf([
  '<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> /XObject << /Logo 7 0 R /Signature 9 0 R >> /ExtGState << /WM 11 0 R >> >> /Contents 12 0 R /Annots [13 0 R] >>`,
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>','<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>',
  pdfStream(logo,`/Type /XObject /Subtype /Image /Width ${logoSize.width} /Height ${logoSize.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask 8 0 R`),
  pdfStream(alpha,`/Type /XObject /Subtype /Image /Width ${logoSize.width} /Height ${logoSize.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`),
  pdfStream(signature,`/Type /XObject /Subtype /Image /Width ${signatureSize.width} /Height ${signatureSize.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask 10 0 R`),
  pdfStream(signatureAlpha,`/Type /XObject /Subtype /Image /Width ${signatureSize.width} /Height ${signatureSize.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`),
  '<< /Type /ExtGState /ca .075 /CA .075 >>',pdfStream(stream),
  `<< /Type /Annot /Subtype /Link /Rect [324 80 500 101] /Border [0 0 0] /A << /S /URI /URI ${literal(url.href)} >> >>`,
  `<< /Title ${literal('Certificate of Completion - '+number)} /Author (Singh Academy) /Producer (Singh Academy Certificate Service V57) >>`
 ]);
}
