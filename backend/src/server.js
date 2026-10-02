import 'dotenv/config';
import {createServer} from 'node:http';
import mongoose from 'mongoose';
import {connectDB} from './config/db.js';
import {createApp} from './app.js';
import {assertEnvironment} from './utils/deployment.js';
import {closeMailer} from './utils/mailer.js';
import {startStudentNotificationWorker} from './services/studentNotifications.js';
import Enrollment from './models/Enrollment.js';
import {ensureEnrollmentIndexes} from './utils/enrollmentIndexes.js';
let server, stopping=false,stopNotifications=async()=>{};
async function shutdown(signal,code=0){
  if(stopping)return; stopping=true;
  console.log(JSON.stringify({event:'shutdown',signal}));
  const deadline=setTimeout(()=>process.exit(1),15000);deadline.unref();
  if(server){server.closeIdleConnections?.();await new Promise(resolve=>server.close(resolve));}
  await stopNotifications();closeMailer();await mongoose.disconnect();clearTimeout(deadline);process.exit(code);
}
async function start(){
  assertEnvironment();await connectDB();
  const droppedEnrollmentIndexes=await ensureEnrollmentIndexes(Enrollment.collection);
  if(droppedEnrollmentIndexes.length)console.log(`Removed legacy enrollment index(es): ${droppedEnrollmentIndexes.join(', ')}.`);
  if(process.env.NODE_ENV==='production'){
    const hello=await mongoose.connection.db.admin().command({hello:1});
    if(!hello.setName&&hello.msg!=='isdbgrid')throw new Error('Production business operations require MongoDB Atlas or a replica set.');
  }
  const app=createApp();
  server=createServer(app);
  server.once('listening',()=>{console.log(`Singh Academy V60.3 API listening on port ${process.env.PORT||5000}.`);stopNotifications=startStudentNotificationWorker();});
  server.requestTimeout=1800000; // Allow large course uploads while keeping an explicit 30-minute upper bound.
  server.headersTimeout=20000;server.keepAliveTimeout=5000;
  server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${process.env.PORT||5000} is already in use. Stop the previous backend terminal, then retry. Do not terminate unrelated processes.`:'Listener failed: '+(error.code||'SERVER_ERROR'));void shutdown('listen_error',1);});
  server.listen(Number(process.env.PORT||5000),'0.0.0.0');
}
process.on('SIGTERM',()=>void shutdown('SIGTERM'));
process.on('SIGINT',()=>void shutdown('SIGINT'));
start().catch(error=>{console.error('Backend startup failed:',error.message);void shutdown('startup_error',1);});
