import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, chunks, part, event } from './conversation-fixture.mjs';

for (const operation of ['submit', 'cancel']) test(`pre-dispatch ${operation} retry failure preserves earlier unknown write`, async t => {
  const f = fixture(); t.after(f.close);
  if (operation === 'cancel') await f.submit();
  f.override = () => { throw Error('Synthetic lost acknowledgement'); };
  const attempt = () => operation === 'submit' ? f.submit() : f.client.cancel();
  await assert.rejects(attempt());
  assert.equal(f.client.getSnapshot()[operation], 'unknown');
  let armed = true;
  const unsubscribe = f.client.subscribe(() => {
    if (armed && f.client.getSnapshot()[operation] === 'pending') { armed = false; f.current = false; }
  });
  const before = f.calls.length;
  await assert.rejects(operation === 'submit' ? f.client.retrySubmit() : f.client.cancel());
  unsubscribe(); f.current = true;
  assert.equal(f.calls.length, before);
  assert.equal(f.client.getSnapshot()[operation], 'unknown');
  if (operation === 'submit') { await assert.rejects(f.submit()); assert.equal(f.calls.length, before); }
});

for (const status of [401, 403]) for (const replacement of ['dispose', 'abort', 'unavailable']) {
  test(`late ${status} after ${replacement} cannot revoke a replacement context`, async t => {
    const f = fixture(); t.after(f.close); let release;
    f.override = () => new Promise(resolve => { release = resolve; });
    const pending = f.submit(); await Promise.resolve();
    if (replacement === 'dispose') f.close();
    else if (replacement === 'abort') f.lifetime.abort();
    else f.current = false;
    release(new Response('malformed', { status }));
    await assert.rejects(pending);
    assert.equal(f.accessLost, 0);
    assert.equal(f.client.getSnapshot().observation, null);
  });
}

test('owned SDK messages and errors clear when its connection is disposed', async t => {
  const f = fixture(); t.after(f.close); await f.submit();
  const { chat } = f.client.openChat();
  await chat.sendMessage({ text: 'local previous-client text' });
  assert.ok(chat.messages.length > 0);
  f.close();
  assert.deepEqual(chat.messages, []);
  assert.equal(chat.error, undefined);
});

for (const chunk of [
  { type: 'message-metadata', messageMetadata: { private: 'unadmitted-sentinel' } },
  { type: 'start', messageId: 'synthetic', messageMetadata: { private: 'unadmitted-sentinel' } },
  { type: 'finish', messageMetadata: { private: 'unadmitted-sentinel' } },
  { type: 'error', errorText: 'unadmitted-sentinel' },
]) test(`conversation ${chunk.type} payload cannot bypass public event admission`, async t => {
  const f = fixture(); t.after(f.close); await f.submit();
  f.override = call => call.path.endsWith('/events') ? chunks([chunk]) : undefined;
  const { chat } = f.client.openChat(); await chat.sendMessage({ text: 'observe' });
  assert.equal(chat.status, 'error');
  assert.equal(f.client.getSnapshot().observation.after, 0);
  assert.equal(JSON.stringify(chat.messages).includes('unadmitted-sentinel'), false);
  assert.equal(String(chat.error).includes('unadmitted-sentinel'), false);
});

for (const [name, body] of [
  ['outer event ID', () => chunks([{ ...part(event(1)), id: 'unadmitted-sentinel' }])],
  ['SDK chunk schema', () => new Response('data: {"type":"unadmitted-sentinel"}\n\n', { headers: { 'content-type': 'text/event-stream' } })],
  ['SDK JSON parser', () => new Response('data: unadmitted-sentinel\n\n', { headers: { 'content-type': 'text/event-stream' } })],
]) test(`${name} diagnostics cannot expose unadmitted content`, async t => {
  const f = fixture(); t.after(f.close); await f.submit();
  f.override = call => call.path.endsWith('/events') ? body() : undefined;
  const { chat } = f.client.openChat(); await chat.sendMessage({ text: 'observe' });
  assert.equal(chat.status, 'error'); assert.equal(f.client.getSnapshot().observation.after, 0);
  assert.equal(JSON.stringify(chat.messages).includes('unadmitted-sentinel'), false);
  assert.equal(String(chat.error).includes('unadmitted-sentinel'), false);
});

for (const status of [401, 403]) test(`synchronous replacement during ${status} cleanup receives no stale access-loss callback`, async t => {
  const f = fixture(); t.after(f.close); await f.submit();
  f.client.subscribe(() => { if (f.client.getSnapshot().status === 'disposed') f.current = false; });
  f.override = () => new Response('malformed', { status });
  await assert.rejects(f.client.history());
  assert.equal(f.client.getSnapshot().status, 'disposed');
  assert.equal(f.accessLost, 0);
});
