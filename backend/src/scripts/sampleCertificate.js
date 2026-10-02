/** Dependency-free local PDF check. Output is visibly marked SAMPLE, never an issued document. */
import fs from 'node:fs';import path from 'node:path';import {createCertificatePdf} from '../services/certificatePdf.js';
const file=path.resolve('qa/certificate-sample.pdf');fs.mkdirSync(path.dirname(file),{recursive:true});
const pdf=createCertificatePdf({studentName:'yasir',courseTitle:'Public Speaking Master Class',completedAt:'2026-09-29T12:00:00Z',issuedAt:'2026-09-29T12:00:00Z',issuedBy:'Singh Academy Admin',number:'SA-SAMPLE-000001',verificationUrl:'https://example.invalid/certificates/verify/'+'0'.repeat(48),sample:true});fs.writeFileSync(file,pdf);console.log('Sample certificate PDF created at',file);
