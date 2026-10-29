"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  ConversationUnavailable,
  answerControl,
  pendingQuestion,
  questionAnswers,
  questionOutcome,
} from "@capiro/meri-client/conversation";
import type {
  PendingQuestion,
  QuestionAnswerValue,
  QuestionOutcome,
  QuestionSelection,
} from "@capiro/meri-client/conversation";
import type { ConversationLifecycleControlRequest } from "@capiro/meri-contracts/conversation-lifecycle";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import { lifecycleJournal } from "../../../shared/meri-conversation-lifecycle/journal";
import { isSettled } from "./conversation-view";
import type { QuestionCardState } from "./QuestionCard";

export type QuestionPhase =
  | "open"
  | "waiting"
  | "unknown"
  | "rejected"
  | "local"
  | "retention"
  | "error";

export type QuestionAction =
  | { readonly type: "reset" }
  | { readonly type: "invalid" }
  | { readonly type: "submitted" }
  | { readonly type: "receipt"; readonly state: string }
  | { readonly type: "refused" }
  | { readonly type: "failed" }
  | { readonly type: "result"; readonly phase: QuestionPhase };

/** The card's own phase: what the last submission attempt did, independent of the run's durable state.
 *
 * Only an acknowledgement that proves nothing was dispatched returns the card to an answerable phase. A delivery whose
 * outcome is unknown latches: resending it under a fresh control id would assert a delivery this client cannot prove. */
export function questionPhase(phase: QuestionPhase, action: QuestionAction): QuestionPhase {
  switch (action.type) {
    case "reset":
      return "open";
    case "invalid":
      return "local";
    case "submitted":
      return "waiting";
    case "receipt":
      return action.state === "UNKNOWN" ? "unknown" : "waiting";
    case "refused":
      return "rejected";
    case "failed":
      return "error";
    case "result":
      return action.phase;
    default:
      return phase;
  }
}

/** What the control response proves about the answer, read from the contract's own two shapes.
 *
 * A control route answers either a receipt with `state`, or — notably for a 502 LIFECYCLE_EFFECT_UNKNOWN — an error body
 * whose `outcome` says whether the effect is known not to have been dispatched. Anything else is unknown. */
export type ControlOutcome = "PENDING" | "UNKNOWN" | "NOT_DISPATCHED";

export function controlOutcome(receipt: unknown): ControlOutcome {
  if (typeof receipt !== "object" || receipt === null) return "UNKNOWN";
  if ("state" in receipt) {
    return (receipt as { state?: unknown }).state === "UNKNOWN" ? "UNKNOWN" : "PENDING";
  }
  if ("error" in receipt) {
    const error = (receipt as { error?: { outcome?: unknown } }).error;
    return error?.outcome === "NOT_DISPATCHED" ? "NOT_DISPATCHED" : "UNKNOWN";
  }
  return "UNKNOWN";
}

/** The existing one-unresolved-control-per-run journal, narrowed to what an answer needs. */
export interface AnswerJournal {
  read(): ConversationLifecycleControlRequest | undefined;
  retain(
    command: ConversationLifecycleControlRequest,
  ): ConversationLifecycleControlRequest;
  clear(command: ConversationLifecycleControlRequest): void;
}

export type AnswerControl = Extract<
  ConversationLifecycleControlRequest,
  { intent: "answer" }
>;

/** The answer this run is still holding, if any. A different control type in the journal is not an answer. */
export function retainedAnswer(journal: AnswerJournal | null): AnswerControl | null {
  const held = journal?.read();
  return held !== undefined && held.intent === "answer" ? held : null;
}

/** Retire a retained answer only when the run's own durable projection says this exact question is settled.
 *
 * A pending event, a missing event in a partial page, an unavailable view or the refusal of an earlier attempt are all
 * *not* evidence that nothing was dispatched, so none of them releases the retained control. */
export function settleRetainedAnswer(
  journal: AnswerJournal | null,
  events: readonly unknown[],
  questionId: string,
): QuestionOutcome {
  const outcome = questionOutcome(
    events as Parameters<typeof questionOutcome>[0],
    questionId,
  );
  if (outcome === null) return null;
  const held = retainedAnswer(journal);
  if (held !== null && held.questionId === questionId) journal?.clear(held);
  return outcome;
}

export type AnswerCommandResult =
  | {
      readonly kind: "skipped";
      readonly reason: "expired" | "settled" | "not-current" | "nothing-retained";
    }
  | { readonly kind: "refused"; readonly reason: "retained" | "unretained" }
  | { readonly kind: "phase"; readonly phase: QuestionPhase };

/** The same question, still live, still before its deadline — re-read from the port right before sending. */
function answerGuard(
  port: MeriConversationPort,
  pending: PendingQuestion,
  now: number,
): "expired" | "settled" | "not-current" | null {
  const observation = port.getSnapshot().observation;
  const fresh = pendingQuestion(observation?.events ?? []);
  if (fresh === null || fresh.questionId !== pending.questionId) return "not-current";
  if (observation == null || isSettled(observation.runState)) return "settled";
  if (Date.parse(fresh.expiresAt) <= now) return "expired";
  return null;
}

