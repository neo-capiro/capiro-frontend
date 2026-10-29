import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, event, stream, chunks, part, id, binding } from './conversation-fixture.mjs';

const source = () => event(2, {
  type: 'source.native-upload',
  data: {
    schemaVersion: 'meri.native-upload-source/1', deliveryId: id(20),
    operation: { id: 'read_upload_source', version: '0.2.0' },
    requestSha256: 'a'.repeat(64), argumentsSha256: 'b'.repeat(64),
    resultSha256: 'c'.repeat(64), executionSha256: 'd'.repeat(64), policyRevision: 'policy1',
    source: {
      authoritativeOwner: 'upload_custody', uploadId: id(21), sha256: 'e'.repeat(64),
      versionId: 'version-1', filename: 'synthetic.pdf', mimeType: 'application/pdf', bytes: 42,
      extractedSourceSha256: 'f'.repeat(64), extractionStatus: 'partial', limitations: ['OCR_PAGES_BELOW_CONFIDENCE'],
    },
    page: {
      number: 0, count: 2, sha256: 'a'.repeat(64), nextPage: 1, fragmentCount: 3,
      extractionStatus: 'partial', limitations: ['PAGE_TEXT_BELOW_CONFIDENCE'],
    },
  },
});

test('native upload events reach the SDK and remain available in completed history', async t => {
  const f = fixture(); t.after(f.close); await f.submit();
  const events = [event(1), source(), event(3, { data: { state: 'completed', reasonCode: null } })];
  f.override = call => call.path.endsWith('/events') ? stream(events) : undefined;
  const { chat } = f.client.openChat();
  await chat.sendMessage({ text: 'observe' });
  assert.equal(chat.status, 'ready');
  assert.deepEqual(f.client.getSnapshot().observation.events, events);
  assert.equal(f.client.getSnapshot().observation.after, 3);
  f.events = events;
  f.override = undefined;
  await f.client.history({ after: 0 });
  assert.deepEqual(f.client.getSnapshot().observation.events, events);
});

for (const [name, invalid] of [
  ['foreign run', () => part({ ...source(), binding: { ...binding, runId: id(80) } })],
  ['invalid upload hash', () => part({ ...source(), data: { ...source().data, source: { ...source().data.source, sha256: 'invalid' } } })],
  ['mismatched frame ID', () => ({ ...part(source()), id: id(90) })],
]) test(`native upload ${name} is refused without consuming the cursor`, async t => {
  const f = fixture(); t.after(f.close); await f.submit();
  f.override = call => call.path.endsWith('/events') ? chunks([part(event(1)), invalid()])
    : call.method === 'GET' ? stream([source()]) : undefined;
  const { chat } = f.client.openChat();
  await chat.sendMessage({ text: 'observe' });
  assert.equal(chat.status, 'error');
  assert.equal(f.client.getSnapshot().observation.after, 1);
  assert.deepEqual(f.client.getSnapshot().observation.events, [event(1)]);
  await chat.resumeStream();
  assert.equal(chat.status, 'ready');
  assert.equal(f.calls.at(-1).headers['x-meri-resume-sequence'], '1');
  assert.deepEqual(f.client.getSnapshot().observation.events, [event(1), source()]);
});
