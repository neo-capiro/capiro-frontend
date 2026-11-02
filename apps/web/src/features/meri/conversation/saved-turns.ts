import type { transcriptPages } from "../../../shared/meri-conversations/history-pages";
import { turnFromEvents, isTerminal, type TurnView } from "./conversation-view";
import { logicalPromptKey } from "./prompt-identity";
import type { ConversationTranscriptPage } from "../../../shared/meri-conversations/history-client";
import type { TurnIntent } from "../../../shared/meri-conversations/turn-journal";
import {
  controlFailureMessage,
  type ControlFailure,
} from "./control-reachability";

function savedTurn(
  turn: ConversationTranscriptPage["turns"][number],
  wrapped: ConversationTranscriptPage["events"],
) {
  const events = wrapped
    .filter(({ event }) => event.binding.runId === turn.run.binding.runId)
    .map(({ event }) => event);
  return {
    ...turnFromEvents(
      events,
      turn.run.binding,
      turn.request.prompt,
      turn.run.state,
      events[0]?.sequence !== 1,
    ),
    promptKey: logicalPromptKey(
      turn.run.binding.conversationId,
      turn.promptLineage.logicalRequestId,
    ),
    incompleteHistory: events.at(-1)?.sequence !== turn.lastSequence,
  };
}

/** Preserve original run-local events and logical prompt lineage in each saved run segment. */
export function savedTurns(
  history: ReturnType<typeof transcriptPages> | undefined,
) {
  if (!history?.latest) return [];
  return history.turns.map((turn) => savedTurn(turn, history.events));
}

/** Reading history constrains UI actions; trusted session/admission owners still decide every write. */
export function sessionHistoryState(
  history: {
    saved?: ReturnType<typeof transcriptPages> | undefined;
    current?: ConversationTranscriptPage | undefined;
  },
  runId: string | undefined,
  localTurns: readonly TurnView[],
  retained: TurnIntent | undefined,
  busy: boolean,
  failure?: ControlFailure,
) {
  const metadata = history.current;
  const latestAccepted = metadata?.turns.find(
    (turn) => turn.run.binding.runId === metadata.latestRun.binding.runId,
  );
  const admitted =
    metadata?.turns.find((turn) => turn.run.binding.runId === runId) ??
    history.saved?.turns.find((turn) => turn.run.binding.runId === runId);
  // A newly reserved target is not accepted yet. An older read must never reopen its source.
  const latestTarget =
    admitted &&
    latestAccepted &&
    latestAccepted.sequenceBase > admitted.sequenceBase
      ? latestAccepted.run.binding
      : undefined;
  const logicalKey = admitted
    ? logicalPromptKey(
        admitted.run.binding.conversationId,
        admitted.promptLineage.logicalRequestId,
      )
    : undefined;
  const source =
    metadata &&
    runId &&
    metadata.latestRun.binding.runId === runId &&
    isTerminal(metadata.latestRun.state) &&
    !metadata.pendingTurn
      ? metadata.latestRun.binding
      : undefined;
  const reservation = metadata?.pendingTurn;
  const recoveryNeeded =
    !!retained &&
    (retained.state === "unknown" ||
      retained.receipt?.targetBinding.runId !== runId);
  const unknownReservation =
    !!reservation && retained?.source.runId !== reservation.sourceBinding.runId;
  const loaded = savedTurns(history.saved);
  const savedCurrent =
    loaded.find((turn) => turn.runId === runId) ??
    (admitted && metadata ? savedTurn(admitted, metadata.events) : undefined);
  const earlier = [
    ...loaded,
    ...(history.saved
      ? localTurns.filter(
          (turn) => !loaded.some((saved) => saved.runId === turn.runId),
        )
      : []),
  ].filter((turn) => !!latestTarget || turn.runId !== runId);
  // Only control's own report of a reservation holds the hard lock. A check that control never
  // answered (or that the edge refused) keeps the retained request for a plain retry instead.
  const nextBlocked = busy
    ? "Checking your last message…"
    : recoveryNeeded && !unknownReservation && failure
      ? controlFailureMessage(failure)
      : recoveryNeeded || unknownReservation
        ? "Your last message may still be in progress. Check again before sending."
        : !source
          ? "Capiro is checking this conversation before you can send again."
          : undefined;
  const initialBlocked =
    busy ||
    retained ||
    reservation ||
    metadata ||
    history.saved?.latest ||
    localTurns.length
      ? "This conversation already has a message in progress. Check it before sending another."
      : undefined;
  return {
    logicalKey,
    acceptedRequest: admitted?.request
      ? {
          ...admitted.request,
          windowRequest: admitted.request.windowRequest ?? null,
        }
      : undefined,
    source,
    reservation,
    earlier,
    savedCurrent,
    latestTarget,
    recoveryNeeded,
    unknownReservation,
    nextBlocked,
    initialBlocked,
  };
}
