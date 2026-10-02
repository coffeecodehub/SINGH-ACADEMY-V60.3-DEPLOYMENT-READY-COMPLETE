import fs from 'node:fs';
import {assemblePdf,pdfStream} from '../utils/pdfWriter.js';import {amountOf,businessError} from '../utils/business.js';
const metrics=JSON.parse(fs.readFileSync(new URL('../assets/certificate-widths.json',import.meta.url),'utf8'));
// Unicode originals remain in My Billing. The PDF uses explicit ASCII substitution rather than malformed glyphs.
const display=s=>String(s??'Not recorded').replace(/[\r\n\x00-\x1f]/g,' ').replace(/[^\x20-\x7e]/g,'?');
const literal=s=>'('+display(s).replace(/[()\\]/g,'\\$&')+')';
const width=(s,size)=>[...display(s)].reduce((n,c)=>n+(metrics.Helvetica[c.charCodeAt(0)]||600),0)/1000*size;
function wrap(s,size,max){const lines=[];let line='';for(const c of display(s)){if(width(line+c,size)>max&&line){lines.push(line);line='';}line+=c;}if(line)lines.push(line);return lines;}
export function createReceiptPdf(payment,invoice,user){
 const minor=amountOf(payment);if(minor===null||payment.status!=='paid')throw businessError('A paid receipt is not available.',404);
 const paid=payment.paidAt?new Date(payment.paidAt):null;if(paid&&!Number.isFinite(+paid))throw businessError('The recorded payment date needs review.',409);
 const date=paid?paid.toISOString().slice(0,10)+' (UTC)':'Not recorded',currency=payment.currency||'USD';
 const text=(s,x,y,size=11,bold=false)=>`BT .16 .18 .21 rg /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x} ${y} Tm ${literal(s)} Tj ET`;
 const lines=['.98 .97 .95 rg 0 0 595.28 841.89 re f','.63 .40 .23 rg 0 811 595.28 31 re f',text('SINGH ACADEMY',48,768,17,true),text('Payment receipt',48,717,28,true),text(payment.testMode?'SANDBOX RECORD - NO REAL MONEY':'Recorded payment confirmation',48,687,10),'.85 .8 .74 RG 48 667 m 547 667 l S'];
 const rows=[['Invoice',invoice?.number||String(payment.invoice||'Not recorded')],['Receipt ID',String(payment._id)],['Customer',user?.name||'Student'],['Account email',user?.email||'Not recorded'],['Course / plan',invoice?.title||payment.courseSlug||payment.kind],['Payment method',payment.provider],['Transaction reference',payment.providerPaymentId||payment.reference||'Not recorded'],['Payment date',date],['Amount received',currency+' '+(minor/100).toFixed(2)]];
 let y=625;
 for(const [label,value]of rows){const size=label==='Amount received'?18:10.5,parts=wrap(value,size,335),height=Math.max(37,parts.length*(size+2)+14);if(y-height<190)throw businessError('This receipt contains unusually long fields. Review the full records in My Billing.',409);lines.push(text(label,48,y,9,true));parts.forEach((line,i)=>lines.push(text(line,210,y-i*(size+2),size,label==='Amount received')));y-=height;}
 lines.push(text('This receipt records the payment stored by the Academy.',48,162,10),text('A student-uploaded screenshot is supporting material, not bank verification.',48,143,9),text('This document is not a tax invoice. Original names appear in My Billing.',48,124,9),text('View current invoice and access status in your Singh Academy account.',48,86,9));
 return assemblePdf(['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',pdfStream(Buffer.from(lines.join('\n'),'ascii')),'<< /Title (Singh Academy Payment Receipt) /Author (Singh Academy) >>']);
}
