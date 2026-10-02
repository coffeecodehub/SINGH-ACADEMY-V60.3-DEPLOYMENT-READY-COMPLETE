import 'dotenv/config';
import {verifyMailer,closeMailer} from '../utils/mailer.js';
try{await verifyMailer();console.log('SMTP connection/authentication passed. This does not prove inbox delivery; test verification and reset emails.');}
catch(error){console.error('SMTP check failed:',error.code||error.message);process.exitCode=1;}
finally{closeMailer();}
