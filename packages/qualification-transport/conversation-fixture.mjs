import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { meriEventStreamResponse } from '@capiro/meri-ui-stream';
import { createMeriConversation } from '@capiro/meri-client/conversation';

export const id = n => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;
export const binding = { tenantId: 'tenant-a', actorId: 'actor-a', conversationId: id(1), runId: id(2), attemptId: id(3), workerId: id(4), writerFence: 1 };
export const scopes = [{ tenantId: binding.tenantId, kind: 'client', resourceId: id(5), policyRevision: 'policy1' }];
export const run = { binding, state: 'queued', scopes, createdAt: '2026-10-13T00:00:00Z', policyRevision: 'policy1', versions: { imageDigest: `sha256:${'a'.repeat(64)}`, sdk: '0.3.295', cli: '2.1.295', contracts: '0.1.0', skillsDigest: 'b'.repeat(64), checkpointFormat: '0.1.0' } };
export const event = (sequence, change = {}) => ({ contractVersion: '0.1.0', eventId: id(100 + sequence), binding, sequence, createdAt: run.createdAt, scopes, type: 'run.status', data: { state: 'running', reasonCode: null }, ...change });
export const stream = events => meriEventStreamResponse({ messageId: id(9999), events });
export const chunks = items => createUIMessageStreamResponse({ stream: createUIMessageStream({ execute({ writer }) { for (const item of items) writer.write(item); } }) });
export const part = e => ({ type: 'data-meri-event', transient: true, id: e.eventId, data: e });
export async function drain(source) {
  const reader = source.getReader(); const items = [];
  try { for (;;) { const next = await reader.read(); if (next.done) return items; items.push(next.value); } }
  finally { reader.releaseLock(); }
}
export function fixture({ count = 2, ttlMs = 60_000 } = {}) {
  const lifetime = new AbortController();
  const f = { calls: [], events: Array.from({ length: count }, (_, i) => event(i + 1)), now: Date.now(), current: true, accessLost: 0, lifetime, stored: { requestId: id(6), prompt: 'Hello', windowRequest: null, window: null, skill: null } };
  f.fetchImpl = async (url, init) => {
    const path = new URL(url).pathname;
    const body = init.body ? JSON.parse(init.body) : undefined;
    const call = { path, method: init.method, body, rawBody: init.body, headers: Object.fromEntries(new Headers(init.headers)), signal: init.signal };
    f.calls.push(call);
    if (f.override) { const result = await f.override(call); if (result !== undefined) return result; }
    if (path.endsWith('/input/admit')) {
      f.stored = { ...f.stored, requestId: body.requestId, prompt: body.prompt, windowRequest: body.windowRequest ?? null };
      return Response.json({ run: structuredClone(run), request: f.stored, lastSequence: f.events.length, replayed: false });
    }
    if (path.endsWith('/submit')) {
      f.stored = { ...f.stored, requestId: body.requestId, prompt: body.prompt };
      return Response.json({ run: structuredClone(run), requestId: body.requestId, lastSequence: f.events.length, replayed: false });
    }
    if (path.endsWith('/history')) {
      const after = body.after ?? 0, limit = body.limit ?? 100;
      const events = f.events.filter(e => e.sequence > after).slice(0, limit);
      const nextSequence = after + events.length;
      return Response.json({ run, request: f.stored, events, nextSequence, hasMore: nextSequence < f.events.length, lastSequence: f.events.length });
    }
    if (path.endsWith('/cancel')) return Response.json({ state: 'cancelled' });
    if (path.endsWith('/events') || path.endsWith('/stream')) {
      const after = Number(new Headers(init.headers).get('x-meri-resume-sequence') ?? 0);
      return stream(f.events.filter(e => e.sequence > after));
    }
    throw Error('Unexpected fixed route');
  };
  f.client = createMeriConversation({
    context: { tenantId: binding.tenantId, actorId: binding.actorId, conversationId: binding.conversationId, runId: binding.runId, selectedClientId: id(5) },
    credential: `action_session_${'s'.repeat(43)}`, expiresAtMs: f.now + ttlMs, signal: lifetime.signal,
    isCurrent: () => f.current, onAccessLost: () => { f.accessLost++; }, now: () => f.now,
    origin: 'https://meri.invalid', fetchImpl: (...args) => f.fetchImpl(...args),
  });
  f.submit = () => f.client.submit({ requestId: id(6), prompt: 'Hello' });
  f.close = () => f.client.dispose();
  return f;
}
