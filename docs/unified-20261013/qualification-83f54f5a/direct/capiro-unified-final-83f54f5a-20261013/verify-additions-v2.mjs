import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
const root='/workspace/capiro-onboard-port-20261013';
const output='/tmp/capiro-unified-final-83f54f5a-20261013/actual-additions-v2';
const {chromium}=createRequire(join(root,'package.json'))('@playwright/test');
const origin='http://localhost:5188';
await mkdir(output,{recursive:false});
const env={...process.env,NODE_ENV:'production',PORT:'5188',HOSTNAME:'127.0.0.1',NEXT_TELEMETRY_DISABLED:'1',CAPIRO_DEFAULT_PRODUCT:''};
for(const name of ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY','CLERK_SECRET_KEY','TRACKER_BACKEND','CORE_API_BASE_URL','STRATEGY_API_BASE_URL','WORKSPACE_API_BASE_URL','INTELLIGENCE_API_BASE_URL','ONBOARD_API_BASE_URL','MERI_API_BASE_URL','MERI_ACTION_WORKFLOW_ENABLED','CAPIRO_EXISTING_APP_URL','CAPIRO_MERI_URL','CAPIRO_MODULES_URL','CAPIRO_WORKSPACE_URL']) env[name]='';
const server=spawn(process.execPath,[join(root,'apps/web/.next/standalone/apps/web/server.js')],{cwd:root,env,stdio:['ignore','pipe','pipe']});
let log='',browser,failure;
server.stdout.on('data',c=>{log+=c});server.stderr.on('data',c=>{log+=c});
const results={source:'83f54f5ac0107822833adbbfef2b453e0240bc56',startedUTC:new Date().toISOString(),scope:'Unconfigured actual Next standalone, no service interception or real identity/provider execution',http:[],assets:[],browser:[],pageErrors:[],remoteRequests:[]};
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Standalone readiness timeout')),30000);server.once('error',e=>{clearTimeout(timer);reject(e)});server.once('exit',code=>{clearTimeout(timer);reject(Error(`Early server exit ${code}`))});server.stdout.on('data',()=>{if(log.includes('Ready')){clearTimeout(timer);resolve()}})});
 const onboard=['/register','/verify','/plan','/legal','/billing','/admins','/clients','/org','/confirm','/accept-invite','/setup','/it/synthetic-local-capability','/it/done','/it/error'];
 for(const path of [...onboard,'/meri/actions']){
  const response=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(10000)});const text=await response.text();assert.equal(response.status,200,path);assert.ok(text.includes(path==='/meri/actions'?'Connection setup required':'Onboarding setup required'),path);assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  if(path.startsWith('/it/')){assert.equal(response.headers.get('referrer-policy'),'no-referrer');assert.ok(response.headers.get('cache-control').includes('no-store'));assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow')}
  results.http.push({path,status:response.status,explicitSetup:true,cacheControl:response.headers.get('cache-control')});
 }
 for(const operation of ['session','query','draft','prepare','execute','approve']){
  const path='/api/action-followthrough/'+operation;const response=await fetch(origin+path,{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}',redirect:'error',signal:AbortSignal.timeout(10000)});assert.equal(response.status,operation==='approve'?404:503,path);assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(await response.json(),{error:{code:'FRONTEND_ACTION_UNAVAILABLE'}});results.http.push({path,status:response.status,noRemoteDisposition:true});
 }
 for(const foreignOrigin of ['http://127.0.0.1:5188','https://foreign.example.test']){const response=await fetch(origin+'/api/action-followthrough/session',{method:'POST',headers:{origin:foreignOrigin,'content-type':'application/json'},body:'{}',redirect:'error',signal:AbortSignal.timeout(10000)});assert.equal(response.status,400);results.http.push({path:'/api/action-followthrough/session',foreignOrigin,status:response.status,rejectedOrigin:true});}
 async function visit(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const file=join(directory,entry.name);if(entry.isDirectory())await visit(file);else{const bytes=await readFile(file);const path=file.slice(join(root,'apps/web/public').length);const response=await fetch(origin+path,{headers:{'Accept-Encoding':'identity'},signal:AbortSignal.timeout(10000)});const served=Buffer.from(await response.arrayBuffer());assert.equal(response.status,200,path);assert.deepEqual(served,bytes,path);results.assets.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})}}}
 await visit(join(root,'apps/web/public/onboard'));assert.equal(results.assets.length,6);assert.equal(results.assets.reduce((s,x)=>s+x.bytes,0),458104);
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-dev-shm-usage']});results.browserVersion=browser.version();
 for(const width of [1440,375]){
  const page=await browser.newPage({viewport:{width,height:900}});page.setDefaultTimeout(15000);page.on('pageerror',e=>results.pageErrors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(origin+'/')&&!r.url().startsWith('data:'))results.remoteRequests.push(r.url())});
  await page.goto(origin+'/meri');await page.getByRole('link',{name:'Recommendation actions'}).click();await page.waitForURL('**/meri/actions');await page.getByRole('heading',{name:'Connection setup required'}).waitFor();assert.equal(await page.getByRole('button',{name:'Connect action service',exact:true}).count(),0);
  await page.getByRole(width===375?'link':'button',{name:'Conversations',exact:true}).click();await page.waitForURL('**/meri');await page.goBack();await page.waitForURL('**/meri/actions');await page.goForward();await page.waitForURL('**/meri');
  await page.goto(origin+'/register');await page.getByRole('heading',{name:'Onboarding setup required'}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:join(output,`onboard-unconfigured-${width}.png`)});
  await page.goto(origin+'/it/synthetic-local-capability');await page.getByRole('heading',{name:'Onboarding setup required'}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));results.browser.push({width,meriNavigationAndHistory:true,onboardPublicSetup:true});await page.close();
 }
 assert.deepEqual(results.pageErrors,[]);assert.deepEqual(results.remoteRequests,[]);
}catch(error){failure=error}finally{if(browser)await browser.close();if(server.pid&&server.exitCode===null){const exit=once(server,'exit');server.kill('SIGTERM');const t=setTimeout(()=>server.kill('SIGKILL'),5000);try{await exit}finally{clearTimeout(t)}}results.endedUTC=new Date().toISOString();results.success=!failure;results.error=failure?.stack??null;await writeFile(join(output,'standalone.log'),log,{flag:'wx'});await writeFile(join(output,'results.json'),JSON.stringify(results,null,2)+'\n',{flag:'wx'})}
if(failure)throw failure;console.log(JSON.stringify({http:results.http.length,assets:results.assets.length,browser:results.browser.length,success:true}));