/** Send one answer control and file the outcome, always under the identity already retained for this attempt. */
async function dispatchAnswer(
  port: MeriConversationPort,
  journal: AnswerJournal,
  command: AnswerControl,
): Promise<AnswerCommandResult> {
  try {
    const receipt = await port.control(command);
    if ("error" in receipt) {
      const outcome = controlOutcome(receipt);
      // A refusal proves the effect did not happen, so the identity can be retired and the card corrected.
      if (outcome === "NOT_DISPATCHED") {
        journal.clear(command);
        return { kind: "phase", phase: "rejected" };
      }
      return { kind: "phase", phase: "unknown" };
    }
    // The retained identity outlives an applied answer until the run's own events say the question is settled.
    return { kind: "phase", phase: controlOutcome(receipt) === "UNKNOWN" ? "unknown" : "waiting" };
  } catch (cause) {
    // A lost response may have been delivered; a superseded conversation cannot deliver at all.
    return { kind: "phase", phase: cause instanceof ConversationUnavailable ? "error" : "unknown" };
  }
}

/** The one command the card submits, retaining the exact answer before it leaves the tab.
 *
 * A fresh attempt is refused while this run still holds an unresolved answer control: a new random control id would be a
 * second identity for a delivery the client cannot account for. The retained control is only replayed by an explicit
 * `reconcile` (the user asking again), never automatically, and only a proven NOT_DISPATCHED retires it. */
export async function sendAnswer({
  port,
  journal,
  pending,
  selection,
  freeText,
  controlId,
  reconcile = false,
  now = Date.now(),
}: {
  readonly port: MeriConversationPort;
  readonly journal: AnswerJournal | null;
  readonly pending: PendingQuestion;
  readonly selection: QuestionSelection;
  readonly freeText: Readonly<Record<string, string>>;
  readonly controlId: string;
  readonly reconcile?: boolean;
  readonly now?: number;
}): Promise<AnswerCommandResult> {
  if (journal === null) return { kind: "refused", reason: "unretained" };
  const held = retainedAnswer(journal);
  if (reconcile) {
    if (held === null) return { kind: "skipped", reason: "nothing-retained" };
    if (held.questionId !== pending.questionId) return { kind: "refused", reason: "retained" };
    const settled = answerGuard(port, pending, now);
    if (settled !== null) return { kind: "skipped", reason: settled };
    return dispatchAnswer(port, journal, held);
  }
  if (held !== null) return { kind: "refused", reason: "retained" };
  const guarded = answerGuard(port, pending, now);
  if (guarded !== null) return { kind: "skipped", reason: guarded };
  let answers: Record<string, QuestionAnswerValue>;
  try {
    answers = questionAnswers(pending, selection, freeText);
  } catch {
    // A correctable local selection problem: nothing is retained and nothing is sent.
    return { kind: "phase", phase: "local" };
  }
  let retained: ConversationLifecycleControlRequest;
  try {
    retained = journal.retain(answerControl(pending.questionId, answers, controlId));
  } catch {
    // The shared journal already holds another unresolved control for this run.
    return { kind: "refused", reason: "retained" };
  }
  if (retained.intent !== "answer") return { kind: "refused", reason: "retained" };
  return dispatchAnswer(port, journal, retained);
}

/** What the card may act on: a question whose run already settled, or whose own deadline passed, is never answerable. */
export function questionCardState(
  phase: QuestionPhase,
  { pending, terminal, expired }: {
    readonly pending: PendingQuestion | null;
    readonly terminal: boolean;
    readonly expired: boolean;
  },
): QuestionCardState {
  return pending === null || terminal || expired ? "unavailable" : phase;
}

export interface RunQuestion {
  readonly questionId: string | null;
  readonly pending: PendingQuestion | null;
  readonly state: QuestionCardState;
  readonly error: string | null;
  readonly retryable: boolean;
  readonly submit: (
    selection: QuestionSelection,
    freeText: Readonly<Record<string, string>>,
  ) => void;
  readonly reconcile: () => void;
}

const MESSAGES: Readonly<
  Record<Exclude<QuestionCardState, "open" | "waiting">, string>
> = {
  unavailable:
    "This run is no longer waiting for an answer, so the question can no longer reach it.",
  local:
    "Choose one answer for every question, or type your own. Nothing was sent.",
  rejected:
    "The run did not accept that answer. It may have expired or moved on; you can answer again if it is still waiting.",
  unknown:
    "The answer may not have arrived. The same answer can be checked again once this run reports it; it is never resent as a new one.",
  retention:
    "This tab cannot safely record a pending answer, so nothing was sent. Reload in a tab where this conversation is signed in.",
  error: "This conversation is no longer current. Reload to continue.",
};

/** setTimeout is bounded to a signed 32-bit delay. */
const MAX_TIMER = 2_147_483_647;

/** The states in which asking again is safe: only where the retained identity is still exactly what would be replayed. */
const reconcileable = (state: QuestionCardState) => state === "unknown";

