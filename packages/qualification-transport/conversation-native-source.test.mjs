import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeSource } from '../../apps/web/tests/meri-current-read-fixtures.ts';
import { fixture, event, stream, chunks, part, id, binding, scopes } from './conversation-fixture.mjs';

const source = () => ({ ...nativeSource(), binding, scopes });
const forbiddenFetch = globalThis.fetch;
globalThis.fetch = () => { throw Error('Qualification forbids external network'); };
test.after(() => { globalThis.fetch = forbiddenFetch; });
const setup = async t => { const f = fixture(); t.after(f.close); await f.submit(); return f; };

test('native bill source and legacy events share the actual SDK subscription and public cursor', async t => {
  const f = await setup(t);
  const events = [event(1), source(), event(3, { data: { state: 'completed', reasonCode: null } })];
  f.override = call => call.path.endsWith('/events') ? stream(events) : undefined;
  const { chat } = f.client.openChat();
  await chat.sendMessage({ text: 'observe' });
  assert.equal(chat.status, 'ready');
  const observed = f.client.getSnapshot().observation;
  assert.equal(observed.after, 3);
  assert.equal(observed.runState, 'completed');
  assert.deepEqual(observed.events, events);
  assert.equal(f.calls.filter(call => call.path.endsWith('/submit')).length, 1);
});

test('native source reconnect preserves the admitted legacy cursor', async t => {
  const f = await setup(t);
  await f.client.history({ limit: 1 });
  f.override = call => call.method === 'GET' ? stream([source()]) : undefined;
  const { chat } = f.client.openChat();
  await chat.resumeStream();
  assert.equal(chat.status, 'ready');
  assert.equal(f.calls.at(-1).headers['x-meri-resume-sequence'], '1');
  assert.equal(f.client.getSnapshot().observation.after, 2);
  assert.deepEqual(f.client.getSnapshot().observation.events, [event(1), source()]);
});

for (const [name, rejected] of [
  ['unknown event', () => part({ ...source(), type: 'source.unadmitted-sentinel' })],
  ['unknown native field', () => part({ ...source(), data: { ...source().data, private: 'unadmitted-sentinel' } })],
  ['invalid native page', () => part({ ...source(), data: { ...source().data, page: { ...source().data.page, offset: -1 } } })],
  ['foreign binding', () => part({ ...source(), binding: { ...binding, runId: id(80) } })],
  ['outer ID mismatch', () => ({ ...part(source()), id: id(80) })],
  ['nontransient native data', () => ({ ...part(source()), transient: false })],
]) test(`${name} rejects before cursor or SDK publication`, async t => {
  const f = await setup(t);
  f.override = call => call.path.endsWith('/events') ? chunks([part(event(1)), rejected()]) : undefined;
  const { chat } = f.client.openChat();
  await chat.sendMessage({ text: 'observe' });
  assert.equal(chat.status, 'error');
  assert.equal(f.client.getSnapshot().observation.after, 1);
  assert.deepEqual(f.client.getSnapshot().observation.events, [event(1)]);
  assert.equal(JSON.stringify(chat.messages).includes('unadmitted-sentinel'), false);
  assert.equal(String(chat.error).includes('unadmitted-sentinel'), false);
});

test('a native source arriving after lifetime replacement cannot advance the cursor', async t => {
  const f = await setup(t);
  let release, ready;
  const opened = new Promise(resolve => { ready = resolve; });
  const bytes = new Uint8Array(await stream([event(1), source()]).arrayBuffer());
  f.override = call => call.path.endsWith('/events') ? new Response(new ReadableStream({
    start(controller) { release = () => { controller.enqueue(bytes); controller.close(); }; ready(); },
  }), { headers: { 'content-type': 'text/event-stream' } }) : undefined;
  const { chat } = f.client.openChat();
  const pending = chat.sendMessage({ text: 'observe' });
  await opened;
  f.current = false;
  release();
  await pending;
  assert.equal(chat.status, 'error');
  assert.equal(f.client.getSnapshot().status, 'unavailable');
  assert.equal(f.client.getSnapshot().observation, null);
});
