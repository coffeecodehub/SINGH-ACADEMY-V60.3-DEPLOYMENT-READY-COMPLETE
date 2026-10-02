/** Source functions executed with explicit dependency stubs. These are not HTTP/MongoDB integration tests. */
import fs from 'node:fs';
export function load(relative,deps,expression){
 const url=new URL(relative,import.meta.url);
 const code=fs.readFileSync(url,'utf8').replace(/import\s+[\s\S]*?\sfrom\s+['"][^'"]+['"];?/g,'').replace(/export\s+default\s+[^;]+;/g,'').replace(/export\s*\{[^}]*\};?/g,'').replace(/export\s+(?=(?:async\s+)?(?:function|const|let|class))/g,'');
 return Function(...Object.keys(deps),code+';return '+expression)(...Object.values(deps));
}
export function response(){return {code:200,cookies:[],cleared:[],status(code){this.code=code;return this;},json(body){this.body=body;return this;},cookie(...args){this.cookies.push(args);return this;},clearCookie(...args){this.cleared.push(args);return this;},set(){return this;}};}
export const query=value=>({session:()=>Promise.resolve(value),select:()=>query(value),sort:()=>query(value),limit:()=>query(value),lean:async()=>value,then:(resolve,reject)=>Promise.resolve(value).then(resolve,reject)});
