import test from 'node:test';
import assert from 'node:assert/strict';
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { fixture, event, stream, part, id, binding, run } from './conversation-fixture.mjs';

const originalFetch = globalThis.fetch;
globalThis.fetch = () => { throw Error('Supplemental qualification forbids external network'); };
test.after(() => { globalThis.fetch = originalFetch; });
const setup = (t, options) => { const f = fixture(options); t.after(f.close); return f; };
const deferred = () => Promise.withResolvers();
const noDurableCancel = f => assert.equal(f.calls.filter(c => c.path.endsWith('/cancel')).length, 0);

function observed(f, after) {
  if (f.client.getSnapshot().observation?.after === after) return Promise.resolve();
  const ready = deferred();
  const unsubscribe = f.client.subscribe(() => {
    if (f.client.getSnapshot().observation?.after === after) { unsubscribe(); ready.resolve(); }
  });
  return ready.promise;
}

function heldStream(t) {
  const gate = deferred(); t.after(() => gate.resolve());
  const response = createUIMessageStreamResponse({ stream: createUIMessageStream({
    async execute({ writer }) {
      writer.write({ type: 'start', messageId: id(9999) });
      writer.write(part(event(1)));
      await gate.promise;
      writer.write(part(event(2)));
      writer.write({ type: 'finish' });
    },
  }) });
  return { response, release: () => gate.resolve() };
}

function historyPage(f, after = 0, limit = 100) {
  const events = f.events.filter(e => e.sequence > after).slice(0, limit);
  const nextSequence = after + events.length;
  return { run, request: f.stored, events, nextSequence, hasMore: nextSequence < f.events.length, lastSequence: f.events.length };
}

for (const stop of ['stop', 'dispose']) test(`held actual Chat ${stop} ends observation without durable cancellation`, { timeout: 5000 }, async t => {
  const f = setup(t); await f.submit();
  const held = heldStream(t);
  f.override = c => c.path.endsWith('/events') ? held.response : undefined;
  const handle = f.client.openChat(); const first = observed(f, 1);
  const pending = handle.chat.sendMessage({ text: 'observe only' });
  await first;
  const oldCall = f.calls.at(-1);
  if (stop === 'stop') await handle.chat.stop(); else await handle.chat.dispose();
  await pending; held.release();
  assert.equal(oldCall.signal.aborted, true);
  assert.equal(f.client.getSnapshot().observation.after, 1);
  assert.equal(f.client.getSnapshot().observation.runState, 'running');
  noDurableCancel(f);
  f.override = c => c.method === 'GET' ? stream([event(2)]) : undefined;
  await f.client.openChat().chat.resumeStream();
  assert.equal(f.calls.at(-1).headers['x-meri-resume-sequence'], '1');
  assert.equal(f.client.getSnapshot().observation.after, 2);
  assert.equal(f.calls.filter(c => c.path.endsWith('/submit')).length, 1);
});

test('history loading retires a held stream and hides its observation until the admitted read completes', { timeout: 5000 }, async t => {
  const f = setup(t); await f.submit();
  const held = heldStream(t), history = deferred(), entered = deferred();
  f.override = c => {
    if (c.path.endsWith('/events')) return held.response;
    if (c.path.endsWith('/history')) { entered.resolve(); return history.promise; }
  };
  const handle = f.client.openChat(), first = observed(f, 1);
  const streaming = handle.chat.sendMessage({ text: 'observe' }); await first;
  const reading = f.client.history(); await entered.promise;
  assert.equal(f.client.getSnapshot().status, 'loading');
  assert.equal(f.client.getSnapshot().observation, null);
  assert.equal(handle.transport.isClosed, true);
  assert.throws(() => f.client.openChat());
  held.release(); await streaming;
  assert.equal(f.client.getSnapshot().observation, null);
  history.resolve(Response.json(historyPage(f))); await reading;
  assert.equal(f.client.getSnapshot().status, 'ready');
  assert.equal(f.client.getSnapshot().observation.after, 2);
  assert.notEqual(f.client.openChat(), handle);
  noDurableCancel(f);
});

