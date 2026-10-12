import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(out,'../../../../..');
const log=fs.openSync(path.join(out,'server.stdout.bin'),'wx');
const err=fs.openSync(path.join(out,'server.stderr.bin'),'wx');
const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','35094'],{cwd:path.join(root,'apps/web'),env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',CI:'true'},detached:true,stdio:['ignore',log,err]});
const receipt={ownedPid:child.pid,origin:'http://127.0.0.1:35094',borrowedDependenciesModified:false,productionBuildServer:true};
let exited=false;child.on('exit',(code,signal)=>{exited=true;receipt.exitCode=code;receipt.signal=signal;});
try {
 const deadline=Date.now()+45000;let ready=false;
 while(Date.now()<deadline&&!exited){try{const r=await fetch(receipt.origin,{signal:AbortSignal.timeout(2000)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
 if(!ready)throw Error('owned production server readiness failed');
 await import('./browser-check.mjs');
} catch(error){receipt.failure=error.stack;process.exitCode=1;}
finally {
 if(!exited){try{process.kill(-child.pid,'SIGTERM');}catch(error){if(error.code!=='ESRCH')throw error;}}
 const end=Date.now()+5000;while(!exited&&Date.now()<end)await new Promise(r=>setTimeout(r,50));
 if(!exited){try{process.kill(-child.pid,'SIGKILL');}catch(error){if(error.code!=='ESRCH')throw error;}const end2=Date.now()+5000;while(!exited&&Date.now()<end2)await new Promise(r=>setTimeout(r,50));}
 receipt.physicalExitObserved=exited;
 try{process.kill(child.pid,0);receipt.ownedPidAbsent=false;}catch(error){receipt.ownedPidAbsent=error.code==='ESRCH';}
 try{await fetch(receipt.origin,{signal:AbortSignal.timeout(1000)});receipt.portClosed=false;}catch{receipt.portClosed=true;}
 fs.closeSync(log);fs.closeSync(err);fs.writeFileSync(path.join(out,'physical-cleanup.json'),JSON.stringify(receipt,null,2)+'\n');
 if(!receipt.physicalExitObserved||!receipt.ownedPidAbsent||!receipt.portClosed)process.exitCode=1;
 console.log(JSON.stringify({cleanup:receipt}));
}
