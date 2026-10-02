import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {runNpm} from './commands.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for(const dir of ['backend','frontend']){const cwd=path.join(root,dir);console.log(`Installing ${dir} dependencies...`);runNpm([fs.existsSync(path.join(cwd,'package-lock.json'))?'ci':'install'],cwd);}
console.log('Review and commit both generated package-lock.json files. Run npm run verify before release. Never use --force to hide a dependency conflict.');
