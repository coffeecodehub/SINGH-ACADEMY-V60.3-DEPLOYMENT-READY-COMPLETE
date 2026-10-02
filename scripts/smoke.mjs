/** Safe anonymous HTTP checks; never prints bodies containing private data. */
const arg=process.argv.find(x=>x.startsWith('--url=')),base=(arg?.slice(6)||'http://localhost:3000').replace(/\/$/,'');
const u=new URL(base);if(!['https:','http:'].includes(u.protocol))throw new Error('Use an HTTP/HTTPS origin.');
let failed=0;
for(const [route,expected]of [['/login',200],['/admin/login',200],['/super-admin/login',200],['/api/health',200],['/api/health/ready',200],['/api/business/overview',401],['/api/admin/system-overview',401]]){
 try{const start=performance.now(),r=await fetch(base+route,{redirect:'manual',signal:AbortSignal.timeout(15000)});const ok=r.status===expected;
  console.log(`${ok?'PASS':'FAIL'} ${route}: HTTP ${r.status} (${Math.round(performance.now()-start)} ms, this machine/network only)`);if(!ok)failed++;
  if(route==='/login'&&u.protocol==='https:'){for(const header of ['content-security-policy','strict-transport-security','x-content-type-options'])if(!r.headers.has(header)){console.error(`FAIL missing ${header}`);failed++;}}
 }catch(e){failed++;console.error(`FAIL ${route}: ${e.name}`);}
}
if(failed)process.exitCode=1;else console.log('Anonymous smoke checks passed. They do not test authenticated billing, email delivery, uploads, load or backups.');