/**
 * Subscribes to the current conversation's durable view and submits the one answer control.
 *
 * The question, its run state and its expiry all come from the admitted durable view, never from local state: a reload
 * or reconnect of the same live run re-derives the same pending question, and a question that quietly passes its deadline
 * stops being answerable without waiting for another event. The answer's control identity is retained in the existing
 * per-run tab journal before dispatch, so a reload of the same run finds the same attempted answer instead of a new one.
 */
export function useRunQuestion(port: MeriConversationPort | null): RunQuestion {
  const [pending, setPending] = useState<PendingQuestion | null>(null);
  const [terminal, setTerminal] = useState(true);
  const [expired, setExpired] = useState(false);
  const [journal, setJournal] = useState<AnswerJournal | null>(null);
  const [retention, setRetention] = useState(true);
  const [phase, dispatch] = useReducer(questionPhase, "open");
  const active = useRef(false);
  // The question and port the card currently shows: a completion that arrives after either changed must not touch the
  // newly mounted question's phase.
  const showing = useRef<{ port: MeriConversationPort | null; questionId: string | null }>({
    port: null,
    questionId: null,
  });
  showing.current = { port, questionId: pending?.questionId ?? null };

  useEffect(() => {
    if (!port) return;
    try {
      setJournal(lifecycleJournal(port.context));
      setRetention(true);
    } catch {
      // No durable place to hold an answer identity means no safe answer can be sent from this tab.
      setJournal(null);
      setRetention(false);
    }
  }, [port]);

  useEffect(() => {
    if (!port) {
      setPending(null);
      setTerminal(true);
      return;
    }
    let deadline: ReturnType<typeof setTimeout> | null = null;
    const read = () => {
      const observation = port.getSnapshot().observation;
      const events = observation?.events ?? [];
      const next = pendingQuestion(events);
      // Only the run's own settled projection retires a retained answer; absence proves nothing.
      const held = retainedAnswer(journal);
      if (held !== null) settleRetainedAnswer(journal, events, held.questionId);
      setPending((current) => {
        // A different question is a fresh decision: the previous phase never carries over.
        if (current?.questionId !== next?.questionId) {
          dispatch({ type: "reset" });
          // A question this run already attempted reopens as unresolved rather than as a fresh decision.
          if (next && retainedAnswer(journal)?.questionId === next.questionId) {
            dispatch({ type: "result", phase: "unknown" });
          }
        }
        return next;
      });
      const settled = observation ? isSettled(observation.runState) : true;
      setTerminal(settled);
      const expiresAtMs = next === null ? Number.NaN : Date.parse(next.expiresAt);
      setExpired(Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now());
      // A quiet pending question still becomes unavailable at its deadline, without waiting for another event.
      if (deadline !== null) clearTimeout(deadline);
      deadline = null;
      if (next !== null && !settled && Number.isFinite(expiresAtMs)) {
        const wait = Math.min(Math.max(0, expiresAtMs - Date.now()), MAX_TIMER);
        deadline = setTimeout(() => {
          setExpired(true);
        }, wait);
      }
    };
    read();
    const unsubscribe = port.subscribe(read);
    return () => {
      unsubscribe();
      if (deadline !== null) clearTimeout(deadline);
    };
  }, [port, journal]);

  const run = useCallback(
    (action: "send" | "reconcile", selection: QuestionSelection, freeText: Readonly<Record<string, string>>) => {
      if (!port || !pending) return;
      // One attempt in flight at a time: a second invocation cannot mint or send a second identity.
      if (active.current) return;
      if (action === "send" && !retention) {
        dispatch({ type: "result", phase: "retention" });
        return;
      }
      active.current = true;
      dispatch({ type: "submitted" });
      void sendAnswer({
        port,
        journal,
        pending,
        selection,
        freeText,
        controlId: crypto.randomUUID(),
        reconcile: action === "reconcile",
      })
        .then((result) => {
          // A late completion from a previous question or port never updates the current card.
          if (showing.current.port !== port || showing.current.questionId !== pending.questionId) return;
          if (result.kind === "phase") {
            dispatch({ type: "result", phase: result.phase });
            return;
          }
          if (result.kind === "refused") {
            // Another unresolved control belongs to this run; the card shows it rather than sending a second one.
            dispatch({ type: "result", phase: result.reason === "retained" ? "unknown" : "retention" });
            return;
          }
          if (result.reason === "expired") setExpired(true);
          else if (result.reason === "settled") setTerminal(true);
          else if (result.reason !== "nothing-retained") dispatch({ type: "reset" });
        })
        .finally(() => {
          active.current = false;
        });
    },
    [port, journal, pending, retention],
  );

  const state = questionCardState(phase, { pending, terminal, expired });
  return {
    questionId: pending?.questionId ?? null,
    pending,
    state,
    error: state === "open" || state === "waiting" ? null : MESSAGES[state],
    retryable: reconcileable(state) && Boolean(pending),
    submit: useCallback(
      (selection: QuestionSelection, freeText: Readonly<Record<string, string>>) =>
        run("send", selection, freeText),
      [run],
    ),
    reconcile: useCallback(() => run("reconcile", {}, {}), [run]),
  };
}
