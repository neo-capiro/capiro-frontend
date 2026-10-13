import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { scanModule } from '/workspace/capiro-remaining-capabilities/scripts/architecture/scan.mjs';
const repo='/workspace/capiro-remaining',out='/tmp/capiro-remaining-capabilities-evidence/profile-test-review';
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','pipe']});
const pin=git('rev-parse','104495d4').trim(),base=git('rev-parse','7aca86e').trim();
const files=git('diff','--name-only',base,pin).trim().split('\n').filter(p=>/\/(?:tests?|__tests__)\//.test(p)&&/\.[cm]?[jt]sx?$/.test(p));
const scans=[],changed=[];
for(const file of files){
 const source=git('show',`${pin}:${file}`);let prior='',baselineSignals=[];try {prior=git('show',`${base}:${file}`); baselineSignals=scanModule(file,prior).sizeFindings;}catch{}
 const sha256=createHash('sha256').update(source).digest('hex');
 const result=scanModule(file,source);
 const ownerIsProfile=/profile-|facility-manager|timeline-presentation|files-view/.test(file);
 const ownerSourcesMatch=ownerIsProfile?source===git('show',`ecf34df:${file}`):null;
 changed.push({file,sha256,nonblank:result.nonblank,signals:result.sizeFindings.length,baselineExists:Boolean(prior),ownerIsProfile,ownerSourcesMatch,workingMatchesCommit:source===await readFile(`${repo}/${file}`,'utf8')});
 for(const signal of result.sizeFindings){const before=baselineSignals.find(x=>x.kind===signal.kind&&x.symbol===signal.symbol);scans.push({...signal,sha256,baselineSignal:before??null,classification:!before?'new':before.fingerprint===signal.fingerprint?'inherited-unchanged':'changed'});}
 if(ownerIsProfile){await mkdir(dirname(`${out}/reviewed-source/${file}`),{recursive:true});await writeFile(`${out}/reviewed-source/${file}`,source);await writeFile(`${out}/${file.split('/').pop()}.patch`,git('diff',base,pin,'--',file));}
}
await writeFile(`${out}/all-changed-test-signals.json`,JSON.stringify({pin,base,capturedAtUtc:new Date().toISOString(),files:changed,signals:scans},null,2)+'\n');
console.log(JSON.stringify({pin,files:changed.length,signals:scans,profileFiles:changed.filter(x=>x.ownerIsProfile)},null,2));
