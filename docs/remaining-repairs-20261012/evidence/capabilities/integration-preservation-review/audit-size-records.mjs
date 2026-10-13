import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { scanModule } from '/workspace/capiro-remaining/scripts/architecture/scan.mjs';
const repo='/workspace/capiro-remaining';
const out='/tmp/capiro-remaining-capabilities-evidence/integration-preservation-review';
const reports=[
  ['mail','ceed53a','/tmp/capiro-remaining-mail-evidence/structure-review-proposal.json','signals'],
  ['intake','8daaf28','/tmp/capiro-remaining-intake-evidence/structure-review.json','findings'],
];
const result=[];
for(const [lane,commit,path,key] of reports){
  const record=JSON.parse(await readFile(path,'utf8'));
  for(const expected of record[key]){
    const source=execFileSync('git',['show',`${commit}:${expected.file}`],{cwd:repo,encoding:'utf8'});
    const actual=scanModule(expected.file,source).sizeFindings.find(x=>x.kind===expected.kind&&x.symbol===expected.symbol);
    result.push({lane,integrationCommit:commit,sourceSHA256:createHash('sha256').update(source).digest('hex'),actual,record:{file:expected.file,kind:expected.kind,symbol:expected.symbol,line:expected.line,nonblank:expected.nonblank,fingerprint:expected.fingerprint},matches:!!actual&&['line','nonblank','fingerprint'].every(x=>actual[x]===expected[x])});
  }
}
await writeFile(`${out}/size-record-consistency.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({records:result.length,mismatches:result.filter(x=>!x.matches).length}));
