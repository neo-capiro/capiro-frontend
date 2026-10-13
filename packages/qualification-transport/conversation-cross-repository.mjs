// Explicit offline qualification input, never a production/private-source dependency.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createMeriConversation } from '@capiro/meri-client/conversation';

const source = process.env.MERI_CONVERSATION_QUALIFICATION_SOURCE;
if (!source) throw Error('Exact backend qualification source is required');
const { applicationFixture, binding, id } = await import(pathToFileURL(`${source}/apps/control/conversations/test/application-fixture.mjs`));
const originalFetch = globalThis.fetch;
globalThis.fetch = () => { throw Error('External network is forbidden'); };
test.after(() => { globalThis.fetch = originalFetch; });

async function fixture(t) {
  const f = await applicationFixture();
  const calls = [], lifetime = new AbortController();
  let accessLost = 0;
  const client = createMeriConversation({
    context: { tenantId: binding.tenantId, actorId: binding.actorId, conversationId: binding.conversationId, runId: binding.runId, selectedClientId: id(5) },
    credential: f.credential, expiresAtMs: Date.now() + 30_000, signal: lifetime.signal,
    isCurrent: () => true, onAccessLost: () => { accessLost++; }, origin: 'https://meri.invalid',
    fetchImpl: async (url, init) => {
      const request = new Request(url, init);
      calls.push({ method: request.method, path: new URL(request.url).pathname, headers: Object.fromEntries(request.headers), body: init.body });
      const response = await f.app.handle(request);
      if (f.loseSubmit && new URL(request.url).pathname.endsWith('/submit')) {
        f.loseSubmit = false; await response.body?.cancel(); throw Error('Synthetic lost acknowledgement');
      }
      return response;
    },
  });
  t.after(() => { client.dispose(); f.close(); });
  return { ...f, calls, client, lifetime, accessLost: () => accessLost, loseNextSubmit: () => { f.loseSubmit = true; } };
}

test('frontend submit, real producer POST, explicit cancel and public receiver compose without a provider', async t => {
  const f = await fixture(t);
  await f.client.submit(f.input);
  assert.equal(f.state.starts, 1); assert.equal(f.client.getSnapshot().observation.after, 0);
  assert.deepEqual(await f.client.cancel(), { state: 'cancelled' });
  await f.client.openChat().chat.sendMessage({ text: 'observation only' }, { body: { prompt: 'never submitted', after: 9 } });
  const snapshot = f.client.getSnapshot();
  assert.equal(snapshot.observation.after, 2); assert.equal(snapshot.observation.runState, 'cancelled');
  assert.equal(f.state.starts, 1); assert.equal(f.state.cancels, 1);
  assert.deepEqual(JSON.parse(f.calls.at(-1).body), { command: { conversationId: binding.conversationId, intent: 'view.subscribe' } });
  assert.equal(JSON.stringify(snapshot).includes(f.credential), false);
});

test('native partial page40/20 acknowledges60 and actual SDK GET consumes through200', async t => {
  const f = await fixture(t); await f.client.submit(f.input);
  const append = (n, type, data) => f.runOwner.append({ binding, event: { eventId: id(1000 + n), createdAt: '2026-10-13T00:00:00Z', type, data } });
  await append(2, 'run.status', { state: 'starting', reasonCode: null });
  await append(3, 'run.status', { state: 'running', reasonCode: null });
  for (let n = 4; n < 200; n++) await append(n, 'message.delta', { messageId: id(900), text: `part${n}` });
  await append(200, 'run.status', { state: 'completed', reasonCode: null });
  await f.client.history({ after: 40, limit: 20 });
  assert.equal(f.client.getSnapshot().observation.after, 60);
  assert.equal(f.client.getSnapshot().observation.omittedPrefix, true);
  assert.equal(f.client.getSnapshot().observation.hasMore, true);
  const { chat } = f.client.openChat(); await chat.resumeStream();
  assert.equal(chat.status, 'ready');
  const request = f.calls.at(-1);
  assert.equal(request.method, 'GET'); assert.equal(request.headers['x-meri-resume-sequence'], '60');
  assert.equal(request.headers['last-event-id'], undefined); assert.equal(request.body, undefined);
  assert.equal(f.client.getSnapshot().observation.after, 200);
  assert.equal(f.client.getSnapshot().observation.runState, 'completed');
  assert.equal(f.state.cancels, 0);
});

test('lost real submit acknowledgement retries exact intent with one persisted run', async t => {
  const f = await fixture(t); f.loseNextSubmit();
  await assert.rejects(f.client.submit(f.input));
  assert.equal(f.client.getSnapshot().submit, 'unknown');
  await f.client.retrySubmit();
  assert.equal(f.calls[0].body, f.calls[1].body);
  assert.equal(f.state.runs.size, 1);
  // Exact backend intentionally re-dispatches the same queued workflow on a retry.
  assert.equal(f.state.starts, 2);
  assert.equal(f.client.getSnapshot().submit, 'observed');
});

test('disposing an active real subscription leaves the durable queued run intact', async t => {
  const f = await fixture(t); await f.client.submit(f.input);
  const { chat } = f.client.openChat();
  const first = new Promise(resolve => { const unsubscribe = f.client.subscribe(() => {
    if (f.client.getSnapshot().observation?.after === 1) { unsubscribe(); resolve(); }
  }); });
  const pending = chat.sendMessage({ text: 'observe' });
  await first; f.client.dispose(); await pending;
  assert.equal(f.client.getSnapshot().status, 'disposed'); assert.equal(f.state.cancels, 0);
  assert.equal([...f.state.runs.values()][0].projection.state, 'queued');
});

for (const [name, mutate] of Object.entries({
  tenant: f => { f.state.context.binding.tenantId = 'foreign'; },
  actor: f => { f.state.context.binding.actorId = 'foreign'; },
  conversation: f => { f.state.context.binding.conversationId = id(90); },
  run: f => { f.state.context.binding.runId = id(90); },
  attempt: f => { f.state.context.binding.attemptId = id(90); },
  worker: f => { f.state.context.binding.workerId = id(90); },
  fence: f => { f.state.context.binding.writerFence = 2; },
  scope: f => { f.state.context.scopes[0].policyRevision = 'changed'; },
  revocation: f => { f.state.revoked = true; },
})) test(`real current ${name} refusal clears frontend content before a new GET`, async t => {
  const f = await fixture(t); await f.client.submit(f.input); await f.client.history();
  mutate(f); await f.client.openChat().chat.resumeStream();
  assert.equal(f.accessLost(), 1); assert.equal(f.client.getSnapshot().status, 'disposed');
  assert.equal(f.client.getSnapshot().observation, null); assert.equal(f.state.cancels, 0);
});
