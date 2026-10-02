import nodemailer from 'nodemailer';
import {emailOk} from './security.js';
let transport=null;
function transporter(){
 if(!process.env.SMTP_HOST)return null;
 if(!transport)transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',
  requireTLS:process.env.NODE_ENV==='production'&&process.env.SMTP_SECURE!=='true',
  connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000,
  pool:true,maxConnections:2,maxMessages:100,
  disableFileAccess:true,disableUrlAccess:true,
  tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},
  auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}:undefined});
 return transport;
}
export function closeMailer(){transport?.close();transport=null;}
export async function verifyMailer(){const tx=transporter();if(!tx)throw new Error('SMTP_HOST is not configured.');return tx.verify();}
export async function sendAcademyEmail({to,subject,html,text}){
 if(!emailOk(to)||typeof subject!=='string'||/[\r\n]/.test(subject))throw new Error('Invalid mail recipient or subject.');
 const tx=transporter();
 if(!tx){if(process.env.NODE_ENV==='production')throw new Error('SMTP is required for email delivery.');console.log(`\n[LOCAL DEVELOPMENT EMAIL ONLY]\nTo: ${to}\n${subject}\n${text||''}\n`);return {dev:true};}
 return tx.sendMail({from:process.env.EMAIL_FROM||'Singh Academy <no-reply@singhacademy.com>',to:{address:to,name:''},subject,html,text,disableFileAccess:true,disableUrlAccess:true});
}
