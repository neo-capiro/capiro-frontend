import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectSources } from './architecture.mjs';

const route = 'apps/web/src/app/api/action-followthrough/[operation]/route.ts';
const config = 'apps/web/src/shared/meri-actions/config.ts';
const proxy = 'apps/web/src/shared/meri-actions/proxy.ts';
const files = () => new Map([
  [route, "import { auth } from '@clerk/nextjs/server'; import { readActionConfig } from '@/shared/meri-actions/config'; import { proxyActionRequest } from '@/shared/meri-actions/proxy'; export const POST = proxyActionRequest;"],
  [config, 'export const readActionConfig = () => ({});'],
  [proxy, 'export const proxyActionRequest = () => new Response();'],
]);
test('action route is allocated only to the existing auth and narrow adapter owners', () => {
  assert.deepEqual(inspectSources(files()).errors, []);
  const bad = files();
  bad.set(route, "import '@/features/meri/private';");
  bad.set('apps/web/src/features/meri/private.ts', 'export const fixture = 1;');
  assert.ok(inspectSources(bad).errors.some(value => value.includes('server adapter dependency')));
});
test('action route allocation does not admit another endpoint or a large handler', () => {
  const bad = files();
  bad.set(route.replace('[operation]', 'approve'), bad.get(route));
  assert.ok(inspectSources(bad).errors.some(value => value.includes('backend route handler is not allocated')));
  bad.delete(route.replace('[operation]', 'approve'));
  bad.set(route, `export function POST(){\n${'void 0;\n'.repeat(81)}}`);
  assert.ok(inspectSources(bad).errors.some(value => value.includes('server adapter must stay thin')));
});
test('action receiver is public while private runtime ownership stays forbidden', () => {
  const file = 'apps/web/src/shared/meri-actions/fixture.ts';
  assert.deepEqual(inspectSources(new Map([[file, "import '@capiro/meri-contracts/action-application';"]])).errors, []);
  for (const specifier of ['@capiro/meri-contracts/private/action-authority', 'meri-greenfield/apps/control/action-host']) {
    assert.ok(inspectSources(new Map([[file, `import '${specifier}';`]])).errors.length > 0);
  }
});
