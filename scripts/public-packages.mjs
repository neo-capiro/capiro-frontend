import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkUserPreferencesPublic } from './user-preferences-public.mjs';

const ordinaryRecord = value => value !== null && typeof value === 'object'
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));

/** Byte binding only. Source review and authorization are separate decisions. */
export function verifyPackageInputs(manifest, readArtifact) {
  if (!ordinaryRecord(manifest) || manifest.schema !== 'capiro-public-package-inputs/1' || !Array.isArray(manifest.artifacts) || !manifest.artifacts.length) throw Error('Invalid public package manifest');
  const seen = new Set();
  const records = manifest.artifacts.map(record => {
    if (!ordinaryRecord(record) || ['file', 'sourceCommit', 'sha256', 'bytes'].some(key => {
      const field = Object.getOwnPropertyDescriptor(record, key);
      return !field || !Object.hasOwn(field, 'value');
    })) throw Error('Invalid public package binding');
    const { file, sourceCommit, sha256, bytes } = record;
    if (typeof file !== 'string' || !/^[a-z0-9][a-z0-9.-]*\.tgz$/.test(file) || seen.has(file)) throw Error('Invalid or duplicate artifact filename');
    if (typeof sourceCommit !== 'string' || typeof sha256 !== 'string' || !/^[a-f0-9]{40}$/.test(sourceCommit) || !/^[a-f0-9]{64}$/.test(sha256) || !Number.isSafeInteger(bytes) || bytes < 1) throw Error('Invalid public package binding');
    seen.add(file);
    return { file, sourceCommit, sha256, bytes };
  });
  return records.map(record => {
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
  const manifests = ['meri-public-packages.json', 'newsletter-public-packages.json', 'onboard-public-packages.json']
    .map(name => JSON.parse(readFileSync(path.join(vendor, name), 'utf8')));
  const records = manifests.flatMap(manifest => verifyPackageInputs(manifest, name => readFileSync(path.join(vendor, name))));
  console.log(JSON.stringify({ schema: 'capiro-public-package-inputs/1', records, userPreferences: checkUserPreferencesPublic() }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error instanceof Error ? error.message : 'Public package check failed'); process.exitCode = 1; }
}
