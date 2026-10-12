import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root='/workspace/capiro-integration';
const env={...process.env,PORT:'5199',HOSTNAME:'127.0.0.1',NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1'};
for(const key of ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY','CLERK_SECRET_KEY','CORE_API_BASE_URL','STRATEGY_API_BASE_URL','WORKSPACE_API_BASE_URL','INTELLIGENCE_API_BASE_URL','MERI_API_BASE_URL'])env[key]='';
const lines=(await readFile(`${root}/apps/web/deployment/portfolio/smoke.sh`,'utf8')).split('\n');
const bodyAssertion=lines[lines.findIndex(line=>line==='probe /sign-in 200')+1];
const expected=bodyAssertion.match(/^grep -q '([^']+)'/)[1];
let log='';
const server=spawn(process.execPath,[`${root}/apps/web/.next/standalone/apps/web/server.js`],{cwd:root,env,stdio:['ignore','pipe','pipe']});
server.stdout.on('data',data=>log+=data);server.stderr.on('data',data=>log+=data);
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('server readiness timeout')),15000);server.stdout.on('data',()=>{if(log.includes('Ready')){clearTimeout(timer);resolve();}});server.once('error',reject);});
 const response=await fetch('http://127.0.0.1:5199/sign-in',{signal:AbortSignal.timeout(5000)});const body=await response.text();
 const record={scope:'Actual unconfigured Next standalone server; checks shipping body assertion only. Not a container/runtime/image qualification.',applicationSource:'9fa5e2cb68bc2b15f2dddc5dd2a846756a5b6c9e (application bytes unchanged at988b244)',status:response.status,expectedShippingBody:expected,actualHeading:'Sign-in setup required',actualHeadingPresent:body.includes('Sign-in setup required'),matchesShippingBody:body.includes(expected),nosniff:response.headers.get('x-content-type-options'),frameOptions:response.headers.get('x-frame-options'),poweredBy:response.headers.get('x-powered-by'),bodySha256:createHash('sha256').update(body).digest('hex')};
 console.log(JSON.stringify(record,null,2));
 process.exitCode=record.status===200&&record.matchesShippingBody&&record.actualHeadingPresent&&record.nosniff==='nosniff'&&record.frameOptions==='DENY'&&record.poweredBy===null?0:1;
}finally{server.kill('SIGTERM');await once(server,'exit');}
