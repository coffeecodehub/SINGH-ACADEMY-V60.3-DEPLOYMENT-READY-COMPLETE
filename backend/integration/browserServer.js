/** Local browser fixture server. Generated database only; no public deployment endpoint. */
import {isolatedDatabase,testEnvironment} from './isolation.js';
const isolated=isolatedDatabase('sa_v46_browser_test_');testEnvironment();
const mongoose=(await import('mongoose')).default;
const {createApp}=await import('../src/app.js');
await mongoose.connect(isolated.uri,{dbName:isolated.dbName,autoIndex:false,serverSelectionTimeoutMS:10000});
for(const M of Object.values(mongoose.models))await M.createIndexes();
const server=createApp().listen(5000,'127.0.0.1',()=>console.log('Isolated browser test API listening on localhost:5000.'));
let closing=false;async function stop(){if(closing)return;closing=true;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));try{await isolated.cleanup(mongoose);}finally{await mongoose.disconnect();process.exit();}}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
