import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inspectSources } from './architecture.mjs';

const routes = ['apps/web/src/app/api/uploads/[operation]/route.ts', 'apps/web/src/app/api/uploads/original/[uploadId]/route.ts'];
const owners = ['shared/preview/backend-policy.server', 'shared/meri-uploads/config', 'shared/meri-uploads/proxy'];
const fixture = route => new Map([
  [route, readFileSync(new URL(`../${route}`, import.meta.url), 'utf8')],
  ...owners.map(owner => [`apps/web/src/${owner}.ts`, 'export const fixture = true;']),
]);

test('actual uploads entries retain only their exact preview/auth/config/proxy owners', () => {
  for (const route of routes) {
    assert.deepEqual(inspectSources(fixture(route)).errors, []);
    const wrongOwner = fixture(route);
    wrongOwner.set(route, `${wrongOwner.get(route)}\nimport '@/shared/meri-documents/proxy';`);
    wrongOwner.set('apps/web/src/shared/meri-documents/proxy.ts', 'export const fixture = true;');
    assert.ok(inspectSources(wrongOwner).errors.some(error => error.includes('server adapter dependency')));
  }
});

test('upload allocation does not admit sibling endpoints or oversized handlers', () => {
  for (const route of routes) {
    const sibling = fixture(route);
    sibling.set(route.replace('/uploads/', '/uploads-unallocated/'), sibling.get(route));
    assert.ok(inspectSources(sibling).errors.some(error => error.includes('backend route handler is not allocated')));
    const oversized = fixture(route);
    oversized.set(route, `export function POST(){\n${'void 0;\n'.repeat(81)}}`);
    assert.ok(inspectSources(oversized).errors.some(error => error.includes('server adapter must stay thin')));
  }
});

test('the upload receiving boundary admits only the canonical public export', () => {
  const from = 'apps/web/src/shared/meri-uploads/facade.ts';
  assert.deepEqual(inspectSources(new Map([[from, "export * from '@capiro/meri-contracts/uploads-application';"]])).errors, []);
  for (const specifier of ['@capiro/meri-contracts/uploads-application/receive.mjs', 'meri-greenfield/apps/control/uploads/custody.mjs']) {
    assert.ok(inspectSources(new Map([[from, `import '${specifier}';`]])).errors.length > 0);
  }
});
