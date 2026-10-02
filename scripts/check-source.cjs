/** Syntax and relative-import check. This does NOT replace a real tsc/Next build. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
let ts;
try{ts=require(process.env.TYPESCRIPT_PATH||path.join(root,'frontend/node_modules/typescript'));}
catch{console.error('Install frontend dependencies first (or set TYPESCRIPT_PATH to a TypeScript installation).');process.exit(1);}
function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(d=>d.isDirectory()&&!['node_modules','.next','.tmp-uploads'].includes(d.name)?walk(path.join(p,d.name)):d.isFile()?[path.join(p,d.name)]:[])}
const frontend=walk(path.join(root,'frontend')).filter(f=>/\.(ts|tsx)$/.test(f)),backend=walk(path.join(root,'backend')).filter(f=>/\.js$/.test(f));let errors=0,imports=0;
for(const f of frontend){const source=ts.createSourceFile(f,fs.readFileSync(f,'utf8'),ts.ScriptTarget.Latest,true,f.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);for(const d of source.parseDiagnostics){errors++;console.error(path.relative(root,f),d.start,ts.flattenDiagnosticMessageText(d.messageText,'\n'));}
 function inspect(node){if(ts.isImportDeclaration(node)&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)){const spec=node.moduleSpecifier.text;if(spec.startsWith('.')){imports++;const base=path.resolve(path.dirname(f),spec);if(!['','.ts','.tsx','.js','.json','.css','/index.ts','/index.tsx'].some(ext=>fs.existsSync(base+ext))){errors++;console.error('Missing import:',path.relative(root,f),spec);}}}ts.forEachChild(node,inspect);}inspect(source);
}
for(const f of backend){const check=cp.spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(check.status!==0){errors++;console.error(path.relative(root,f),check.stderr)}}
console.log(`Frontend: ${frontend.length} TS/TSX files parsed.`);console.log(`Backend: ${backend.length} JavaScript files checked.`);console.log(`Relative frontend imports checked: ${imports}.`);console.log(`Syntax/import errors: ${errors}.`);console.log('Scope: syntax and local file resolution only; dependency types, MongoDB, browsers and production build are not verified here.');process.exitCode=errors?1:0;
