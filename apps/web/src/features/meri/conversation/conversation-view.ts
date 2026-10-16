import type { ConversationObservationSnapshot } from "@capiro/meri-client/conversation";
import {
  buildWorkspaceView,
  type WorkspaceView,
} from "../workspace/workspace-view";

type RunState = ConversationObservationSnapshot["runState"];

/** One request/run in the conversation, folded from service-admitted events only. */
export type TurnView = Readonly<
  {
    runId: string;
    prompt: string | null;
    runState: RunState;
    omittedPrefix: boolean;
  } & Pick<
    WorkspaceView,
    | "reasonCode"
    | "messages"
    | "tools"
    | "sources"
    | "approvals"
    | "artifacts"
    | "errors"
  >
>;

const terminal: ReadonlySet<RunState> = new Set([
  "completed",
  "failed",
  "cancelled",
]);
/** Finished runs accept no more input; the next prompt needs the conversation's next run. */
export const isTerminal = (state: RunState | undefined) =>
  state !== undefined && terminal.has(state);
/** Nothing more streams until a person or service acts: finished, paused or awaiting approval. */
export const isSettled = (state: RunState | undefined) =>
  isTerminal(state) || state === "paused" || state === "waiting-for-approval";

/** Display only; admission, ordering and binding checks already happened in the public receiver. */
export function turnFromObservation(
  observation: ConversationObservationSnapshot,
  runId: string,
): TurnView {
  const first = observation.events[0];
  const view = first
    ? buildWorkspaceView(observation.events, first.binding)
    : undefined;
  return Object.freeze({
    runId,
    prompt: observation.prompt,
    runState: observation.runState,
    omittedPrefix: observation.omittedPrefix,
    reasonCode: view?.reasonCode ?? null,
    messages: view?.messages ?? [],
    tools: view?.tools ?? [],
    sources: view?.sources ?? [],
    approvals: view?.approvals ?? [],
    artifacts: view?.artifacts ?? [],
    errors: view?.errors ?? [],
  });
}

/** Artifact versions across the turns shown, first appearance order, one entry per version. */
export function conversationArtifacts(turns: readonly TurnView[]) {
  const seen = new Map<string, TurnView["artifacts"][number]>();
  for (const turn of turns)
    for (const artifact of turn.artifacts)
      if (!seen.has(artifact.versionId)) seen.set(artifact.versionId, artifact);
  return [...seen.values()];
}
