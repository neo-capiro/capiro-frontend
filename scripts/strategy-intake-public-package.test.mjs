import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { checkStrategyIntakePackage, verifyStrategyIntakePackage } from './strategy-intake-public-package.mjs';
const root = fileURLToPath(new URL('../', import.meta.url)), require = createRequire(path.join(root, 'package.json'));
const json = name => JSON.parse(readFileSync(path.join(root, name), 'utf8'));
function inputs() {
  const manifest = json('vendor/strategy-intake-public-package.json');
  return { manifest, baseBytes: readFileSync(path.join(root, 'vendor', manifest.base.file)),
    archiveBytes: readFileSync(path.join(root, 'vendor', manifest.artifact.file)),
    web: json('apps/web/package.json'), lock: json('package-lock.json'), ts: require('typescript') };
}
test('active packed package preserves predecessor and resolves every web entry exactly', () => {
  assert.equal(checkStrategyIntakePackage().preservedEntries, 291);
});
test('web manifest, workspace and nested resolved/integrity bindings fail closed', () => {
  for (const field of ['web', 'workspace', 'resolved', 'integrity']) {
    const value = inputs();
    if (field === 'web') value.web.dependencies['@capiro/shared'] = 'file:wrong.tgz';
    else if (field === 'workspace') value.lock.packages['apps/web'].dependencies['@capiro/shared'] = 'file:wrong.tgz';
    else value.lock.packages['apps/web/node_modules/@capiro/shared'][field] = 'wrong';
    assert.throws(() => verifyStrategyIntakePackage(value), /active dependency|active lock/);
  }
});
test('packed browser subpath supports actual CJS and ESM consumers with nullable date and full answers', async () => {
  const web = createRequire(path.join(root, 'apps/web/package.json'));
  const filename = web.resolve('@capiro/shared/strategy-intake');
  const cjs = web('@capiro/shared/strategy-intake'), esm = await import(pathToFileURL(filename));
  const imported = execFileSync(process.execPath, ['--input-type=module', '-e', "import { STRATEGY_INTAKE_TYPES } from '@capiro/shared/strategy-intake'; console.log(JSON.stringify(STRATEGY_INTAKE_TYPES));"], { cwd: path.join(root, 'apps/web'), encoding: 'utf8' });
  assert.deepEqual(JSON.parse(imported), cjs.STRATEGY_INTAKE_TYPES);
  for (const api of [cjs, esm]) {
    const answers = { schemaVersion: 1, type: 'appropriations', goal: 'g'.repeat(4000), ownerUserId: 'user_synthetic', targetDate: null, meriContext: 'c'.repeat(8000) };
    assert.deepEqual(api.parseStrategyIntake(answers, { requireComplete: true }), answers);
    assert.equal(api.strategyIntakeReadiness(answers).isReady, true);
    assert.throws(() => api.parseStrategyIntake({ ...answers, targetDate: '2026-02-30' }));
  }
});
test('packed public declarations resolve through exports in NodeNext and Bundler modes', () => {
  const ts = require('typescript'), probe = path.join(root, 'apps/web/intake-public-probe.ts');
  const source = "import {parseStrategyIntake, type StrategyIntakeAnswers} from '@capiro/shared/strategy-intake'; const value: StrategyIntakeAnswers = parseStrategyIntake({schemaVersion:1,type:'authorization',goal:'synthetic',ownerUserId:'user_synthetic',targetDate:null,meriContext:''}, {requireComplete:true}); void value;";
  for (const [module, moduleResolution] of [[ts.ModuleKind.NodeNext, ts.ModuleResolutionKind.NodeNext], [ts.ModuleKind.ESNext, ts.ModuleResolutionKind.Bundler]]) {
    const options = { noEmit: true, strict: true, skipLibCheck: true, types: [], target: ts.ScriptTarget.ES2022, module, moduleResolution };
    const resolution = ts.resolveModuleName('@capiro/shared/strategy-intake', probe, options, ts.sys).resolvedModule;
    assert.equal(path.resolve(resolution.resolvedFileName), path.resolve(root, 'apps/web/node_modules/@capiro/shared/dist/strategy-intake.d.ts'));
    const host = ts.createCompilerHost(options), read = host.readFile, exists = host.fileExists;
    host.readFile = file => path.resolve(file) === probe ? source : read(file);
    host.fileExists = file => path.resolve(file) === probe || exists(file);
    const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([probe], options, host));
    assert.deepEqual(diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')), []);
  }
});
