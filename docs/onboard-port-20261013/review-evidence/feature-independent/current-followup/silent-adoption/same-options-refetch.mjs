import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from '/workspace/capiro-onboard-port-20261013/node_modules/typescript/lib/typescript.js';
import {createRequire} from 'node:module';
const require=createRequire('/workspace/capiro-onboard-port-20261013/apps/web/package.json');
const {QueryClient}=require('@tanstack/react-query');
const out='/tmp/capiro-onboard-feature-independent-review-20261013/current-followup/silent-adoption';
const sourcePath='/workspace/capiro-onboard-port-20261013/apps/web/src/features/onboard/lib/funnel-session-read.ts';
const source=fs.readFileSync(sourcePath,'utf8');fs.writeFileSync(out+'/before-same-options-refetch.ts',source);
class CapiroApiError extends Error {constructor(status,msg){super(msg);this.status=status;}}
const KEY=['funnel','session'];
const imports={'./funnel-lifetime':{FUNNEL_SESSION_KEY:KEY},'@/shared/capiro/http':{CapiroApiError}};
const module={exports:{}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,DOMException,require(n){if(!(n in imports))throw Error('Unexpected import '+n);return imports[n]}});
const results=[];
for(const staleOutcome of [200,403]){
 const cache=new QueryClient();const initial={sessionId:'A',state:'plan_selected',plan:'paid'};cache.setQueryData(KEY,initial);
 let resolve,reject,calls=0;const held=new Promise((a,b)=>{resolve=a;reject=b});
 const current={...initial,state:'legal_accepted'};
 let oldContinuation=0;
 const old=module.exports.refreshFunnelSession(cache,()=>++calls===1?held:Promise.resolve(current)).then(value=>{oldContinuation++;return{value}},error=>({error:{name:error.name,message:error.message}}));
 await cache.refetchQueries({queryKey:KEY,exact:true});
 if(staleOutcome===200)resolve(initial);else reject(new CapiroApiError(403,'old denied'));
 const oldResult=await old;
 const pass=oldContinuation===0&&oldResult.error?.name==='AbortError'&&JSON.stringify(cache.getQueryData(KEY))===JSON.stringify(current);
 results.push({staleOutcome,calls,oldContinuation,oldResult,current:cache.getQueryData(KEY),expected:'Canonical refetch of same query options cannot replace captured original dispatch signal or satisfy canceled deliberate caller',pass});
 cache.clear();
}
const receipt={atUTC:new Date().toISOString(),method:'Exact current helper; actual QueryClient.refetchQueries; synthetic promise/status fixtures only. No React/browser/network/native request.',sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),results};
fs.writeFileSync(out+'/SAME-OPTIONS-REFETCH.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));process.exitCode=results.every(r=>r.pass)?0:1;
