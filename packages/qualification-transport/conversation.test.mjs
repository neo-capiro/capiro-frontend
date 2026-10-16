import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, event, stream, chunks, part, id, binding, run, drain } from './conversation-fixture.mjs';

const forbiddenFetch = globalThis.fetch;
globalThis.fetch = () => { throw Error('Qualification forbids external network'); };
test.after(() => { globalThis.fetch = forbiddenFetch; });
const setup = t => { const f = fixture(); t.after(f.close); return f; };

// Actual upstream Chat/DefaultChatTransport and the installed public receiver are used throughout.
test('closed POST subscription starts at zero despite advertised stored tip; finish is observation only', async t => {
  const f = setup(t); await f.submit();
  assert.equal(f.client.getSnapshot().observation.after, 0);
  const { chat } = f.client.openChat();
  await chat.sendMessage({ text: 'not a second prompt' }, { body: { prompt: 'smuggled', after: 2, tenantId: 'foreign' } });
  assert.equal(chat.status, 'ready');
  assert.deepEqual(f.calls[2].body, { command: { conversationId: binding.conversationId, intent: 'view.subscribe' } });
  assert.equal(f.calls.filter(c => c.path.endsWith('/submit')).length, 1);
  assert.equal(f.client.getSnapshot().observation.after, 2);
  assert.equal(f.client.getSnapshot().observation.runState, 'running');
  assert.equal(f.calls.filter(c => c.path.endsWith('/cancel')).length, 0);
  assert.equal(JSON.stringify(f.client).includes('action_session_'), false);
});

test('partial history acknowledges only observed page; actual SDK GET resumes at60, not advertised200', async t => {
  const f = fixture({ count: 200 }); t.after(f.close); await f.submit();
  await f.client.history({ after: 40, limit: 20 });
  const before = f.client.getSnapshot().observation;
  assert.equal(before.after, 60); assert.equal(before.omittedPrefix, true); assert.equal(before.hasMore, true);
  assert.deepEqual(before.events.map(e => e.sequence), Array.from({ length: 20 }, (_, i) => i + 41));
  f.override = call => call.method === 'GET' ? stream([event(61)]) : undefined;
  await f.client.openChat().chat.resumeStream();
  const call = f.calls.at(-1);
  assert.equal(call.method, 'GET'); assert.equal(call.path, `/api/conversations/events/${binding.conversationId}/stream`);
  assert.equal(call.headers['x-meri-resume-sequence'], '60'); assert.equal(call.body, undefined);
  assert.equal(call.headers['last-event-id'], undefined);
  assert.equal(f.client.getSnapshot().observation.after, 61);
});

for (const [name, bad] of [
  ['outer ID', () => ({ ...part(event(1)), id: id(999) })],
  ['missing ID', () => ({ type: 'data-meri-event', transient: true, data: event(1) })],
  ['nontransient data', () => ({ ...part(event(1)), transient: false })],
  ['native text', () => ({ type: 'text-start', id: 'native' })],
]) test(`${name} rejects before cursor consumption; real reconnect can still admit sequence1`, async t => {
  const f = setup(t); await f.submit();
  f.override = call => call.path.endsWith('/events') ? chunks([bad()]) : call.method === 'GET' ? stream([event(1)]) : undefined;
  const { chat } = f.client.openChat(); await chat.sendMessage({ text: 'observe' });
  assert.equal(chat.status, 'error'); assert.equal(f.client.getSnapshot().observation.after, 0);
  await chat.resumeStream();
  assert.equal(f.calls.at(-1).headers['x-meri-resume-sequence'], '0');
  assert.equal(f.client.getSnapshot().observation.after, 1);
});

for (const [name, following] of [
  ['identical replay', event(1)], ['immutable-ID reuse', event(2, { eventId: event(1).eventId })],
  ['gap', event(3)], ['foreign attempt', event(2, { binding: { ...binding, attemptId: id(80) } })],
  ['foreign worker', event(2, { binding: { ...binding, workerId: id(80) } })],
  ['foreign fence', event(2, { binding: { ...binding, writerFence: 2 } })],
  ['foreign scope', event(2, { scopes: [{ ...run.scopes[0], resourceId: id(80) }] })],
]) test(`public receiver refuses ${name} and retains the last admitted cursor`, async t => {
  const f = setup(t); await f.submit(); f.override = c => c.path.endsWith('/events') ? chunks([part(event(1)), part(following)]) : undefined;
  const { chat } = f.client.openChat(); await chat.sendMessage({ text: 'observe' });
  assert.equal(chat.status, 'error'); assert.equal(f.client.getSnapshot().observation.after, 1);
  assert.equal(f.client.getSnapshot().observation.events.length, 1);
});

test('split UTF8 and SSE boundaries pass through the actual SDK unchanged', async t => {
  const f = setup(t); await f.submit();
  const original = new Uint8Array(await stream([event(1, { type: 'message.delta', data: { messageId: id(90), text: 'a✓世z' } })]).arrayBuffer());
  f.override = c => c.path.endsWith('/events') ? new Response(new ReadableStream({ start(controller) {
    for (let n = 0; n < original.length; n += 3) controller.enqueue(original.slice(n, n + 3)); controller.close();
  } }), { headers: { 'content-type': 'text/event-stream' } }) : undefined;
  await f.client.openChat().chat.sendMessage({ text: 'observe' });
  assert.equal(f.client.getSnapshot().observation.events[0].data.text, 'a✓世z');
});

