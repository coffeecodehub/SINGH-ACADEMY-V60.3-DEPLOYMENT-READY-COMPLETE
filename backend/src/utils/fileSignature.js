/** Conservative content-signature checks; these do not replace malware scanning. */
const MIME={jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm'};
export function detectMime(head){
 if(!Buffer.isBuffer(head)||head.length<12)return '';
 if(head[0]===0xff&&head[1]===0xd8&&head[2]===0xff)return MIME.jpeg;
 if(head.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return MIME.png;
 if(['GIF87a','GIF89a'].includes(head.subarray(0,6).toString('ascii')))return MIME.gif;
 if(head.subarray(0,4).toString()==='RIFF'&&head.subarray(8,12).toString()==='WEBP')return MIME.webp;
 if(head.subarray(0,5).toString()==='%PDF-')return MIME.pdf;
 if(head.subarray(0,8).equals(Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1])))return MIME.doc;
 // ZIP document verification requires both OOXML markers (read ZIP directory/tail too).
 if(head.subarray(0,4).equals(Buffer.from([0x50,0x4b,0x03,0x04])))return 'application/zip';
 if(head.subarray(4,8).toString()==='ftyp'){
  const brand=head.subarray(8,12).toString();
  if(['avif','avis','heic','heix','mif1','msf1'].includes(brand))return ''; // Not accepted.
  if(brand==='qt  ')return MIME.mov;
  if(['isom','iso2','mp41','mp42','avc1','M4V ','MSNV','dash'].includes(brand))return MIME.mp4;
 }
 if(head.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]))&&head.includes(Buffer.from('webm')))return MIME.webm;
 return '';
}
export function validateSignature(head,tail,claimed){
 const detected=detectMime(head);
 if(detected==='application/zip'&&claimed===MIME.docx){
  const directory=Buffer.concat([head,tail]);
  if(directory.includes(Buffer.from('[Content_Types].xml'))&&directory.includes(Buffer.from('word/document.xml'))&&!directory.includes(Buffer.from('vbaProject.bin')))return MIME.docx;
  throw Object.assign(new Error('The uploaded file is not a supported Word document.'),{status:400});
 }
 if(!detected||detected!==claimed)throw Object.assign(new Error('File content does not match its declared type. Upload a supported, unmodified file.'),{status:400});
 return detected;
}
