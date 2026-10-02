import 'dotenv/config';
import {checkEnvironment} from '../utils/deployment.js';
const result=checkEnvironment(process.env);
for(const warning of result.warnings)console.warn('WARNING:',warning);
for(const error of result.errors)console.error('ERROR:',error);
if(result.errors.length)process.exitCode=1;
else console.log(`Environment checks passed (${result.production?'production':'development'}). This is configuration validation, not a live service test.`);