for (const [name, bytes] of [
  ['invalid original UTF8', new Uint8Array([0xc3, 0x28])],
  ['unfinished oversized SSE frame', new Uint8Array(8 * 1024 * 1024 + 1).fill(32)],
]) test(`${name} errors before SDK data or cursor admission and cancels its body`, async t => {
  const f = setup(t); await f.submit(); let cancelled = 0;
  f.override = c => c.path.endsWith('/events') ? new Response(new ReadableStream({ start(controller) { controller.enqueue(bytes); }, cancel() { cancelled++; } }), { headers: { 'content-type': 'text/event-stream' } }) : undefined;
  const { chat } = f.client.openChat(); await chat.sendMessage({ text: 'observe' });
  assert.equal(chat.status, 'error'); assert.equal(f.client.getSnapshot().observation.after, 0);
  assert.equal(cancelled, 1);
});

test('oversized admitted-looking event is bounded by public event receiver separately from wire segment', async t => {
  const f = setup(t); await f.submit();
  f.override = c => c.path.endsWith('/events') ? chunks([part(event(1, { type: 'message.delta', data: { messageId: id(90), text: 'x'.repeat(2 * 1024 * 1024) } }))]) : undefined;
  const { chat } = f.client.openChat(); await chat.sendMessage({ text: 'observe' });
  assert.equal(chat.status, 'error'); assert.equal(f.client.getSnapshot().observation.after, 0);
});

for (const status of [401, 403]) test(`malformed ${status} revokes before JSON admission and clears prior content`, async t => {
  const f = setup(t); await f.submit(); await f.client.history();
  f.override = () => new Response('private malformed', { status });
  await assert.rejects(f.client.history());
  assert.equal(f.accessLost, 1); assert.equal(f.client.getSnapshot().status, 'disposed');
  assert.equal(f.client.getSnapshot().observation, null);
  const calls = f.calls.length; await assert.rejects(f.submit()); assert.equal(f.calls.length, calls);
});

test('lost submit acknowledgement fences new intent and explicit retry preserves exact original bytes', async t => {
  const f = setup(t); let lost = true;
  f.override = c => { if (c.path.endsWith('/submit') && lost) { lost = false; throw Error('synthetic lost acknowledgement'); } };
  const input = { requestId: id(6), prompt: 'original' };
  await assert.rejects(f.client.submit(input)); input.prompt = 'changed';
  assert.equal(f.client.getSnapshot().submit, 'unknown');
  await assert.rejects(f.client.submit(input)); assert.equal(f.calls.length, 2);
  await f.client.retrySubmit();
  const submits = f.calls.filter(c => c.path.endsWith('/submit'));
  assert.equal(submits.length, 2); assert.equal(submits[0].rawBody, submits[1].rawBody);
  assert.ok(f.calls.filter(c => c.path.endsWith('/input/admit')).every(c => c.rawBody === submits[0].rawBody));
  assert.equal(f.client.getSnapshot().submit, 'observed');
});

test('current session and selected client are correlated before first view publication', async t => {
  for (const change of [{ binding: { ...binding, runId: id(88) } }, { scopes: [{ ...run.scopes[0], resourceId: id(88) }] }]) {
    const f = setup(t); f.override = c => c.path.endsWith('/submit') ? Response.json({ run: { ...run, ...change }, requestId: id(6), lastSequence: 2, replayed: false }) : undefined;
    await assert.rejects(f.submit()); assert.equal(f.client.getSnapshot().observation, null);
  }
});

test('held input admission cannot repopulate disposed lifetime or dispatch submit; disposal makes no durable cancel', async t => {
  const f = setup(t); let release;
  f.override = () => new Promise(resolve => { release = resolve; });
  const pending = f.submit(); await Promise.resolve(); f.close();
  release(Response.json({ run, request: f.stored, lastSequence: 2, replayed: false }));
  await assert.rejects(pending); assert.equal(f.client.getSnapshot().status, 'disposed');
  assert.equal(f.client.getSnapshot().observation, null); assert.equal(f.calls.length, 1);
});

test('explicit cancellation preserves a completed receipt; subscription detach never calls cancel', async t => {
  const f = setup(t); await f.submit();
  f.override = c => c.path.endsWith('/cancel') ? Response.json({ state: 'completed' }) : undefined;
  const handle = f.client.openChat(); await handle.chat.sendMessage({ text: 'observe' });
  await handle.chat.dispose(); assert.equal(f.calls.filter(c => c.path.endsWith('/cancel')).length, 0);
  assert.deepEqual(await f.client.cancel(), { state: 'completed' });
  assert.equal(f.client.getSnapshot().cancelReceipt.state, 'completed');
  assert.equal(f.client.getSnapshot().observation.runState, 'running');
  await assert.rejects(handle.transport.reconnectToStream({ chatId: binding.conversationId }));
});

test('HTTP204 reconnect ends observation without completing the run', async t => {
  const f = setup(t); await f.submit(); f.override = c => c.method === 'GET' ? new Response(null, { status: 204 }) : undefined;
  await f.client.openChat().chat.resumeStream();
  assert.equal(f.client.getSnapshot().observation.runState, 'queued');
  assert.equal(f.client.getSnapshot().observation.after, 0);
});

test('observation exposes only the admitted request text: the exact submitted input', async t => {
  const f = setup(t);
  await f.submit();
  assert.equal(f.client.getSnapshot().observation.prompt, 'Hello');
});

test('observation exposes the stored history request and keeps it while streaming', async t => {
  const f = setup(t);
  f.stored = { ...f.stored, prompt: 'Stored request' };
  await f.client.history({ limit: 1 });
  assert.equal(f.client.getSnapshot().observation.prompt, 'Stored request');
  await f.client.openChat().chat.resumeStream();
  assert.equal(f.client.getSnapshot().observation.after, 2);
  assert.equal(f.client.getSnapshot().observation.prompt, 'Stored request');
});
