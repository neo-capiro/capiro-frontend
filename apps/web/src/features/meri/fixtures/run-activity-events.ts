import type { UIEvent } from '@capiro/meri-contracts';
import { validateUIEvent } from '@capiro/meri-contracts/browser';
import { ConversationProjection, acceptOrReject } from '@capiro/meri-client/projection';

export const fixtureView = Object.freeze({ tenantId: 'tenant-sample', actorId: 'actor-sample', conversationId: '10000000-0000-4000-8000-000000000001' });
const scope = Object.freeze({ tenantId: fixtureView.tenantId, kind: 'client' as const, resourceId: 'client-sample', policyRevision: 'policy-sample' });
function event<T extends UIEvent['type']>(sequence: number, type: T, data: Extract<UIEvent, { type: T }>['data'], runId = '10000000-0000-4000-8000-000000000010', attemptId = '10000000-0000-4000-8000-000000000020'): UIEvent {
  const sample = { contractVersion: '0.1.0', eventId: `20000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`, sequence, createdAt: new Date(Date.UTC(2026, 9, 12, 0, 0, sequence)).toISOString(), binding: { ...fixtureView, runId, attemptId, workerId: '10000000-0000-4000-8000-000000000002', writerFence: 1 }, scopes: [scope], type, data };
  if (!validateUIEvent(sample)) throw new Error('Unknown synthetic run scenario or invalid event data');
  return sample;
}

/** Samples only. Sparse public events contain no plan, coverage, prices or files. */
export function runActivityEvents(scenario: string): readonly UIEvent[] {
  if (scenario === 'isolation') return [
    event(1, 'run.status', { state: 'running', reasonCode: null }),
    event(2, 'tool.started', { requestId: '10000000-0000-4000-8000-000000000040', tool: 'sample.primary' }),
    event(3, 'message.delta', { messageId: '10000000-0000-4000-8000-000000000030', text: 'Primary sample response.' }),
    event(4, 'run.status', { state: 'completed', reasonCode: null }, '10000000-0000-4000-8000-000000000011'),
    event(5, 'tool.completed', { requestId: '10000000-0000-4000-8000-000000000040', resultReference: '10000000-0000-4000-8000-000000000051' }, '10000000-0000-4000-8000-000000000011'),
    event(6, 'message.delta', { messageId: '10000000-0000-4000-8000-000000000030', text: 'Other run response.' }, '10000000-0000-4000-8000-000000000011'),
    event(7, 'run.status', { state: 'paused', reasonCode: null }, '10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000021'),
    event(8, 'tool.completed', { requestId: '10000000-0000-4000-8000-000000000040', resultReference: '10000000-0000-4000-8000-000000000052' }, '10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000021'),
    event(9, 'message.delta', { messageId: '10000000-0000-4000-8000-000000000030', text: 'Second attempt response.' }, '10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000021'),
  ];
  if (scenario !== 'activity') {
    const state = scenario as Extract<UIEvent, { type: 'run.status' }>['data']['state'];
    const status = event(1, 'run.status', { state, reasonCode: state === 'failed' ? 'provider_unavailable' : null });
    if (!validateUIEvent(status)) throw new Error('Unknown synthetic run scenario');
    return [status, ...(state === 'failed' ? [event(2, 'run.error', { code: 'provider_unavailable', retryable: true, message: 'PRIVATE_RAW_EXCEPTION_MUST_NOT_RENDER' })] : [])];
  }
  const referenceEvents: UIEvent[] = [
    event(1, 'run.status', { state: 'queued', reasonCode: null }),
    event(2, 'run.status', { state: 'starting', reasonCode: null }),
    event(3, 'run.status', { state: 'running', reasonCode: null }),
    event(4, 'message.delta', { messageId: '10000000-0000-4000-8000-000000000031', text: 'Preparing the sample response. ' }),
    event(5, 'tool.started', { requestId: '10000000-0000-4000-8000-000000000041', tool: 'sample.source_read' }),
    event(6, 'message.delta', { messageId: '10000000-0000-4000-8000-000000000031', text: 'References have no connected source contents.' }),
    event(7, 'source.available', { sourceId: 'source-sample', recordId: 'record-sample', sourceVersionId: 'source-version-2', observedAt: '2026-10-12T00:00:07Z', sourceUpdatedAt: null, citationId: '10000000-0000-4000-8000-000000000100', scopes: [scope], contentSha256: 'a'.repeat(64), authorizationDecisionId: '10000000-0000-4000-8000-000000000101' }),
    event(8, 'approval.required', { proposalId: '10000000-0000-4000-8000-000000000060', commandSha256: 'b'.repeat(64), expiresAt: '2026-10-12T00:10:00Z' }),
    event(9, 'artifact.available', { artifactId: '10000000-0000-4000-8000-000000000070', versionId: '10000000-0000-4000-8000-000000000071' }),
    event(10, 'checkpoint.verified', { checkpointId: '10000000-0000-4000-8000-000000000080' }),
    event(11, 'usage.recorded', { usageId: '10000000-0000-4000-8000-000000000090' }),
    event(12, 'tool.completed', { requestId: '10000000-0000-4000-8000-000000000041', resultReference: '10000000-0000-4000-8000-000000000050' }),
    event(13, 'tool.completed', { requestId: '10000000-0000-4000-8000-000000000042', resultReference: '10000000-0000-4000-8000-000000000053' }),
  ];
  for (let index = 0; index < 12; index++) referenceEvents.push(event(14 + index, 'message.delta', { messageId: `10000000-0000-4000-8000-${String(300 + index).padStart(12, '0')}`, text: index === 0 ? 'Literal <script>window.FIXTURE_SCRIPT_EXECUTED=true</script> remains plain sample text.' : `Sample note ${index + 1}. This is synthetic response text for keyboard and scroll inspection. No source evidence or live answer is connected.` }));
  referenceEvents.push(event(26, 'run.status', { state: 'completed', reasonCode: null }));
  return referenceEvents;
}

/** Canonical public validation/admission, not a replacement parser or reducer. */
export function projectSampleEvents(events: readonly UIEvent[]): ConversationProjection {
  const projection = new ConversationProjection(fixtureView);
  for (const sample of events) {
    if (!validateUIEvent(sample)) throw new Error('Synthetic event failed the public0.1 browser validator');
    acceptOrReject(projection, sample);
  }
  return projection;
}
