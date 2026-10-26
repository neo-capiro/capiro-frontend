import type { ConversationObservationSnapshot } from "@capiro/meri-client/conversation";
import type { RunBinding, UIEvent } from "@capiro/meri-contracts";
import type { ConversationEvent } from "@capiro/meri-contracts/conversation-application";
import type {
  NativeBillTextSourceEvent,
  NativeHearingSourceEvent,
} from "@capiro/meri-contracts/conversation-sources";
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
    incompleteHistory?: boolean;
    /** Display completeness only, using original run-local event sequence; never a network cursor. */
    throughSequence?: number;
    /** UI key derived from admitted conversation + logical request identity; never prompt text. */
    promptKey?: string;
    nativeSources: readonly (
      | NativeBillTextSourceEvent
      | NativeHearingSourceEvent
    )[];
  } & Pick<
    WorkspaceView,
    | "reasonCode"
    | "messages"
    | "tools"
    | "sources"
    | "approvals"
    | "artifacts"
    | "errors"
    | "checkpointIds"
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
  return Object.freeze({
    ...turnFromEvents(
      observation.events,
      { runId },
      observation.prompt,
      observation.runState,
      observation.omittedPrefix,
    ),
    incompleteHistory: observation.hasMore,
  });
}

/** Shared display fold for SDK observations and admitted saved history; it establishes no authority. */
export function turnFromEvents(
  events: readonly ConversationEvent[],
  binding: Pick<RunBinding, "runId">,
  prompt: string | null,
  runState: RunState,
  omittedPrefix: boolean,
): TurnView {
  const first = events[0];
  const legacy = events.filter(
    (event): event is UIEvent =>
      event.type !== "source.native-bill-text" &&
      event.type !== "source.native-hearing-record",
  );
  const view = first ? buildWorkspaceView(legacy, first.binding) : undefined;
  return Object.freeze({
    runId: binding.runId,
    prompt,
    runState,
    omittedPrefix,
    throughSequence: events.at(-1)?.sequence ?? 0,
    reasonCode: view?.reasonCode ?? null,
    messages: view?.messages ?? [],
    tools: view?.tools ?? [],
    sources: view?.sources ?? [],
    nativeSources: events.filter(
      (event): event is NativeBillTextSourceEvent | NativeHearingSourceEvent =>
        (event.type === "source.native-bill-text" ||
          event.type === "source.native-hearing-record") &&
        event.binding.runId === binding.runId,
    ),
    approvals: view?.approvals ?? [],
    artifacts: view?.artifacts ?? [],
    errors: view?.errors ?? [],
    checkpointIds: view?.checkpointIds ?? [],
  });
}

/** A fully paged saved current run must not be hidden behind the SDK's shorter display window. */
export function currentTurnView(
  observed: TurnView | null,
  saved: TurnView | undefined,
): TurnView | null {
  if (!observed) return saved ?? null;
  if (!saved || saved.runId !== observed.runId) return observed;
  const through = observed.throughSequence ?? 0,
    savedThrough = saved.throughSequence ?? 0;
  return savedThrough > through ||
    (savedThrough === through &&
      ((observed.omittedPrefix && !saved.omittedPrefix) ||
        (observed.incompleteHistory && !saved.incompleteHistory)))
    ? saved
    : observed;
}

/** Artifact versions across the turns shown, first appearance order, one entry per version. */
export function conversationArtifacts(turns: readonly TurnView[]) {
  const seen = new Map<string, TurnView["artifacts"][number]>();
  for (const turn of turns)
    for (const artifact of turn.artifacts)
      if (!seen.has(artifact.versionId)) seen.set(artifact.versionId, artifact);
  return [...seen.values()];
}
