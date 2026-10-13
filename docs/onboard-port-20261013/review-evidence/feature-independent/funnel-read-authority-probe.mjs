import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from '/workspace/capiro-onboard-port-20261013/node_modules/typescript/lib/typescript.js';
import {createRequire} from 'node:module';
const require=createRequire('/workspace/capiro-onboard-port-20261013/apps/web/package.json');
const {QueryClient}=require('@tanstack/react-query');
const out='/tmp/capiro-onboard-feature-independent-review-20261013',prefix='apps/web/src/features/onboard/lib/';
const bindings=[];
function load(file,imports){const source=fs.readFileSync(`${out}/initial-source/${prefix}${file}`,'utf8');bindings.push({file:prefix+file,sha256:crypto.createHash('sha256').update(source).digest('hex')});const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,DOMException,require(name){if(!(name in imports))throw Error('Unexpected import '+name);return imports[name];}},{filename:file});return module.exports;}
const journal=load('attempt-journal.ts',{});const lifetime=load('funnel-lifetime.ts',{'./attempt-journal':journal});
const results=[];
for(const status of [403,503]){
 const cache=new QueryClient();cache.setQueryData(lifetime.FUNNEL_SESSION_KEY,{sessionId:'A',state:'plan_selected',plan:'paid'});
 const api={getSession:async()=>{throw Object.assign(Error('Current native session unavailable'),{status})}};
 const funnel=load('funnel.ts',{'./funnel-lifetime':lifetime,'@clerk/nextjs':{},'@tanstack/react-query':{useQueryClient:()=>cache},'@/shared/capiro/onboard-api':{useOnboardApi:()=>({funnel:api})},'@/shared/capiro/http':{CapiroApiError:Error},'./registration-draft':{},'./dates':{}});
 const owner=lifetime.createFunnelLifetime(cache,'A'),reader=owner.attempt('review-current'),close=reader.mount();
 const before=cache.getQueryState(lifetime.FUNNEL_SESSION_KEY).status;
 let error;try{await funnel.useAdvanceSession()(reader.guard())}catch(e){error={status:e.status,message:e.message}}
 let calls=0;const other=owner.attempt('other-page-action'),otherClose=other.mount();
 try{await other.run('different write',g=>g.wait(async()=>{calls+=1}))}catch{}
 const after=cache.getQueryState(lifetime.FUNNEL_SESSION_KEY).status;
 results.push({status,before,error,after,cachedSessionId:cache.getQueryData(lifetime.FUNNEL_SESSION_KEY).sessionId,ownerCurrentAfterDeniedRead:owner.current(),syntheticDifferentActionDispatches:calls,expected:'Failed current read makes prior session unavailable for another action until a new successful current read',pass:after==='error'&&calls===0});
 close();otherClose();cache.clear();
}
const receipt={atUTC:new Date().toISOString(),method:'Exact captured useAdvanceSession, createFunnelLifetime and attempt-journal functions; actual QueryClient; synthetic hook getters/API rejection and synthetic effect counter only. No React mount, network or provider.',bindings:[...new Map(bindings.map(b=>[b.file,b])).values()],results};
fs.writeFileSync(out+'/FUNNEL-READ-AUTHORITY-PROBE.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));process.exitCode=results.every(r=>r.pass)?0:1;
