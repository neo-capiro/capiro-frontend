import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from '/workspace/capiro-remaining-calendar/node_modules/typescript/lib/typescript.js';
const pins=['4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace','243248e726243c44bd4b9d24fd1ed220da18c56a'];
const paths=['apps/api/src/engagement/engagement.controller.ts','apps/api/src/engagement/engagement.service.ts'];
const names=new Set(['ArtifactRefDto','ShareArtifactsDto','shareArtifacts','unshareArtifacts','sharedMeetings','listSharedMeetingsForClient','filterToSharedArtifacts','loadArtifactShareState','stampArtifactShared','clearArtifactShared','recomputeMeetingVisibility','meetingInclude','noteMetadataSelect','debriefMetadataSelect','mergeSharedMeetingsByICalUid','decorateMeetings','listMeetings','getMeeting','listAttachments']);
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
const results=[];
for(const file of paths){
 const versions=pins.map(pin=>{const source=execFileSync('git',['show',`${pin}:${file}`],{cwd:'/workspace/capirov2',encoding:'utf8'});const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);const found={};function walk(n){const name=n.name?.getText(ast);if(name&&names.has(name)){const text=n.getText(ast);found[name]={sha256:hash(text),line:ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1};fs.writeFileSync(`/tmp/capiro-remaining-calendar-evidence/native-${pin.slice(0,7)}-${file.endsWith('controller.ts')?'controller':'service'}-${name}.txt`,text);}ts.forEachChild(n,walk);}walk(ast);return {pin,fileSha256:hash(source),symbols:found};});
 results.push({file,versions,comparison:Object.keys(versions[0].symbols).map(name=>({name,identical:versions[0].symbols[name].sha256===versions[1].symbols[name]?.sha256}))});
}
fs.writeFileSync('/tmp/capiro-remaining-calendar-evidence/native-pin-comparison.json',JSON.stringify({inspectedCheckout:pins[0],integrationReviewPin:pins[1],results},null,2));
console.log(results.map(r=>({file:r.file,comparison:r.comparison})));