test('current-context loss hides a held stream, rejects its next event and permits only explicit recovery', { timeout: 5000 }, async t => {
  const f = setup(t); await f.submit(); const held = heldStream(t);
  f.override = c => c.path.endsWith('/events') ? held.response : undefined;
  const { chat } = f.client.openChat(), first = observed(f, 1);
  const pending = chat.sendMessage({ text: 'observe' }); await first;
  f.current = false;
  assert.equal(f.client.getSnapshot().status, 'unavailable');
  assert.equal(f.client.getSnapshot().observation, null);
  const calls = f.calls.length; assert.throws(() => f.client.openChat());
  held.release(); await pending;
  assert.equal(chat.status, 'error'); assert.equal(f.calls.length, calls);
  f.current = true; f.override = undefined;
  await f.client.history({ after: 0, limit: 2 });
  assert.equal(f.client.getSnapshot().observation.after, 2);
  noDurableCancel(f);
});

test('expiry during a held stream clears observation and refuses recovery without another session', { timeout: 5000 }, async t => {
  const f = setup(t); await f.submit(); const held = heldStream(t);
  f.override = c => c.path.endsWith('/events') ? held.response : undefined;
  const { chat } = f.client.openChat(), first = observed(f, 1);
  const pending = chat.sendMessage({ text: 'observe' }); await first;
  f.now += 60_000;
  assert.equal(f.client.getSnapshot().status, 'disposed');
  assert.equal(f.client.getSnapshot().observation, null);
  held.release(); await pending;
  const calls = f.calls.length;
  await assert.rejects(f.client.history()); assert.throws(() => f.client.openChat());
  assert.equal(f.calls.length, calls); assert.equal(f.accessLost, 1);
  noDurableCancel(f);
});

for (const [name, corrupt] of [
  ['tip substituted for nextSequence', page => { page.nextSequence = page.lastSequence; }],
  ['false complete-page marker', page => { page.hasMore = false; }],
  ['short page claiming further data', page => { page.events.pop(); page.nextSequence--; }],
  ['noncontiguous page sequence', page => { page.events[1] = event(99); }],
]) test(`malformed partial history ${name} stays hidden until a valid admitted recovery`, async t => {
  const f = setup(t, { count: 200 }); await f.submit(); await f.client.history({ after: 40, limit: 20 });
  assert.equal(f.client.getSnapshot().observation.after, 60);
  f.override = c => {
    if (!c.path.endsWith('/history')) return;
    const page = structuredClone(historyPage(f, 40, 20)); corrupt(page); return Response.json(page);
  };
  await assert.rejects(f.client.history({ after: 40, limit: 20 }));
  assert.equal(f.client.getSnapshot().status, 'unavailable');
  assert.equal(f.client.getSnapshot().observation, null); assert.throws(() => f.client.openChat());
  f.override = undefined; await f.client.history({ after: 40, limit: 20 });
  assert.equal(f.client.getSnapshot().observation.after, 60);
  assert.equal(f.client.getSnapshot().observation.hasMore, true);
  assert.equal(f.client.getSnapshot().observation.omittedPrefix, true);
  noDurableCancel(f);
});

for (const [name, corrupt] of [
  ['prompt', saved => { saved.prompt = 'Different immutable prompt'; }],
  ['requested window', saved => { saved.windowRequest.timezone = 'America/New_York'; saved.window.timezone = 'America/New_York'; }],
  ['normalized window', saved => { saved.window.startInclusive = '2026-09-01T00:00:00Z'; }],
  ['skill version', saved => { saved.skill.skillVersion = '2.0.0'; }],
  ['skill manifest hash', saved => { saved.skill.manifestSha256 = 'c'.repeat(64); }],
  ['skill prose hash', saved => { saved.skill.proseSha256 = 'd'.repeat(64); }],
]) test(`admitted stored ${name} cannot change on a subsequent history read`, async t => {
  const f = setup(t);
  f.stored = { ...f.stored,
    windowRequest: { basis: 'calendar-month', offset: 0, timezone: 'UTC' },
    window: { basis: 'calendar-month', startInclusive: '2026-10-01T00:00:00Z', endExclusive: '2026-11-01T00:00:00Z', timezone: 'UTC', weekStartsOn: null },
    skill: { skillId: 'quick_skill.research_company', skillVersion: '1.0.0', manifestSha256: 'a'.repeat(64), proseSha256: 'b'.repeat(64), catalogSha256: 'e'.repeat(64) },
  };
  // History-first reopening has no local submit intent; immutable receiving binds the stored record.
  await f.client.history(); assert.equal(f.client.getSnapshot().observation.after, 2);
  const original = structuredClone(f.stored); corrupt(f.stored);
  await assert.rejects(f.client.history(), error => error.code === 'REQUEST_MISMATCH');
  assert.equal(f.client.getSnapshot().observation, null);
  assert.equal(f.client.getSnapshot().status, 'unavailable');
  f.stored = original; await f.client.history();
  assert.equal(f.client.getSnapshot().status, 'ready');
  assert.equal(f.calls.filter(c => c.path.endsWith('/submit')).length, 0);
});

