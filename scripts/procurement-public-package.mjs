import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const hash = (bytes, algorithm = 'sha256', encoding = 'hex') => createHash(algorithm).update(bytes).digest(encoding);
const need = (condition, message) => { if (!condition) throw Error(`Procurement public package: ${message}`); };
const sourcePath = 'package/src/defense-procurement.ts';
export const declarationExport = "\nexport * from './defense-procurement.js';\n";
export const runtimeExport = '\n__exportStar(require("./defense-procurement.js"), exports);\n';
export const compilerOptions = { target: 9, module: 1, declaration: true, declarationMap: false, sourceMap: false, newLine: 1 };

/** Read bounded, ordinary package members only. Never extract untrusted paths. */
export function packageMembers(archive) {
  const raw = gunzipSync(archive, { maxOutputLength: 32 * 1024 * 1024 });
  const members = new Map();
  let offset = 0;
  const text = (header, start, count) => header.subarray(start, start + count).toString('utf8').replace(/\0.*$/s, '');
  const octal = (value) => { need(/^[0-7]+$/.test(value.trim()), 'invalid tar number'); return parseInt(value.trim(), 8); };
  while (offset + 512 <= raw.length) {
    const header = raw.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      need(raw.subarray(offset).every((byte) => byte === 0), 'nonzero data after tar terminator');
      return members;
    }
    const checksum = [...header].reduce((sum, byte, index) => sum + (index >= 148 && index < 156 ? 32 : byte), 0);
    need(octal(text(header, 148, 8)) === checksum, 'tar checksum');
    const prefix = text(header, 345, 155);
    const name = (prefix ? `${prefix}/` : '') + text(header, 0, 100);
    need(/^package\/[A-Za-z0-9_.\/-]+$/.test(name) && !name.split('/').some((part) => part === '.' || part === '..' || part === ''), 'unsafe member');
    need(!members.has(name), 'duplicate member');
    need(header[156] === 0 || header[156] === 48, 'non-regular member');
    const size = octal(text(header, 124, 12));
    need(Number.isSafeInteger(size) && size <= 8 * 1024 * 1024 && offset + 512 + size <= raw.length, 'member bound');
    members.set(name, Buffer.from(raw.subarray(offset + 512, offset + 512 + size)));
    need(members.size <= 512, 'member count');
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  throw Error('Procurement public package: missing tar terminator');
}

export function emitProcurement(source, ts) {
  need(ts.version === '5.9.3', 'TypeScript generator version');
  const runtime = ts.transpileModule(source, { compilerOptions, fileName: 'defense-procurement.ts', reportDiagnostics: true });
  const declarations = ts.transpileDeclaration(source, { compilerOptions, fileName: 'defense-procurement.ts', reportDiagnostics: true });
  need(![...runtime.diagnostics ?? [], ...declarations.diagnostics ?? []].some((d) => d.category === ts.DiagnosticCategory.Error), 'canonical emission diagnostics');
  return { runtime: Buffer.from(runtime.outputText), declarations: Buffer.from(declarations.outputText) };
}

