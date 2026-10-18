import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import ts from '../meri-ui-followup/node_modules/typescript/lib/typescript.js';
import { scanModule } from '../meri-ui-followup/scripts/architecture/scan.mjs';
const file = 'packages/meri-client/src/conversation-client.ts';
const source = fs.readFileSync(file, 'utf8');
const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const errors = parsed.parseDiagnostics.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n'));
const scanned = scanModule(file, source);
const receipt = { file, sha256: createHash('sha256').update(source).digest('hex'), errors,
  sizeFindings: scanned.sizeFindings, semanticTypecheck: false, productModuleExecution: false,
  children: false, policyAndReviewDataChanged: false, scope: 'three-line retained allocation continuation fence only' };
fs.writeFileSync(path.resolve('../evidence/initial-ui-retry-pin-source.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
if (errors.length || scanned.sizeFindings.length) process.exitCode = 1;
