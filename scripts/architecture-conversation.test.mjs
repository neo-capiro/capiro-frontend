import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectSources } from './architecture.mjs';

test('conversation receiving admits its two deliberate public seams', () => {
  const files = new Map([
    ['packages/meri-client/src/connection.ts', "import '@capiro/meri-contracts/conversation-application';"],
    ['apps/web/src/features/meri/Connection.ts', "import '@capiro/meri-client/conversation';"],
  ]);
  assert.deepEqual(inspectSources(files).errors, []);
});

test('conversation receiving does not admit private service, cursor or schema entry points', () => {
  for (const specifier of [
    '@capiro/meri-contracts/conversation-application/receive',
    '@capiro/meri-contracts/conversation-application/schema',
    '@capiro/meri-client/conversation-network',
    '@capiro/meri-client/src/conversation-client',
    'meri-greenfield/apps/control/conversations/service.mjs',
  ]) {
    const errors = inspectSources(new Map([['packages/meri-client/src/connection.ts', `import '${specifier}';`]])).errors;
    assert.ok(errors.some(error => /non-public package|restricted runtime/.test(error)), specifier);
  }
});

test('conversation proxy does not allocate an additional per-operation server route', () => {
  const errors = inspectSources(new Map([['apps/web/src/app/api/conversations/submit/route.ts', 'export function POST() {}']])).errors;
  assert.ok(errors.some(error => error.includes('backend route handler is not allocated')));
});

const route = 'apps/web/src/app/api/conversations/[...path]/route.ts';
test('conversation catch-all route remains allocated only to auth, preview, config and fixed proxy owners', () => {
  const good = "import '@clerk/nextjs/server'; import '@/shared/preview/backend-policy.server'; import '@/shared/meri-conversations/config'; import '@/shared/meri-conversations/proxy';";
  const sources = new Map([[route, good], ...['preview/backend-policy.server', 'meri-conversations/config', 'meri-conversations/proxy'].map(name => [`apps/web/src/shared/${name}.ts`, 'export {};'])]);
  assert.deepEqual(inspectSources(sources).errors, []);
  for (const denied of ['features/meri/private', 'shared/portfolio/api/http'])
    assert.ok(inspectSources(new Map([[route, `import '@/${denied}';`]])).errors.length);
});
