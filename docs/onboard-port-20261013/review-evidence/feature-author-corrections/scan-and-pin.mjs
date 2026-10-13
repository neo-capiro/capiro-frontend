import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from '/workspace/capiro-onboard-port-20261013/node_modules/typescript/lib/typescript.js';
import { scanModule } from '/workspace/capiro-onboard-port-20261013/scripts/architecture/scan.mjs';
const root='/workspace/capiro-onboard-port-20261013',out='/tmp/capiro-onboard-port-evidence-20261013/review-corrections-handoff';
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const files=[...walk(`${root}/apps/web/src/features/onboard`),...walk(`${root}/apps/web/public/onboard`),...fs.readdirSync(`${root}/apps/web/tests`).filter(f=>/^onboard-.*\.test\.ts$/.test(f)).map(f=>`${root}/apps/web/tests/${f}`)].sort();
const records=[], modules=[];let syntaxErrors=0;
for(const absolute of files){const data=fs.readFileSync(absolute),file=path.relative(root,absolute);records.push({file,size:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});if(/\.tsx?$/.test(file)){const source=data.toString(),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);syntaxErrors+=ast.parseDiagnostics.length;modules.push({file,...scanModule(file,source),syntaxErrors:ast.parseDiagnostics.length});}}
fs.writeFileSync(`${out}/SOURCE-MANIFEST.json`,JSON.stringify({atUTC:new Date().toISOString(),records},null,2)+'\n');
const featureFindings=modules.filter(m=>m.file.includes('/features/')).flatMap(m=>m.sizeFindings),testFindings=modules.filter(m=>m.file.includes('/tests/')).flatMap(m=>m.sizeFindings);
fs.writeFileSync(`${out}/OWNED-PARSER-SCAN.json`,JSON.stringify({scope:'Pure parser only; not complete architecture/type/build/browser gate',syntaxErrors,featureFindings,testFindings,modules},null,2)+'\n');
const prior=JSON.parse(fs.readFileSync('/tmp/capiro-onboard-port-evidence-20261013/correction-handoff/SOURCE-MANIFEST.json','utf8'));
const priorRecords=Array.isArray(prior)?prior:(prior.records??prior.files);
const oldMap=new Map(priorRecords.map(r=>[r.file??r.path,r.sha256]));
const originalTests=records.filter(r=>r.file.includes('/tests/')&&oldMap.has(r.file)).map(r=>({...r,unchanged:oldMap.get(r.file)===r.sha256}));
fs.writeFileSync(`${out}/ORIGINAL-TEST-PRESERVATION.json`,JSON.stringify({originalTests,allUnchanged:originalTests.every(r=>r.unchanged)},null,2)+'\n');
console.log(JSON.stringify({files:records.length,syntaxErrors,featureSignals:featureFindings.length,testSignals:testFindings.length,originalTests:originalTests.length,preserved:originalTests.every(r=>r.unchanged)}));
