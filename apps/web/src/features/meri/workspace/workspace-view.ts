import type { UIEvent, SourceEvidence } from '@capiro/meri-contracts';
import { renderRunError } from '@capiro/meri-client/projection';

type RunState = Extract<UIEvent, { type: 'run.status' }>['data']['state'];
export const runStateLabels: Readonly<Record<RunState, string>> = Object.freeze({ queued: 'Queued', starting: 'Starting', running: 'Running', 'waiting-for-approval': 'Waiting for approval', paused: 'Paused', completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled' });
export type RunSelection = Readonly<Pick<UIEvent['binding'], 'runId' | 'attemptId'>>;
type ToolActivity = { requestId: string; name: string | null; resultReference: string | null };
export type WorkspaceView = {
  selection: RunSelection; state: RunState | null; reasonCode: string | null;
  messages: readonly { messageId: string; text: string }[]; tools: readonly ToolActivity[];
  sources: readonly SourceEvidence[];
  approvals: readonly Extract<UIEvent, { type: 'approval.required' }>['data'][];
  artifacts: readonly Extract<UIEvent, { type: 'artifact.available' }>['data'][];
  checkpointIds: readonly string[]; usageIds: readonly string[];
  errors: readonly ReturnType<typeof renderRunError>[];
};

/** Presentation choices from already-accepted events; never admission or authority. */
export function listRunAttempts(events: readonly UIEvent[]): readonly RunSelection[] {
  const selections = new Map<string, RunSelection>();
  for (const { binding } of events) {
    const selection = { runId: binding.runId, attemptId: binding.attemptId };
    selections.set(JSON.stringify([selection.runId, selection.attemptId]), selection);
  }
  return [...selections.values()];
}

/** Fold immutable accepted history into display only. Projection owns replay/gaps. */
export function buildWorkspaceView(events: readonly UIEvent[], selection: RunSelection): WorkspaceView {
  const messages = new Map<string, string>(), tools = new Map<string, ToolActivity>();
  const view: WorkspaceView = { selection, state: null, reasonCode: null, messages: [], tools: [], sources: [], approvals: [], artifacts: [], checkpointIds: [], usageIds: [], errors: [] };
  const sources: SourceEvidence[] = [], approvals: WorkspaceView['approvals'][number][] = [], artifacts: WorkspaceView['artifacts'][number][] = [];
  const checkpointIds: string[] = [], usageIds: string[] = [], errors: WorkspaceView['errors'][number][] = [];
  for (const event of events) {
    if (event.binding.runId !== selection.runId || event.binding.attemptId !== selection.attemptId) continue;
    switch (event.type) {
      case 'run.status': view.state = event.data.state; view.reasonCode = event.data.reasonCode; break;
      case 'message.delta': messages.set(event.data.messageId, (messages.get(event.data.messageId) ?? '') + event.data.text); break;
      case 'tool.started': tools.set(event.data.requestId, { requestId: event.data.requestId, name: event.data.tool, resultReference: tools.get(event.data.requestId)?.resultReference ?? null }); break;
      case 'tool.completed': tools.set(event.data.requestId, { requestId: event.data.requestId, name: tools.get(event.data.requestId)?.name ?? null, resultReference: event.data.resultReference }); break;
      case 'source.available': sources.push(event.data); break;
      case 'approval.required': approvals.push(event.data); break;
      case 'artifact.available': artifacts.push(event.data); break;
      case 'checkpoint.verified': checkpointIds.push(event.data.checkpointId); break;
      case 'usage.recorded': usageIds.push(event.data.usageId); break;
      case 'run.error': errors.push(renderRunError(event)); break;
    }
  }
  return { ...view, messages: [...messages].map(([messageId, text]) => ({ messageId, text })), tools: [...tools.values()], sources, approvals, artifacts, checkpointIds, usageIds, errors };
}
