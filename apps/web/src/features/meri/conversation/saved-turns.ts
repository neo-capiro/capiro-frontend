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
    ...(turn.request.modelSelection
      ? { modelSelection: turn.request.modelSelection }
      : {}),
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

/**
 * A run this view watched reach a terminal state needs the saved history read again. A reopened run
 * that the saved read already reports terminal does not: re-reading it hides every admitted page
 * until all of them are read again, so a reloaded long conversation showed one turn meanwhile. A saved copy
 * whose events stop short of its last sequence is still read again once.
 */
export const settledRefreshDue = (
  turn: Pick<TurnView, "runId" | "runState"> | null | undefined,
  saved: Pick<TurnView, "runId" | "runState" | "incompleteHistory"> | undefined,
) =>
  isTerminal(turn?.runState) &&
  !(
    saved?.runId === turn?.runId &&
    isTerminal(saved?.runState) &&
    !saved?.incompleteHistory
  );

/** Reading history constrains UI actions; trusted session/admission owners still decide every write. */
export function sessionHistoryState(
  history: {
    saved?: ReturnType<typeof transcriptPages> | undefined;
    current?: ConversationTranscriptPage | undefined;
    /** The saved history is being read for the first time or read again (a re-read hides the admitted pages). */
    reading?: boolean;
  },
  runId: string | undefined,
  localTurns: readonly TurnView[],
  retained: TurnIntent | undefined,
  busy: boolean,
  failure?: ControlFailure,
  /** Target run id of a reservation control confirmed admitted no message, or that the person discarded. */
  opened?: string,
) {
  const metadata = history.current;
  const reservation = metadata?.pendingTurn;
  // Its source admits an ordinary next message again: the reservation replays to the same target.
  const reservationOpen =
    !!reservation && reservation.targetBinding.runId === opened;
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
    (!reservation || reservationOpen)
      ? metadata.latestRun.binding
      : undefined;
  const recoveryNeeded =
    !!retained &&
    (retained.state === "unknown" ||
      retained.receipt?.targetBinding.runId !== runId);
  const unknownReservation =
    !!reservation &&
    !reservationOpen &&
    retained?.source.runId !== reservation.sourceBinding.runId;
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
  // The latest-run read has not answered yet: a transient check, not something the person resolves.
  const nextChecking =
    !busy &&
    !recoveryNeeded &&
    !unknownReservation &&
    !source &&
    !reservationOpen;
  const nextBlocked = busy
    ? "Checking your last message…"
    : recoveryNeeded && !unknownReservation && failure
      ? controlFailureMessage(failure)
      : recoveryNeeded || unknownReservation
        ? "Your last message may still be in progress. Check again before sending."
        : nextChecking
          ? "Capiro is checking this conversation before you can send again."
          : undefined;
  // While the saved history is read (a re-read hides the admitted pages) an existing conversation would otherwise
  // look empty and take a second first message (allocate refuses it, and the person saw "Delivery is uncertain").
  const initialBlocked =
    busy ||
    retained ||
    reservation ||
    metadata ||
    history.saved?.latest ||
    localTurns.length
      ? "Check this conversation's latest state before sending another message."
      : history.reading
        ? "Loading this conversation…"
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
    openedTarget: reservationOpen ? opened : undefined,
    earlier,
    savedCurrent,
    latestTarget,
    recoveryNeeded,
    unknownReservation,
    nextBlocked,
    nextChecking,
    initialBlocked,
  };
}
