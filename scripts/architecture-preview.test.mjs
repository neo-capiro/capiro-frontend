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
