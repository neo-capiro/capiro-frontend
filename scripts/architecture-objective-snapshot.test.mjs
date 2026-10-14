import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectSources } from './architecture.mjs';
const owner = 'apps/web/src/shared/capiro/operations/objective-workspace-receiving.ts';
test('only the allocated receiving owner may use the exact public snapshot producer', () => {
  const admitted = "import { canonicalWorkspaceSnapshot } from '@capiro/shared'; export const encode = canonicalWorkspaceSnapshot;";
  assert.deepEqual(inspectSources(new Map([[owner, admitted]])).errors, []);
  for (const [path, source] of [
    [owner, "import * as shared from '@capiro/shared';"],
    [owner, "import { canonicalWorkspaceSnapshot, clientMemoryAllowed } from '@capiro/shared';"],
    ['apps/web/src/features/portfolio/calendar/Other.ts', admitted],
    [owner, "import { canonicalWorkspaceSnapshot } from '@capiro/shared/dist/workspace-saved-revision';"],
  ]) assert.ok(inspectSources(new Map([[path, source]])).errors.some(error => error.includes('non-public package import')));
});