for (const media of ['application/json', 'text/plain', 'text/event-stream; charset=iso-8859-1']) {
  test(`subscription media ${media} is cancelled without consuming a cursor, then GET can recover`, async t => {
    const f = setup(t); await f.submit(); let cancelled = 0;
    f.override = c => c.path.endsWith('/events') ? new Response(new ReadableStream({ cancel() { cancelled++; } }), { headers: { 'content-type': media } }) : undefined;
    const { chat } = f.client.openChat(); await chat.sendMessage({ text: 'observe' });
    assert.equal(chat.status, 'error'); assert.equal(cancelled, 1);
    assert.equal(f.client.getSnapshot().observation.after, 0);
    f.override = undefined; await chat.resumeStream();
    assert.equal(f.calls.at(-1).headers['x-meri-resume-sequence'], '0');
    assert.equal(f.client.getSnapshot().observation.after, 2);
  });
}

test('unfinished UTF8 at original wire EOF fails before any event admission', async t => {
  const f = setup(t); await f.submit();
  f.override = c => c.path.endsWith('/events') ? new Response(new Uint8Array([0xe2, 0x82]), { headers: { 'content-type': 'text/event-stream' } }) : undefined;
  const { chat } = f.client.openChat(); await chat.sendMessage({ text: 'observe' });
  assert.equal(chat.status, 'error'); assert.equal(f.client.getSnapshot().observation.after, 0);
  f.override = undefined; await chat.resumeStream();
  assert.equal(f.client.getSnapshot().observation.after, 2);
});

test('request deadline ends a held observation while keeping its last admitted cursor recoverable', { timeout: 5000 }, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = setup(t); await f.submit(); const held = heldStream(t);
  f.override = c => c.path.endsWith('/events') ? held.response : undefined;
  const { chat } = f.client.openChat(), first = observed(f, 1);
  const pending = chat.sendMessage({ text: 'observe' }); await first;
  t.mock.timers.tick(30_000); await pending; held.release();
  assert.equal(chat.status, 'error'); assert.equal(f.client.getSnapshot().observation.after, 1);
  assert.equal(f.accessLost, 0); noDurableCancel(f);
  f.override = undefined; await chat.resumeStream();
  assert.equal(f.calls.at(-1).headers['x-meri-resume-sequence'], '1');
  assert.equal(f.client.getSnapshot().observation.after, 2);
});

test('public10000 identity bound requires a fresh admitted history checkpoint before GET recovery', { timeout: 15000 }, async t => {
  const f = setup(t, { count: 10_002 }); await f.submit();
  const { chat } = f.client.openChat(); await chat.sendMessage({ text: 'observe' });
  assert.equal(chat.status, 'error');
  assert.equal(chat.error?.code, 'CURSOR_CHECKPOINT_REQUIRED');
  assert.equal(f.client.getSnapshot().observation.after, 10_000);
  assert.equal(f.client.getSnapshot().observation.events.length, 1000);
  assert.equal(f.client.getSnapshot().observation.events[0].sequence, 9001);
  assert.equal(f.client.getSnapshot().observation.omittedPrefix, true);
  // A new server-admitted page, not an injected/forged cursor, resets identity accounting.
  await f.client.history({ after: 9900, limit: 100 });
  assert.equal(f.client.getSnapshot().observation.after, 10_000);
  assert.equal(f.client.getSnapshot().observation.events.length, 100);
  assert.equal(f.client.getSnapshot().observation.hasMore, true);
  const fresh = f.client.openChat(); assert.notEqual(fresh.chat, chat);
  await fresh.chat.resumeStream();
  const call = f.calls.at(-1);
  assert.equal(call.method, 'GET'); assert.equal(call.path, `/api/conversations/events/${binding.conversationId}/stream`);
  assert.equal(call.headers['x-meri-resume-sequence'], '10000');
  assert.equal(call.headers['last-event-id'], undefined); assert.equal(call.body, undefined);
  assert.equal(fresh.chat.status, 'ready');
  assert.equal(f.client.getSnapshot().observation.after, 10_002);
  assert.equal(f.client.getSnapshot().observation.events.length, 102);
  assert.equal(f.client.getSnapshot().observation.hasMore, false);
  assert.equal(f.calls.filter(c => c.path.endsWith('/submit')).length, 1); noDurableCancel(f);
});
