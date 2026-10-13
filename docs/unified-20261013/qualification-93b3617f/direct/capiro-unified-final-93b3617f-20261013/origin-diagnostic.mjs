import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
const root='/workspace/capiro-onboard-port-20261013';
const output='/tmp/capiro-unified-final-93b3617f-20261013/origin-diagnostic';
const {chromium}=createRequire(join(root,'package.json'))('@playwright/test');
const origin='http://127.0.0.1:5188';
await mkdir(output,{recursive:false});
const env={...process.env,NODE_ENV:'production',PORT:'5188',HOSTNAME:'127.0.0.1',NEXT_TELEMETRY_DISABLED:'1',CAPIRO_DEFAULT_PRODUCT:''};
for(const name of ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY','CLERK_SECRET_KEY','TRACKER_BACKEND','CORE_API_BASE_URL','STRATEGY_API_BASE_URL','WORKSPACE_API_BASE_URL','INTELLIGENCE_API_BASE_URL','ONBOARD_API_BASE_URL','MERI_API_BASE_URL','MERI_ACTION_WORKFLOW_ENABLED','CAPIRO_EXISTING_APP_URL','CAPIRO_MERI_URL','CAPIRO_MODULES_URL','CAPIRO_WORKSPACE_URL']) env[name]='';
const server=spawn(process.execPath,['--import','/tmp/capiro-unified-final-93b3617f-20261013/request-origin-probe.mjs',join(root,'apps/web/.next/standalone/apps/web/server.js')],{cwd:root,env,stdio:['ignore','pipe','pipe']});
let log='',browser,failure;
server.stdout.on('data',c=>{log+=c});server.stderr.on('data',c=>{log+=c});
const results={source:'93b3617f5d0599f34da373525a96dfc70eaa85d6',startedUTC:new Date().toISOString(),scope:'Unconfigured actual Next standalone, no service interception or real identity/provider execution',http:[],assets:[],browser:[],pageErrors:[],remoteRequests:[]};
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Standalone readiness timeout')),30000);server.once('error',e=>{clearTimeout(timer);reject(e)});server.once('exit',code=>{clearTimeout(timer);reject(Error(`Early server exit ${code}`))});server.stdout.on('data',()=>{if(log.includes('Ready')){clearTimeout(timer);resolve()}})});
 for(const sentOrigin of ['http://127.0.0.1:5188','http://localhost:5188','http://0.0.0.0:5188']){const response=await fetch(origin+'/api/action-followthrough/session',{method:'POST',headers:{origin:sentOrigin,'content-type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)});results.http.push({sentOrigin,status:response.status,body:await response.text()});}
}catch(error){failure=error}finally{if(browser)await browser.close();if(server.pid&&server.exitCode===null){const exit=once(server,'exit');server.kill('SIGTERM');const t=setTimeout(()=>server.kill('SIGKILL'),5000);try{await exit}finally{clearTimeout(t)}}results.endedUTC=new Date().toISOString();results.success=!failure;results.error=failure?.stack??null;await writeFile(join(output,'standalone.log'),log,{flag:'wx'});await writeFile(join(output,'results.json'),JSON.stringify(results,null,2)+'\n',{flag:'wx'})}
if(failure)throw failure;console.log(JSON.stringify({diagnosticOnly:true,http:results.http}));
