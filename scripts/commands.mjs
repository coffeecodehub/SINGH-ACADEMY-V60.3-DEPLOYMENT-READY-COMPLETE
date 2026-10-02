import {spawnSync} from 'node:child_process';
export function runNpm(args,cwd,{env=process.env}={}){
 const windows=process.platform==='win32';
 const result=spawnSync(windows?'cmd.exe':'npm',windows?['/d','/s','/c','npm',...args]:args,{cwd,env,stdio:'inherit'});
 if(result.error)throw result.error;if(result.status!==0)throw new Error(`npm ${args.join(' ')} failed (${result.status??'not started'}). Stop and resolve this error before deployment.`);
}
