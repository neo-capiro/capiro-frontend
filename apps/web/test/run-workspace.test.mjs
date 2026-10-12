import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUIEvent } from '@capiro/meri-contracts/browser';
import { buildWorkspaceView, listRunAttempts, runStateLabels } from '../src/features/meri/workspace/workspace-view.ts';
import { projectSampleEvents, runActivityEvents } from '../src/features/meri/fixtures/run-activity-events.ts';

const primary = { runId: '10000000-0000-4000-8000-000000000010', attemptId: '10000000-0000-4000-8000-000000000020' };
const viewOf = (events, selection = primary) => buildWorkspaceView(projectSampleEvents(events).accepted, selection);

test('all eight canonical run states display explicit labels without inferred completion', () => {
  assert.deepEqual(Object.keys(runStateLabels).sort(), ['cancelled', 'completed', 'failed', 'paused', 'queued', 'running', 'starting', 'waiting-for-approval']);
  for (const state of Object.keys(runStateLabels)) assert.equal(viewOf(runActivityEvents(state)).state, state);
  const projection = projectSampleEvents(runActivityEvents('running'));
  projection.setStreamOutcome('completed');
  assert.equal(buildWorkspaceView(projection.accepted, primary).state, 'running');
  assert.equal(projection.isRunCompleted(), false);
});

test('fixture events all validate with the public browser contract; unknown scenarios fail', () => {
  for (const scenario of ['activity', 'isolation', ...Object.keys(runStateLabels)]) for (const event of runActivityEvents(scenario)) assert.equal(validateUIEvent(event), true);
  assert.throws(() => runActivityEvents('invented-state'), /Unknown synthetic run scenario/);
  const invalid = { ...runActivityEvents('running')[0], contractVersion: '9.9.9' };
  assert.throws(() => projectSampleEvents([invalid]), /public0.1 browser validator/);
});

test('selected run and attempt isolate colliding message and tool request IDs', () => {
  const projection = projectSampleEvents(runActivityEvents('isolation'));
  assert.deepEqual(listRunAttempts(projection.accepted), [primary, { runId: '10000000-0000-4000-8000-000000000011', attemptId: '10000000-0000-4000-8000-000000000020' }, { runId: '10000000-0000-4000-8000-000000000010', attemptId: '10000000-0000-4000-8000-000000000021' }]);
  const first = buildWorkspaceView(projection.accepted, primary);
  assert.equal(first.state, 'running'); assert.equal(first.messages[0].text, 'Primary sample response.');
  assert.deepEqual(first.tools, [{ requestId: '10000000-0000-4000-8000-000000000040', name: 'sample.primary', resultReference: null }]);
  const other = buildWorkspaceView(projection.accepted, { runId: '10000000-0000-4000-8000-000000000011', attemptId: '10000000-0000-4000-8000-000000000020' });
  assert.equal(other.state, 'completed'); assert.equal(other.messages[0].text, 'Other run response.'); assert.equal(other.tools[0].name, null);
  const second = buildWorkspaceView(projection.accepted, { runId: '10000000-0000-4000-8000-000000000010', attemptId: '10000000-0000-4000-8000-000000000021' });
  assert.equal(second.state, 'paused'); assert.equal(second.messages[0].text, 'Second attempt response.'); assert.equal(second.tools[0].resultReference, '10000000-0000-4000-8000-000000000052');
});

test('message fragments concatenate in accepted order; sparse references stay exact', () => {
  const view = viewOf(runActivityEvents('activity'));
  assert.equal(view.messages[0].text, 'Preparing the sample response. References have no connected source contents.');
  assert.equal(view.sources[0].sourceVersionId, 'source-version-2'); assert.equal(view.sources[0].sourceUpdatedAt, null);
  assert.deepEqual(view.artifacts, [{ artifactId: '10000000-0000-4000-8000-000000000070', versionId: '10000000-0000-4000-8000-000000000071' }]);
  assert.deepEqual(view.checkpointIds, ['10000000-0000-4000-8000-000000000080']); assert.deepEqual(view.usageIds, ['10000000-0000-4000-8000-000000000090']);
  assert.equal(view.approvals[0].commandSha256, 'b'.repeat(64));
});

test('unmatched completion never invents a tool name, arguments or business success', () => {
  const view = viewOf(runActivityEvents('activity'));
  assert.deepEqual(view.tools.find(tool => tool.requestId === '10000000-0000-4000-8000-000000000042'), { requestId: '10000000-0000-4000-8000-000000000042', name: null, resultReference: '10000000-0000-4000-8000-000000000053' });
  for (const tool of view.tools) assert.deepEqual(Object.keys(tool).sort(), ['name', 'requestId', 'resultReference']);
  const last = runActivityEvents('activity').find(event => event.type === 'tool.completed');
  assert.equal(buildWorkspaceView([last], primary).state, null);
});

test('canonical safe error rendering never exposes raw text or prototype-looking codes', () => {
  const samples = runActivityEvents('failed');
  assert.equal(viewOf(samples).errors[0].message, 'The assistant service is temporarily unavailable.');
  const unknown = { ...samples[1], data: { code: '__proto__', retryable: false, message: '<script>PRIVATE_RAW_EXCEPTION_MUST_NOT_RENDER</script>' } };
  const view = viewOf([samples[0], unknown]);
  assert.equal(view.errors[0].message, 'The run stopped because of an error.');
  assert.ok(!JSON.stringify(view).includes('PRIVATE_RAW_EXCEPTION'));
});

test('canonical projection owns replay and sequence repair before presentation', () => {
  const samples = runActivityEvents('activity').slice(0, 6), projection = projectSampleEvents([samples[0], samples[2]]);
  assert.equal(projection.currentCursor, 1); assert.deepEqual(projection.pendingSequences, [3]);
  assert.equal(buildWorkspaceView(projection.accepted, primary).state, 'queued');
  projection.accept(samples[1]); assert.equal(projection.currentCursor, 3);
  for (const event of samples.slice(3)) projection.accept(event);
  const before = buildWorkspaceView(projection.accepted, primary);
  assert.equal(projection.accept(samples[5]).status, 'duplicate');
  assert.deepEqual(buildWorkspaceView(projection.accepted, primary), before);
});

test('fixture canonical admission rejects cross-view and immutable-event conflicts', () => {
  const sample = runActivityEvents('running')[0];
  const outOfView = { ...sample, binding: { ...sample.binding, actorId: 'another-actor' } };
  assert.throws(() => projectSampleEvents([outOfView]), /out-of-scope/);
  const conflict = { ...sample, data: { ...sample.data, state: 'completed' } };
  assert.throws(() => projectSampleEvents([sample, conflict]), /conflict/);
});

test('presentation does not mutate accepted events or include unsupported metadata', () => {
  const projection = projectSampleEvents(runActivityEvents('activity')), before = JSON.stringify(projection.accepted);
  const view = buildWorkspaceView(projection.accepted, primary);
  view.tools[0].name = 'display-only edit';
  assert.equal(JSON.stringify(projection.accepted), before);
  assert.ok(!['plan', 'specialists', 'coverage', 'cost', 'files', 'downloadUrl'].some(key => key in view));
  assert.equal(buildWorkspaceView(projection.accepted, { runId: 'missing-run', attemptId: 'missing-attempt' }).messages.length, 0);
});