/** Byte checks establish composition, not deployed compatibility or source approval. */
export function verifyProcurementPackage({ baseBytes, archiveBytes, manifest, web, lock, ts }) {
  need(manifest.schema === 'capiro-procurement-public-package/1', 'manifest schema');
  need(manifest.base.file === 'capiro-shared-0.0.0-fbdcba3b-d0ac8893de0b.tgz' && manifest.base.sha256 === 'd0ac8893de0b80874c4d12eaf758dc3773db7b74d750c097f430ff2ccf390f4a', 'accepted base binding');
  need(hash(baseBytes) === manifest.base.sha256 && baseBytes.length === manifest.base.bytes, 'base bytes');
  need(hash(archiveBytes) === manifest.artifact.sha256 && archiveBytes.length === manifest.artifact.bytes, 'archive bytes');
  need(manifest.artifact.integrity === `sha512-${hash(archiveBytes, 'sha512', 'base64')}`, 'archive integrity');
  need(manifest.source.repository === 'neo-capiro/capiro-backend' && manifest.source.commit === 'f326ba7926606a6c5810c7608b627637bdf3092d' && manifest.source.path === 'packages/shared/src/defense-procurement.ts', 'canonical source identity');
  need(manifest.artifact.file === `capiro-shared-0.0.0-procurement-${manifest.source.commit.slice(0, 8)}-${manifest.artifact.sha256.slice(0, 12)}.tgz`, 'content-addressed name');
  const spec = `file:../../vendor/${manifest.artifact.file}`;
  need(web.dependencies['@capiro/shared'] === spec && lock.packages['apps/web'].dependencies['@capiro/shared'] === spec, 'active dependency binding');
  const installed = lock.packages['apps/web/node_modules/@capiro/shared'];
  need(installed.version === '0.0.0' && installed.resolved === `file:vendor/${manifest.artifact.file}` && installed.integrity === manifest.artifact.integrity, 'active lock binding');
  const base = packageMembers(baseBytes), composed = packageMembers(archiveBytes);
  need(base.size === 289 && composed.size === 292, 'exact member count');
  const source = composed.get(sourcePath);
  need(source && manifest.source.sha256 === '2a361b736aef8ba3168a610cdac2fe20a728b050efab29e8bdd516b975f1aee3' && hash(source) === manifest.source.sha256 && source.length === manifest.source.bytes, 'canonical source bytes');
  const emitted = emitProcurement(source.toString('utf8'), ts);
  const changes = new Map([
    ['package/dist/index.d.ts', Buffer.concat([base.get('package/dist/index.d.ts'), Buffer.from(declarationExport)])],
    ['package/dist/index.js', Buffer.concat([base.get('package/dist/index.js'), Buffer.from(runtimeExport)])],
  ]);
  const additions = new Map([
    [sourcePath, source],
    ['package/dist/defense-procurement.d.ts', emitted.declarations],
    ['package/dist/defense-procurement.js', emitted.runtime],
  ]);
  for (const [name, bytes] of base) need(composed.get(name)?.equals(changes.get(name) ?? bytes), `base preservation ${name}`);
  for (const [name, bytes] of additions) need(!base.has(name) && composed.get(name)?.equals(bytes), `canonical generated member ${name}`);
  for (const name of composed.keys()) need(base.has(name) || additions.has(name), `unexpected member ${name}`);
  need(manifest.generator.typescriptVersion === ts.version && JSON.stringify(manifest.generator.compilerOptions) === JSON.stringify(compilerOptions), 'generator binding');
  const packageInfo = JSON.parse(composed.get('package/package.json'));
  need(packageInfo.name === '@capiro/shared' && packageInfo.exports['.'].types === './dist/index.d.ts', 'public root export');
  return { status: 'VERIFIED_SOURCE_PACKAGE_COMPOSITION_ONLY', preservedMembers: base.size - changes.size, changedMembers: changes.size, addedMembers: additions.size, sourceCommit: manifest.source.commit, artifact: manifest.artifact.file };
}

async function main(args) {
  need(args.length === 0, 'no CLI arguments supported');
  const root = fileURLToPath(new URL('../', import.meta.url));
  const active = JSON.parse(readFileSync(path.join(root, 'apps/web/package.json'))).dependencies['@capiro/shared'];
  if (active.startsWith('file:../../vendor/capiro-shared-0.0.0-intake-')) {
    const { checkStrategyIntakePackage } = await import('./strategy-intake-public-package.mjs');
    console.log(JSON.stringify(checkStrategyIntakePackage()));
    return;
  }
  const manifest = JSON.parse(readFileSync(path.join(root, 'vendor/procurement-public-package.json')));
  const require = createRequire(path.join(root, 'package.json'));
  need(hash(readFileSync(require.resolve('typescript'))) === manifest.generator.typescriptSha256, 'TypeScript generator bytes');
  const result = verifyProcurementPackage({
    baseBytes: readFileSync(path.join(root, 'vendor', manifest.base.file)),
    archiveBytes: readFileSync(path.join(root, 'vendor', manifest.artifact.file)), manifest,
    web: JSON.parse(readFileSync(path.join(root, 'apps/web/package.json'))),
    lock: JSON.parse(readFileSync(path.join(root, 'package-lock.json'))), ts: require('typescript'),
  });
  const resolveWeb = createRequire(path.join(root, 'apps/web/package.json'));
  const installedRoot = path.dirname(path.dirname(resolveWeb.resolve('@capiro/shared')));
  const composed = packageMembers(readFileSync(path.join(root, 'vendor', manifest.artifact.file)));
  for (const [name, bytes] of composed) need(readFileSync(path.join(installedRoot, name.slice('package/'.length))).equals(bytes), `installed package member ${name}`);
  console.log(JSON.stringify(result));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
