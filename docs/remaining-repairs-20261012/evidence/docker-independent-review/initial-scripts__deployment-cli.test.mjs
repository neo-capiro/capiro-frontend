import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const prepare = 'apps/web/deployment/portfolio/qualify-elements.mjs';
const smoke = 'apps/web/deployment/portfolio/smoke.sh';
function run(binary, args, expected) {
  const result = spawnSync(binary, args, { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, expected, result.stderr);
  return result;
}

test('shipping SSR entry is import-safe and refuses invalid/reused output before download', () => {
  const imported = run(process.execPath, ['--input-type=module', '-e', `await import('./${prepare}')`], 0);
  assert.equal(imported.stdout, '');
  assert.equal(imported.stderr, '');
  assert.match(run(process.execPath, [prepare, '--help'], 0).stdout, /Exit 0: qualified/);
  run(process.execPath, [prepare], 2);
  run(process.execPath, [prepare, 'relative'], 2);
  const inside = resolve(`shipping-refused-work-root-${process.pid}`);
  assert.equal(existsSync(inside), false);
  assert.match(run(process.execPath, [prepare, inside], 1).stderr, /outside checkout/);
  assert.equal(existsSync(inside), false);
  assert.match(run(process.execPath, [prepare, tmpdir()], 1).stderr, /EEXIST/);
});

test('container smoke documents exits and rejects invalid input before Docker allocation', () => {
  run('bash', ['-n', smoke], 0);
  assert.match(run('bash', [smoke, '--help'], 0).stdout, /ephemeral loopback port/);
  run('bash', [smoke], 2);
  run('bash', [smoke, '--bad'], 2);
  run('bash', [smoke, 'one', 'two'], 2);
});

test('Docker context regression is import-safe and refuses invalid or reused outputs before allocation', () => {
  const script = 'scripts/docker-context-regression.mjs';
  const imported = run(process.execPath, ['--input-type=module', '-e', `await import('./${script}')`], 0);
  assert.equal(imported.stdout, '');
  assert.equal(imported.stderr, '');
  assert.match(run(process.execPath, [script, '--help'], 0).stdout, /context\/build failure/);
  run(process.execPath, [script], 2);
  run(process.execPath, [script, '--artifacts'], 2);
  run(process.execPath, [script, '--artifacts', '--help'], 2);
  const inside = resolve(`docker-context-refused-output-${process.pid}`);
  assert.equal(existsSync(inside), false);
  assert.match(run(process.execPath, [script, '--artifacts', inside], 1).stderr, /outside checkout/);
  assert.equal(existsSync(inside), false);
  assert.match(run(process.execPath, [script, '--artifacts', tmpdir()], 1).stderr, /must be new/);
});
