import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifyTaskCommandInput, checkTaskCommandInput } from './task-command-public-input.mjs';

test('retained task-command public generated input matches producing source and deliberate export', () => {
  assert.equal(checkTaskCommandInput().records.length, 4);
});
test('task-command snapshot refuses missing, duplicate, substituted and changed file bytes', () => {
  const bytes = Buffer.from('synthetic');
  const manifest = { schema: 'meri-task-command-public-input/1', repository: 'neo-capiro/meri-greenfield', sourceCommit: 'a'.repeat(40), publicExport: '@capiro/meri-contracts/task-command-application', files: ['mjs', 'd.ts', 'schema.json', 'metadata.json'].map(extension => ({ file: 'task-command-application.' + extension, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })) };
  assert.equal(verifyTaskCommandInput(manifest, () => bytes).length, 4);
  for (const mutate of [m => m.files.pop(), m => { m.files[1] = m.files[0]; }, m => { m.files[0].file = '../private-source'; }, m => { m.sourceCommit = 'unreviewed'; }]) {
    const changed = structuredClone(manifest); mutate(changed); assert.throws(() => verifyTaskCommandInput(changed, () => bytes));
  }
  assert.throws(() => verifyTaskCommandInput(manifest, () => Buffer.from('changed')));
});
