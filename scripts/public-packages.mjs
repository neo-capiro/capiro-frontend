import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Byte binding only. Source review and authorization are separate decisions. */
export function verifyPackageInputs(manifest, readArtifact) {
  if (manifest?.schema !== 'capiro-public-package-inputs/1' || !Array.isArray(manifest.artifacts) || !manifest.artifacts.length) throw Error('Invalid public package manifest');
  const seen = new Set();
  return manifest.artifacts.map(record => {
    if (!/^[a-z0-9][a-z0-9.-]*\.tgz$/.test(record.file) || seen.has(record.file)) throw Error('Invalid or duplicate artifact filename');
    if (!/^[a-f0-9]{40}$/.test(record.sourceCommit) || !/^[a-f0-9]{64}$/.test(record.sha256) || !Number.isSafeInteger(record.bytes) || record.bytes < 1) throw Error('Invalid public package binding');
    seen.add(record.file);
    const raw = readArtifact(record.file);
    if (raw.length !== record.bytes || createHash('sha256').update(raw).digest('hex') !== record.sha256) throw Error(`Public package drift: ${record.file}`);
    return { file: record.file, bytes: raw.length, sha256: record.sha256, sourceCommit: record.sourceCommit };
  });
}

function main(argv) {
  const usage = 'Usage: node scripts/public-packages.mjs [--help]\nVerify versioned vendor artifact bytes; no install/network. Exit0 success/help; exit1 invalid arguments, setup or drift.';
  if (argv.length === 1 && argv[0] === '--help') { console.log(usage); return; }
  if (argv.length) throw Error(usage);
  const vendor = fileURLToPath(new URL('../vendor/', import.meta.url));
  const manifest = JSON.parse(readFileSync(path.join(vendor, 'meri-public-packages.json'), 'utf8'));
  console.log(JSON.stringify({ schema: manifest.schema, records: verifyPackageInputs(manifest, name => readFileSync(path.join(vendor, name))) }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error instanceof Error ? error.message : 'Public package check failed'); process.exitCode = 1; }
}
