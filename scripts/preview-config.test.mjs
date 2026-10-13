import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { renderPreviewConfiguration, validatePreviewParameters } from '../apps/web/deployment/portfolio/preview-config.mjs';

// Clearly synthetic public references: not live resource or credential bindings.
const bindings = {
  clerkIssuer: 'https://synthetic-preview.clerk.accounts.dev',
  clerkApplicationId: 'app_syntheticpreview',
  clerkPublishableKeyArn: 'arn:aws:secretsmanager:us-east-1:967807252336:secret:/capiro/preview/clerk/publishable-key-AbCd12',
  clerkSecretArn: 'arn:aws:secretsmanager:us-east-1:967807252336:secret:/capiro/preview/clerk/secret-key-EfGh34',
  clerkKeyArn: 'arn:aws:kms:us-east-1:967807252336:key/10000000-0000-4000-8000-000000000001',
};
const script = 'apps/web/deployment/portfolio/preview-config.mjs';
const template = readFileSync('apps/web/deployment/portfolio/service.yml', 'utf8');

test('preview proposes only the three published owners; unavailable services stay disabled', () => {
  const p = renderPreviewConfiguration(bindings);
  assert.equal(p.environment.CORE_API_BASE_URL, 'https://portfolio-preview.app.capiro.ai/api');
  assert.equal(p.environment.WORKSPACE_API_BASE_URL, 'https://portfolio-preview.app.capiro.ai/workspace-api');
  assert.equal(p.environment.INTELLIGENCE_API_BASE_URL, 'https://portfolio-preview.app.capiro.ai/intel-api');
  for (const name of ['STRATEGY_API_BASE_URL', 'ONBOARD_API_BASE_URL', 'MERI_API_BASE_URL', 'MERI_DOCUMENT_OPERATION']) assert.equal(p.environment[name], '');
  assert.equal(p.environment.MERI_ACTION_WORKFLOW_ENABLED, 'false');
  assert.equal(p.environment.MERI_DOCUMENT_WORKFLOW_ENABLED, 'false');
  assert.equal(p.parameters.length, 9);
  assert.equal(p.clerkMetadata.requiredEnvironment, 'test');
  assert.match(p.activationStatus, /held at zero/);
  assert.equal(Object.hasOwn(p.environment, 'CLERK_SECRET_KEY'), false);
  assert.equal(p.secretReferences.CLERK_SECRET_KEY, bindings.clerkSecretArn);
  validatePreviewParameters(p.parameters.toReversed(), bindings);
});

test('preview rejects unknown, missing, credential-valued and production Clerk bindings', () => {
  for (const invalid of [null, [], {}, { ...bindings, extra: 'value' }, { ...bindings, clerkIssuer: 'https://clerk.capiro.ai' },
    { ...bindings, clerkSecretArn: 'sk_live_synthetic' }, { ...bindings, clerkSecretArn: bindings.clerkSecretArn.replace('/preview/', '/production/') },
    { ...bindings, clerkPublishableKeyArn: bindings.clerkSecretArn }, { ...bindings, clerkKeyArn: bindings.clerkKeyArn.replace('967807252336', '111111111111') },
    { ...bindings, clerkIssuer: `${bindings.clerkIssuer}/` }, { ...bindings, clerkApplicationId: ' app_syntheticpreview' }]) {
    assert.throws(() => renderPreviewConfiguration(invalid), /PREVIEW_BIND/);
  }
});

test('preview rejects retained or overridden production parameters and ambiguous sets', () => {
  const p = renderPreviewConfiguration(bindings).parameters;
  for (const invalid of [p.slice(1), [...p, p[0]], p.map((v, i) => i ? v : { ParameterKey: v.ParameterKey, UsePreviousValue: true }),
    p.map((v, i) => i ? v : { ...v, ParameterValue: 'https://os.capiro.ai/api' }),
    p.map((v, i) => i ? v : { ...v, UsePreviousValue: false }),
    p.map((v, i) => i ? v : p[1])]) {
    assert.throws(() => validatePreviewParameters(invalid, bindings), /PREVIEW_PARAM/);
  }
});

