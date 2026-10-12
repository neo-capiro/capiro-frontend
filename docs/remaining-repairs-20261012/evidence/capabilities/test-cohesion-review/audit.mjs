import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { scanModule } from '/workspace/capiro-remaining/scripts/architecture/scan.mjs';
const repo='/workspace/capiro-remaining';
const out='/tmp/capiro-remaining-capabilities-evidence/test-cohesion-review';
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8'});
const pin=git('rev-parse','HEAD').trim();
const base=git('rev-parse','7aca86e').trim();
const recordText=await readFile('/tmp/capiro-remaining-root-evidence/changed-test-size-findings-partial.json','utf8');
const signals=JSON.parse(recordText);
await writeFile(`${out}/input-signals.json`,recordText);
const scans=[];
const sources=new Map();
for(const signal of signals){
 const source=git('show',`${pin}:${signal.file}`);
 const sha256=createHash('sha256').update(source).digest('hex');
 const actual=scanModule(signal.file,source).sizeFindings.find(x=>x.kind===signal.kind&&x.symbol===signal.symbol);
 let original;
 try {const before=git('show',`${base}:${signal.file}`); original=scanModule(signal.file,before).sizeFindings.find(x=>x.kind===signal.kind&&x.symbol===signal.symbol);} catch {}
 const working=await readFile(`${repo}/${signal.file}`,'utf8');
 scans.push({...signal,actual,sourceMatchesRecord:sha256===signal.sha256,signalMatchesRecord:!!actual&&['fingerprint','nonblank','line'].every(k=>actual[k]===signal[k]),workingMatchesCommit:working===source,baselineSignal:original??null,classification:!original?'new':original.fingerprint===actual.fingerprint?'inherited-unchanged':'changed'});
 sources.set(signal.file,source);
}
for(const path of ['apps/web/test/browser/next-modules-fixtures.ts','apps/web/test/browser/fixtures.ts','apps/web/test/browser/main.tsx','apps/web/tests/calendar-sharing-fixtures.ts','apps/web/tests/browser/calendar-sharing-harness.tsx','apps/web/tests/browser/email-compose-harness.tsx']) sources.set(path,git('show',`${pin}:${path}`));
for(const [path,source] of sources){await mkdir(dirname(`${out}/reviewed-source/${path}`),{recursive:true}); await writeFile(`${out}/reviewed-source/${path}`,source);}
const result={createdAtUtc:new Date().toISOString(),base,pin,record:'/tmp/capiro-remaining-root-evidence/changed-test-size-findings-partial.json',signals:scans,sourceFiles:[...sources].map(([path,source])=>({path,sha256:createHash('sha256').update(source).digest('hex')}))};
await writeFile(`${out}/source-and-signal-audit.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({pin,signals:scans.length,mismatches:scans.filter(x=>!x.sourceMatchesRecord||!x.signalMatchesRecord||!x.workingMatchesCommit).length,classifications:scans.map(x=>[x.file,x.symbol,x.classification])}));
