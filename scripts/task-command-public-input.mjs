import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const expectedFiles = ['task-command-application.mjs', 'task-command-application.d.ts', 'task-command-application.schema.json', 'task-command-application.metadata.json'];
export function verifyTaskCommandInput(manifest, readInput) {
  if (!manifest || manifest.schema !== 'meri-task-command-public-input/1' || manifest.repository !== 'neo-capiro/meri-greenfield'
    || !/^[a-f0-9]{40}$/.test(manifest.sourceCommit) || manifest.publicExport !== '@capiro/meri-contracts/task-command-application'
    || !Array.isArray(manifest.files) || manifest.files.length !== expectedFiles.length) throw Error('Invalid task-command public input provenance');
  const seen = new Set();
  return manifest.files.map(record => {
    if (!record || !expectedFiles.includes(record.file) || seen.has(record.file) || !Number.isSafeInteger(record.bytes) || record.bytes < 1 || !/^[a-f0-9]{64}$/.test(record.sha256)) throw Error('Invalid task-command public file binding');
    seen.add(record.file);
    const bytes = readInput(record.file);
    if (bytes.length !== record.bytes || createHash('sha256').update(bytes).digest('hex') !== record.sha256) throw Error('Task-command public input drift: ' + record.file);
    return { file: record.file, bytes: bytes.length, sha256: record.sha256 };
  });
}
export function checkTaskCommandInput() {
  const root = new URL('../packages/meri-client/', import.meta.url), directory = new URL('vendor/task-command-application/0.1.0/', root);
  const manifest = JSON.parse(readFileSync(new URL('provenance.json', directory), 'utf8'));
  const records = verifyTaskCommandInput(manifest, name => readFileSync(new URL(name, directory)));
  const client = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
  const entry = client.exports?.['./task-commands'], prefix = './vendor/task-command-application/0.1.0/';
  if (entry?.types !== prefix + 'task-command-application.d.ts' || entry?.default !== prefix + 'task-command-application.mjs' || !client.files.includes(prefix.slice(2, -1))) throw Error('Task-command public export drift');
  return { sourceCommit: manifest.sourceCommit, records };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length === 3 && process.argv[2] === '--help') console.log('Usage: node scripts/task-command-public-input.mjs [--help]\nVerify immutable public receiver bytes/provenance/export; no install/network. Exit0 success/help; exit1 invalid arguments/setup/drift.');
  else if (process.argv.length !== 2) { console.error('Invalid arguments'); process.exitCode = 1; }
  else try { console.log(JSON.stringify(checkTaskCommandInput())); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
