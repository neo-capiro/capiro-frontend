import test from 'node:test';
import assert from 'node:assert/strict';
import records from '../../apps/web/tests/meri-hearing-source-fixtures.json' with { type: 'json' };
import { fixture, event, stream, chunks, part, id, binding, scopes } from './conversation-fixture.mjs';

const source = () => ({ ...structuredClone(records.published.event), binding, scopes });
const forbiddenFetch = globalThis.fetch;
globalThis.fetch = () => { throw Error('Qualification forbids external network'); };
test.after(() => { globalThis.fetch = forbiddenFetch; });

test('installed native hearing admission preserves the SDK event cursor and completed history', async t => {
  const f = fixture(); t.after(f.close); await f.submit();
  const events = [event(1), source(), event(3, { data: { state: 'completed', reasonCode: null } })];
  f.override = call => call.path.endsWith('/events') ? stream(events) : undefined;
  const { chat } = f.client.openChat();
  await chat.sendMessage({ text: 'observe' });
  assert.equal(chat.status, 'ready');
  assert.deepEqual(f.client.getSnapshot().observation.events, events);
  assert.equal(f.client.getSnapshot().observation.after, 3);
  assert.equal(f.calls.filter(call => call.path.endsWith('/submit')).length, 1);
});

for (const [name, invalid] of [
  ['foreign hearing binding', () => ({ ...source(), binding: { ...binding, runId: id(80) } })],
  ['wrong hearing page location', () => ({ ...source(), data: { ...source().data, page: { ...source().data.page, characterStart: -1 } } })],
]) test(`${name} cannot reach the SDK or advance its source cursor`, async t => {
  const f = fixture(); t.after(f.close); await f.submit();
  f.override = call => call.path.endsWith('/events') ? chunks([part(event(1)), part(invalid())]) : undefined;
  const { chat } = f.client.openChat();
  await chat.sendMessage({ text: 'observe' });
  assert.equal(chat.status, 'error');
  assert.equal(f.client.getSnapshot().observation.after, 1);
  assert.deepEqual(f.client.getSnapshot().observation.events, [event(1)]);
});
