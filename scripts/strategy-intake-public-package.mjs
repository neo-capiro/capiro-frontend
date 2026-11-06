import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { hash, packageMembers, verifyProcurementPackage, emitProcurement } from './procurement-public-package.mjs';

const need = (condition, message) => { if (!condition) throw Error(`Strategy intake package: ${message}`); };
const sourceSha256 = '30a71647590c31deb321d4bab09a313a90c97f0f07be8fcb22e10c0aed78cf7b';
const options = { target: 9, module: 1, strict: true, noUncheckedIndexedAccess: true,
  declaration: true, declarationMap: false, sourceMap: false, newLine: 1, types: [] };

/** Strictly compile the standalone browser contract, including its public declarations. */
export function emitStrategyIntake(source, ts) {
  need(ts.version === '5.9.3', 'TypeScript version');
  const filename = path.resolve('strategy-intake.ts'), output = new Map();
  const host = ts.createCompilerHost(options), read = host.readFile, exists = host.fileExists;
  host.readFile = name => path.resolve(name) === filename ? source : read(name);
  host.fileExists = name => path.resolve(name) === filename || exists(name);
  host.writeFile = (name, text) => output.set(path.basename(name), Buffer.from(text));
  const program = ts.createProgram([filename], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  need(diagnostics.length === 0, diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
  need(program.getSourceFiles().every(file => path.resolve(file.fileName) === filename || program.isSourceFileDefaultLibrary(file)), 'standalone browser module');
  const emitted = program.emit();
  need(!emitted.emitSkipped && emitted.diagnostics.length === 0, 'declaration emission');
  return { runtime: output.get('strategy-intake.js'), declarations: output.get('strategy-intake.d.ts') };
}

/** Validate the prior artifact as history; active dependency checks belong to the successor. */
export function procurementHistoryInputs({ manifest, baseBytes, archiveBytes, ts }) {
  const spec = `file:../../vendor/${manifest.artifact.file}`;
  return { manifest, baseBytes, archiveBytes, ts, web: { dependencies: { '@capiro/shared': spec } },
    lock: { packages: { 'apps/web': { dependencies: { '@capiro/shared': spec } },
      'apps/web/node_modules/@capiro/shared': { version: '0.0.0', resolved: `file:vendor/${manifest.artifact.file}`, integrity: manifest.artifact.integrity } } } };
}

export function verifyStrategyIntakePackage({ manifest, baseBytes, archiveBytes, web, lock, ts, successor, successorBytes, predecessorBytes }) {
  need(manifest.schema === 'capiro-strategy-intake-public-package/1', 'manifest schema');
  need(manifest.base.sha256 === 'd07e75bf10bfeaa93a451942b65f1d64035ebaf33d9e3ed6e237bd0ab1e0afec' && hash(baseBytes) === manifest.base.sha256, 'accepted base');
  need(hash(archiveBytes) === manifest.artifact.sha256 && archiveBytes.length === manifest.artifact.bytes, 'artifact bytes');
  need(manifest.artifact.integrity === `sha512-${hash(archiveBytes, 'sha512', 'base64')}`, 'integrity');
  need(manifest.source.commit === '20d1482b90a700de87484cd6dce1d5ef5df99d51' && manifest.source.repository === 'neo-capiro/capiro-backend' && manifest.source.path === 'packages/shared/src/strategy-intake.ts', 'producer');
  need(manifest.artifact.file === `capiro-shared-0.0.0-intake-${manifest.source.commit.slice(0, 8)}-${manifest.artifact.sha256.slice(0, 12)}.tgz`, 'immutable filename');
  const base = packageMembers(baseBytes), composed = packageMembers(archiveBytes);
  need(base.size === 292 && composed.size === 295, 'entry count');
  const source = composed.get('package/src/strategy-intake.ts');
  need(source && hash(source) === sourceSha256 && manifest.source.sha256 === sourceSha256 && source.length === manifest.source.bytes, 'reviewed source');
  const emitted = emitStrategyIntake(source.toString('utf8'), ts), info = JSON.parse(base.get('package/package.json'));
  info.exports['./strategy-intake'] = { types: './dist/strategy-intake.d.ts', require: './dist/strategy-intake.js', import: './dist/strategy-intake.js', default: './dist/strategy-intake.js' };
  info.typesVersions['*']['strategy-intake'] = ['dist/strategy-intake.d.ts'];
  const expectedManifest = Buffer.from(JSON.stringify(info, null, 2) + '\n');
  for (const [name, bytes] of base) need(composed.get(name)?.equals(name === 'package/package.json' ? expectedManifest : bytes), `preserved entry ${name}`);
  need(composed.get('package/dist/strategy-intake.js')?.equals(emitted.runtime), 'runtime emission');
  need(composed.get('package/dist/strategy-intake.d.ts')?.equals(emitted.declarations), 'declaration emission');
  need(manifest.generator.typescriptVersion === ts.version, 'generator version');
  // An explicit type-only procurement successor must preserve the complete intake proof above.
  let active = manifest.artifact, version = '0.0.0';
  if (successor) {
    need(successor.sourceCommit === 'f7c284a25264a3b830ee2831dab967b2c33b5b31', 'successor producer');
    need(successor.baseSha256 === 'f0e81ef0861d9bf14fd9d725d5caf675c00ff306e620d8749fbe3d8511e4151c', 'successor accepted base');
    need(hash(successorBytes) === successor.sha256 && successorBytes.length === successor.bytes, 'successor bytes');
    need(successor.integrity === `sha512-${hash(successorBytes, 'sha512', 'base64')}`, 'successor integrity');
    need(successor.version === '0.0.4-defproc-release1.0', 'successor version');
    const updated = packageMembers(successorBytes), detailSource = updated.get('package/src/defense-procurement.ts');
    need(successor.regularEntryCount === updated.size && updated.size === composed.size, 'successor entry count');
    need(hash(predecessorBytes) === successor.baseSha256, 'successor predecessor bytes');
    const predecessor = packageMembers(predecessorBytes);
    need(predecessor.size === updated.size, 'successor predecessor entry set');
    const priorSource = predecessor.get('package/src/defense-procurement.ts');
    need(detailSource?.subarray(0, priorSource.length).equals(priorSource), 'successor preserves prior declarations');
    for (const [name, content] of predecessor) {
      if (!['package/package.json', 'package/src/defense-procurement.ts', 'package/dist/defense-procurement.d.ts'].includes(name))
        need(updated.get(name)?.equals(content), `successor predecessor preserved entry ${name}`);
    }
    need(detailSource && hash(detailSource) === '0b7479080629292329c968b37fd118df6dc15863fcae1a68594135e9bf13fe21', 'successor reviewed procurement source');
    const detail = emitProcurement(detailSource.toString('utf8'), ts);
    const updatedInfo = JSON.parse(composed.get('package/package.json'));
    updatedInfo.version = successor.version;
    updatedInfo.exports['./defense-procurement'] = { types: './dist/defense-procurement.d.ts', require: './dist/defense-procurement.js', import: './dist/defense-procurement.js', default: './dist/defense-procurement.js' };
    updatedInfo.typesVersions['*']['defense-procurement'] = ['dist/defense-procurement.d.ts'];
    const replacements = new Map([
      ['package/package.json', Buffer.from(JSON.stringify(updatedInfo, null, 2) + '\n')],
      ['package/src/defense-procurement.ts', detailSource],
      ['package/dist/defense-procurement.d.ts', detail.declarations],
    ]);
    for (const [name, content] of composed) need(updated.get(name)?.equals(replacements.get(name) ?? content), `successor preserved entry ${name}`);
    need(updated.get('package/dist/defense-procurement.js')?.equals(detail.runtime), 'successor runtime emission');
    active = successor; version = successor.version;
  }
  const spec = `file:../../vendor/${active.file}`, installed = lock.packages['apps/web/node_modules/@capiro/shared'];
  need(web.dependencies['@capiro/shared'] === spec && lock.packages['apps/web'].dependencies['@capiro/shared'] === spec, 'active dependency');
  need(installed.version === version && installed.resolved === `file:vendor/${active.file}` && installed.integrity === active.integrity, 'active lock');
  return { artifact: manifest.artifact.file, sourceCommit: manifest.source.commit, preservedEntries: 291, modifiedEntries: 1, addedEntries: 3, activeArtifact: active.file, activeSourceCommit: successor?.sourceCommit ?? manifest.source.commit };
}

export function checkStrategyIntakePackage() {
  const root = fileURLToPath(new URL('../', import.meta.url)), require = createRequire(path.join(root, 'package.json'));
  const json = name => JSON.parse(readFileSync(path.join(root, name), 'utf8'));
  const archive = name => readFileSync(path.join(root, 'vendor', name));
  const manifest = json('vendor/strategy-intake-public-package.json'), history = json('vendor/procurement-public-package.json'), ts = require('typescript');
  need(hash(readFileSync(require.resolve('typescript'))) === manifest.generator.typescriptSha256, 'compiler bytes');
  verifyProcurementPackage(procurementHistoryInputs({ manifest: history, baseBytes: archive(history.base.file), archiveBytes: archive(history.artifact.file), ts }));
  const bytes = archive(manifest.artifact.file);
  const artifacts = json('vendor/procurement-public-packages.json').artifacts;
  const successor = artifacts[0], successorBytes = archive(successor.file);
  const predecessor = artifacts.find(entry => entry.sha256 === successor.baseSha256);
  need(predecessor, 'successor predecessor manifest');
  const predecessorBytes = archive(predecessor.file);
  const result = verifyStrategyIntakePackage({ manifest, baseBytes: archive(manifest.base.file), archiveBytes: bytes,
    web: json('apps/web/package.json'), lock: json('package-lock.json'), ts, successor, successorBytes, predecessorBytes });
  const webRequire = createRequire(path.join(root, 'apps/web/package.json'));
  const installed = path.dirname(path.dirname(webRequire.resolve('@capiro/shared/strategy-intake')));
  need(path.resolve(installed) === path.resolve(root, 'apps/web/node_modules/@capiro/shared'), 'web resolves exact nested package');
  for (const [name, content] of packageMembers(successorBytes)) need(readFileSync(path.join(installed, name.slice(8))).equals(content), `installed entry ${name}`);
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(checkStrategyIntakePackage())); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
