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

test('conversation qualification does not allocate any new web server route', () => {
  const errors = inspectSources(new Map([['apps/web/src/app/api/conversations/submit/route.ts', 'export function POST() {}']])).errors;
  assert.ok(errors.some(error => error.includes('backend route handler is not allocated')));
});
