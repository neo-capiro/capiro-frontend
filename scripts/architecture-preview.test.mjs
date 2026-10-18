import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectSources } from './architecture.mjs';

const policy = 'apps/web/src/shared/preview/backend-policy.server.ts';
const implementation = 'export const previewBackendRejection = () => null;';
test('preview policy is allocated only to the existing backend entries and Next proxy', () => {
  for (const entry of [
    'app/api/backend/[service]/[...path]/route.ts',
    'app/api/capiro/[operation]/route.ts',
    'app/api/action-followthrough/[operation]/route.ts',
    'app/api/documents/[operation]/route.ts',
    'app/api/documents/links/[action]/route.ts',
    'app/api/conversations/[...path]/route.ts',
    'proxy.ts',
  ]) {
    const files = new Map([[`apps/web/src/${entry}`, "import '@/shared/preview/backend-policy.server';"], [policy, implementation]]);
    assert.deepEqual(inspectSources(files).errors, [], entry);
  }
});
test('preview policy cannot leak into client features, foundations, pages or unallocated routes', () => {
  for (const entry of [
    'features/portfolio/home/client.tsx', 'features/modules/client.tsx',
    'shared/session/client.tsx', 'app/page.tsx', 'app/healthz/route.ts',
    'app/api/new-service/route.ts',
  ]) {
    const files = new Map([[`apps/web/src/${entry}`, "import '@/shared/preview/backend-policy.server';"], [policy, implementation]]);
    assert.ok(inspectSources(files).errors.some(error => /preview policy|server adapter dependency|not allocated/.test(error)), entry);
  }
});

test('all preview internals are server allocated, including through client foundations', () => {
  for (const name of ['read-config.server', 'read-route.server', 'read-proxy.server', 'first-chat-gateway.server']) {
    const target = `apps/web/src/shared/preview/${name}.ts`;
    for (const entry of ['features/portfolio/home/client.tsx', 'shared/session/client.tsx', 'app/page.tsx', 'proxy.ts', 'app/api/action-followthrough/[operation]/route.ts']) {
      const files = new Map([[`apps/web/src/${entry}`, `import '@/shared/preview/${name}';`], [target, 'export const value = 1;']]);
      assert.ok(inspectSources(files).errors.some(error => /preview policy|server adapter dependency/.test(error)), `${entry} -> ${name}`);
    }
  }
});

test('only the two server-rendered preview pages may read the qualified UI mode', () => {
  const target = 'apps/web/src/shared/preview/read-config.server.ts';
  const allowed = "import { isQualifiedCorePreviewReadEnabled } from '@/shared/preview/read-config.server';";
  for (const entry of ['app/(portfolio)/(product)/portfolio/page.tsx', 'app/modules/page.tsx']) {
    const files = new Map([[`apps/web/src/${entry}`, allowed], [target, 'export const isQualifiedCorePreviewReadEnabled = () => false;']]);
    assert.deepEqual(inspectSources(files).errors, [], entry);
    const broad = new Map([[`apps/web/src/${entry}`, "import { previewReadTarget } from '@/shared/preview/read-config.server';"], [target, 'export const previewReadTarget = () => null;']]);
    assert.ok(inspectSources(broad).errors.some(error => /preview policy/.test(error)), entry);
  }
});

test('first-chat gateway is allocated only to the Capiro server route', () => {
  const target = 'apps/web/src/shared/preview/first-chat-gateway.server.ts';
  const source = "import '@/shared/preview/first-chat-gateway.server';";
  const files = new Map([
    ['apps/web/src/app/api/capiro/[operation]/route.ts', source],
    [target, 'export const value = 1;'],
  ]);
  assert.deepEqual(inspectSources(files).errors, []);
  for (const entry of ['proxy.ts', 'app/api/backend/[service]/[...path]/route.ts']) {
    const rejected = new Map([[`apps/web/src/${entry}`, source], [target, 'export const value = 1;']]);
    assert.ok(inspectSources(rejected).errors.length, entry);
  }
});