test('preview template constrains every explicit configuration value and keeps held services blank', () => {
  const p = renderPreviewConfiguration(bindings);
  for (const item of p.parameters) {
    const block = template.match(new RegExp(`^  ${item.ParameterKey}:\\n([\\s\\S]*?)(?=^  \\w+:|^Resources:)`, 'm'))?.[1];
    assert.ok(block, item.ParameterKey);
    if (item.ParameterKey.startsWith('Clerk')) {
      const pattern = JSON.parse(block.match(/AllowedPattern: (".*")/)?.[1] ?? 'null');
      assert.equal(typeof pattern, 'string', item.ParameterKey);
      assert.match(item.ParameterValue, new RegExp(pattern));
      assert.doesNotMatch('sk_live_synthetic', new RegExp(pattern));
    } else {
      const allowed = JSON.parse(block.match(/AllowedValues: (\[.*\])/)?.[1] ?? 'null');
      assert.deepEqual(allowed, [item.ParameterValue], item.ParameterKey);
    }
  }
  assert.doesNotMatch(template, /https:\/\/os\.capiro\.ai/);
  for (const [name, value] of Object.entries(p.environment).filter(([name]) => /^(ONBOARD_|MERI_)/.test(name))) {
    assert.match(template, new RegExp(`- Name: ${name}\\n +Value: "${value}"`));
  }
});

test('preview CLI is import-safe, ignores hostile ambient values and never echoes rejected secrets', () => {
  const env = { ...process.env, CORE_API_BASE_URL: 'https://os.capiro.ai/api', CLERK_SECRET_KEY: 'sk_live_do_not_echo', NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_do_not_echo' };
  const run = args => spawnSync(process.execPath, args, { encoding: 'utf8', env, timeout: 10000 });
  const imported = run(['--input-type=module', '-e', `await import('./${script}')`]);
  assert.equal(imported.status, 0); assert.equal(imported.stdout, ''); assert.equal(imported.stderr, '');
  assert.equal(run([script, '--help']).status, 0);
  assert.equal(run([script]).status, 2);
  const dir = mkdtempSync(join(tmpdir(), 'capiro-preview-config-'));
  try {
    const input = join(dir, 'bindings.json');
    const alias = join(dir, 'preview-entry.mjs');
    symlinkSync(resolve(script), alias);
    const aliasHelp = run([alias, '--help']);
    assert.equal(aliasHelp.status, 0); assert.match(aliasHelp.stdout, /Usage:/);
    assert.equal(run([alias]).status, 2);
    writeFileSync(input, JSON.stringify(bindings));
    const good = run([script, '--bindings', input]);
    assert.equal(good.status, 0, good.stderr);
    assert.equal(JSON.parse(good.stdout).environment.CORE_API_BASE_URL, 'https://portfolio-preview.app.capiro.ai/api');
    assert.doesNotMatch(good.stdout, /do_not_echo|os\.capiro\.ai/);
    const aliasGood = run([alias, '--bindings', input]);
    assert.equal(aliasGood.status, 0); assert.equal(aliasGood.stdout, good.stdout);
    writeFileSync(input, JSON.stringify({ ...bindings, clerkSecretArn: env.CLERK_SECRET_KEY }));
    const bad = run([script, '--bindings', input]);
    assert.equal(bad.status, 1); assert.equal(bad.stdout, ''); assert.doesNotMatch(bad.stderr, /sk_live|do_not_echo/);
    writeFileSync(input, '{"sk_live_do_not_echo":');
    const malformed = run([script, '--bindings', input]);
    assert.equal(malformed.status, 1); assert.equal(malformed.stdout, ''); assert.doesNotMatch(malformed.stderr, /sk_live|do_not_echo/);
    const missing = run([script, '--bindings', join(dir, 'missing.json')]);
    assert.equal(missing.status, 1); assert.equal(missing.stdout, '');
  } finally { rmSync(dir, { recursive: true }); }
});
