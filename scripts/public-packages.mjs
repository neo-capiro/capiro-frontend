import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkUserPreferencesPublic } from './user-preferences-public.mjs';
import { checkDocumentAccessInput } from './document-access-public-input.mjs';

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

/** Active local Meri packages must have immutable provenance, not only archived inputs. */
export function verifyActiveMeriPackages(records, consumers) {
  const active = new Map();
  for (const consumer of consumers) {
    for (const dependencies of [consumer.dependencies, consumer.devDependencies]) {
      for (const [name, family] of [['@capiro/meri-contracts', 'contracts'], ['@capiro/meri-ui-stream', 'ui-stream']]) {
        const value = dependencies?.[name];
        if (value === undefined) continue;
        const file = typeof value === 'string' && /^file:\.\.\/\.\.\/vendor\/(capiro-meri-(?:contracts|ui-stream)-\d+\.\d+\.\d+\.tgz)$/.exec(value)?.[1];
        if (!file || !file.startsWith(`capiro-meri-${family}-`)) throw Error(`Invalid active public package dependency: ${name}`);
        const record = records.find(item => item.file === file);
        if (!record || typeof record.sourceCommit !== 'string' || !/^[a-f0-9]{40}$/.test(record.sourceCommit))
          throw Error(`Active public package has no immutable source binding: ${file}`);
        active.set(file, record);
      }
    }
  }
  if (!active.size) throw Error('No active Meri public package dependencies');
  return [...active.values()];
}

function main(argv) {
  const usage = 'Usage: node scripts/public-packages.mjs [--help]\nVerify versioned vendor artifact bytes; no install/network. Exit0 success/help; exit1 invalid arguments, setup or drift.';
  if (argv.length === 1 && argv[0] === '--help') { console.log(usage); return; }
  if (argv.length) throw Error(usage);
  const vendor = fileURLToPath(new URL('../vendor/', import.meta.url));
  const manifests = ['meri-public-packages.json', 'newsletter-public-packages.json', 'onboard-public-packages.json']
    .map(name => JSON.parse(readFileSync(path.join(vendor, name), 'utf8')));
  const records = manifests.flatMap(manifest => verifyPackageInputs(manifest, name => readFileSync(path.join(vendor, name))));
  const consumers = ['apps/web', 'packages/meri-client', 'packages/qualification-transport']
    .map(name => JSON.parse(readFileSync(new URL(`../${name}/package.json`, import.meta.url), 'utf8')));
  const active = verifyActiveMeriPackages(records, consumers);
  console.log(JSON.stringify({ schema: 'capiro-public-package-inputs/1', records, active, userPreferences: checkUserPreferencesPublic(), documentAccess: checkDocumentAccessInput() }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error instanceof Error ? error.message : 'Public package check failed'); process.exitCode = 1; }
}
