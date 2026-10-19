import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from '/workspace/capiro-onboard-port-20261013/node_modules/typescript/lib/typescript.js';
import {createRequire} from 'node:module';
const require=createRequire('/workspace/capiro-onboard-port-20261013/apps/web/package.json');
const {QueryClient}=require('@tanstack/react-query');
const out='/tmp/capiro-onboard-feature-independent-review-20261013/current-followup/silent-adoption';
const sourcePath=process.argv[2],name=process.argv[3];const source=fs.readFileSync(sourcePath,'utf8');
class CapiroApiError extends Error {constructor(status,msg){super(msg);this.status=status;}}
const KEY=['funnel','session'];
const imports={'./funnel-lifetime':{FUNNEL_SESSION_KEY:KEY},'@/shared/capiro/http':{CapiroApiError}};
const module={exports:{}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,DOMException,require(n){if(!(n in imports))throw Error('Unexpected import '+n);return imports[n]}});
const results=[];
for(const staleOutcome of [200,403]){
 const cache=new QueryClient();const initial={sessionId:'A',state:'plan_selected',plan:'paid'};cache.setQueryData(KEY,initial);
 let resolve,reject;const held=new Promise((a,b)=>{resolve=a;reject=b});
 let oldContinuation=0;
 const old=module.exports.refreshFunnelSession(cache,()=>held).then(value=>{oldContinuation++;return{value} },error=>({error:{name:error.name,message:error.message}}));
 const current={...initial,state:'legal_accepted'};
 await module.exports.refreshFunnelSession(cache,async()=>current);
 if(staleOutcome===200)resolve(initial);else reject(new CapiroApiError(403,'old denied'));
 const oldResult=await old;
 const pass=oldContinuation===0&&oldResult.error?.name==='AbortError'&&JSON.stringify(cache.getQueryData(KEY))===JSON.stringify(current);
 results.push({staleOutcome,oldContinuation,oldResult,current:cache.getQueryData(KEY),expected:'Replacement read remains canonical but cannot satisfy superseded original deliberate read',pass});
 cache.clear();
}
const receipt={atUTC:new Date().toISOString(),method:'Captured production helper transpiled to CJS; actual installed QueryClient; synthetic promise/status fixtures only. No React/browser/network/native request.',sourcePath,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),results};
fs.writeFileSync(out+'/'+name+'.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));process.exitCode=results.every(r=>r.pass)?0:1;
