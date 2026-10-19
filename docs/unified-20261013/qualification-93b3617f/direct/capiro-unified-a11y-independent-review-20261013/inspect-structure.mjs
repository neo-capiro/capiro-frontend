import fs from 'node:fs';
import {scanModule} from '/workspace/capiro-onboard-port-20261013/scripts/architecture/scan.mjs';
const out='/tmp/capiro-unified-a11y-independent-review-20261013';
const author='/tmp/capiro-unified-a11y-proposal-20261013';
const pins=JSON.parse(fs.readFileSync(`${author}/SOURCE-PINS.json`,'utf8'));
const rows=pins.files.filter(f=>f.candidateSha256).map(f=>({file:f.file,baseline:scanModule(f.file,fs.readFileSync(`${pins.sourceRoot}/${f.file}`,'utf8')).sizeFindings,candidate:scanModule(f.file,fs.readFileSync(`${author}/candidate/${f.file}`,'utf8')).sizeFindings}));
fs.writeFileSync(`${out}/STRUCTURE-SIGNALS.json`,JSON.stringify({method:'Read-only repository AST scanner on proposal strings; no application imports or test/runtime gates.',rows},null,2)+'\n');
console.log(JSON.stringify(rows.filter(x=>x.candidate.length||x.baseline.length),null,2));
