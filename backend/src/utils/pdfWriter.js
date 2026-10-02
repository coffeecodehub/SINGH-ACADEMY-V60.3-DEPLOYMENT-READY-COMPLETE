/** Local deterministic PDF writer; no remote resources or executable actions. */
export function assemblePdf(objects,{root=1,info=objects.length}={}){
 const chunks=[Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n','binary')],offsets=[0];let position=chunks[0].length;
 objects.forEach((object,i)=>{offsets.push(position);const part=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`),Buffer.isBuffer(object)?object:Buffer.from(object,'ascii'),Buffer.from('\nendobj\n')]);chunks.push(part);position+=part.length;});
 chunks.push(Buffer.from(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root ${root} 0 R /Info ${info} 0 R >>\nstartxref\n${position}\n%%EOF\n`));return Buffer.concat(chunks);
}
export function pdfStream(data,attributes=''){return Buffer.concat([Buffer.from(`<< ${attributes} /Length ${data.length} >>\nstream\n`),data,Buffer.from('\nendstream')]);}
