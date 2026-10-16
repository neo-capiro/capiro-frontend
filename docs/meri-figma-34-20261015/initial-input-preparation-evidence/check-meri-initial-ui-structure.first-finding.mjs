import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discover, inspectSources } from '../meri-ui-followup/scripts/architecture.mjs';
import { reviewedSizeFindings } from '../meri-ui-followup/scripts/architecture/reviews.mjs';
import { publicExports } from '../meri-ui-initial-input/scripts/architecture/dependencies.mjs';
const evidence = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(evidence, '../meri-ui-initial-input');
const start = performance.now();
const files = discover(root);
const result = inspectSources(files, publicExports, {
  baseline: JSON.parse(fs.readFileSync(path.join(root, 'scripts/architecture/portfolio-transfer-size-baseline.json'))),
  reviews: reviewedSizeFindings,
  moduleRecords: JSON.parse(fs.readFileSync(path.join(root, 'docs/architecture-size-reviews.json'))),
  evidenceExists(reference) {
    const [name, anchor] = reference.split('#');
    if (!name.startsWith('docs/') || name.includes('..') || !name.endsWith('.md')) return false;
    try { const text = fs.readFileSync(path.join(root, name), 'utf8'); return !anchor || text.includes(`id="${anchor}"`); }
    catch { return false; }
  },
});
const receipt = { sourceRoot: root, parserFrom: 'unchanged installed033 scanner/TypeScript parser', semanticTypecheck: false, moduleExecution: false, subprocesses: false, heapMiB: 256, elapsedMs: performance.now() - start, files: files.size, ...result };
fs.writeFileSync(path.join(evidence, 'initial-ui-source-structure.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ files: files.size, errors: result.errors, sizeSummary: result.sizeSummary, blocking: result.sizeFindings.filter(finding => finding.status === 'blocking'), elapsedMs: receipt.elapsedMs }));
if (result.errors.length || result.sizeSummary.blocking) process.exitCode = 1;
