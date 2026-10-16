import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, id, run, binding } from './conversation-fixture.mjs';

const setup = t => { const f = fixture(); t.after(f.close); return f; };
const submits = f => f.calls.filter(c => c.path.endsWith('/submit'));
const admissions = f => f.calls.filter(c => c.path.endsWith('/input/admit'));

test('synthetic positive durable input receipt precedes submit with identical closed bytes', async t => {
  const f = setup(t); await f.submit();
  assert.deepEqual(f.calls.map(c => c.path), ['/api/conversations/input/admit', '/api/conversations/submit']);
  assert.equal(admissions(f)[0].rawBody, submits(f)[0].rawBody);
  assert.equal(f.client.getSnapshot().observation.after, 0);
  assert.deepEqual(f.client.getSnapshot().observation.events, []);
  assert.equal(f.client.getSnapshot().submit, 'observed');
});

test('synthetic lost admission ACK retains one immutable identity and never submits before positive replay', async t => {
  const f = setup(t); let lost = true;
  f.override = c => { if (c.path.endsWith('/input/admit') && lost) { lost = false; throw Error('Lost synthetic admission ACK'); } };
  const input = { requestId: id(6), prompt: 'Original' };
  await assert.rejects(f.client.submit(input)); input.prompt = 'Changed';
  assert.equal(f.client.getSnapshot().submit, 'unknown'); assert.equal(submits(f).length, 0);
  await assert.rejects(f.client.submit(input));
  await f.client.retrySubmit();
  assert.equal(admissions(f).length, 2); assert.equal(submits(f).length, 1);
  assert.equal(admissions(f)[0].rawBody, admissions(f)[1].rawBody);
  assert.equal(admissions(f)[1].rawBody, submits(f)[0].rawBody);
});

for (const [name, change] of [
  ['binding', value => { value.run.binding.runId = id(88); }],
  ['request', value => { value.request.prompt = 'Substituted'; }],
  ['client', value => { value.run.scopes[0].resourceId = id(88); }],
]) test(`synthetic admitted ${name} substitution refuses submit before observation publication`, async t => {
  const f = setup(t);
  f.override = c => {
    if (!c.path.endsWith('/input/admit')) return;
    const receipt = structuredClone({ run, request: f.stored, lastSequence: 2, replayed: false });
    change(receipt); return Response.json(receipt);
  };
  await assert.rejects(f.submit());
  assert.equal(submits(f).length, 0); assert.equal(f.client.getSnapshot().observation, null);
});

test('synthetic receipt and submit ACK preserve the actual already loaded event prefix and reconnect cursor', async t => {
  const f = fixture({ count: 200 }); t.after(f.close);
  await f.client.history({ after: 40, limit: 20 });
  const before = f.client.getSnapshot().observation;
  await f.submit();
  assert.equal(f.client.getSnapshot().observation, before);
  assert.equal(before.after, 60);
  assert.deepEqual(before.events.map(e => e.sequence), Array.from({ length: 20 }, (_, n) => n + 41));
  await f.client.openChat().chat.resumeStream();
  assert.equal(f.calls.at(-1).headers['x-meri-resume-sequence'], '60');
  assert.equal(f.client.getSnapshot().observation.after, 200);
});

test('synthetic lost submit ACK replay preserves original requested relative window and skill, not caller mutation', async t => {
  const f = setup(t); let lost = true;
  f.stored.window = { basis: 'calendar-month', startInclusive: '2026-10-01T00:00:00Z', endExclusive: '2026-11-01T00:00:00Z', timezone: 'UTC', weekStartsOn: null };
  f.stored.skill = { skillId: 'quick_skill.research_company', skillVersion: '1.0.0', manifestSha256: 'a'.repeat(64), proseSha256: 'b'.repeat(64), catalogSha256: 'e'.repeat(64) };
  f.override = c => { if (c.path.endsWith('/submit') && lost) { lost = false; throw Error('Lost synthetic start ACK'); } };
  const input = { requestId: id(6), prompt: 'Original', windowRequest: { basis: 'calendar-month', offset: 0, timezone: 'UTC' }, skill: { skillId: 'quick_skill.research_company', skillVersion: '1.0.0' } };
  await assert.rejects(f.client.submit(input));
  input.windowRequest.timezone = 'America/New_York'; input.skill.skillVersion = '2.0.0';
  await f.client.retrySubmit();
  assert.equal(submits(f).length, 2);
  assert.ok(f.calls.every(c => c.rawBody === f.calls[0].rawBody));
  assert.equal(submits(f)[1].body.windowRequest.timezone, 'UTC');
  assert.deepEqual(submits(f)[1].body.skill, { skillId: 'quick_skill.research_company', skillVersion: '1.0.0' });
});

test('synthetic foreign receipt or missing positive input does not reinterpret unknown as a fresh request', async t => {
  const f = setup(t);
  f.override = () => Response.json({ error: { code: 'CONVERSATION_NOT_FOUND' } }, { status: 404 });
  await assert.rejects(f.submit()); await assert.rejects(f.client.retrySubmit());
  assert.equal(submits(f).length, 0);
  assert.equal(f.client.getSnapshot().submit, 'unknown');
  assert.ok(admissions(f).every(c => c.body.requestId === id(6)));
  assert.equal(binding.runId, run.binding.runId);
});
