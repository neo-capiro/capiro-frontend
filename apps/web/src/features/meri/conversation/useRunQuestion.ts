"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  ConversationUnavailable,
  answerControl,
  pendingQuestion,
  questionAnswers,
} from "@capiro/meri-client/conversation";
import type {
  PendingQuestion,
  QuestionAnswerValue,
  QuestionSelection,
} from "@capiro/meri-client/conversation";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import { isSettled } from "./conversation-view";
import type { QuestionCardState } from "./QuestionCard";

export type QuestionPhase =
  | "open"
  | "waiting"
  | "unknown"
  | "rejected"
  | "local"
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

export type AnswerCommandResult =
  | { readonly kind: "skipped"; readonly reason: "expired" | "settled" | "not-current" }
  | { readonly kind: "phase"; readonly phase: QuestionPhase };

/** The one command the card submits.
 *
 * It re-reads the port's current durable view immediately before sending: the question must still be the same one, its
 * run must still be live, and its deadline must not have passed — a card rendered a moment ago is not evidence that the
 * answer is still deliverable, and an expired question must produce no request at all. Only a proven NOT_DISPATCHED
 * refusal is correctable; an unknown or lost acknowledgement is never retried under a new control id. */
export async function answerCommand({
  port,
  pending,
  selection,
  freeText,
  controlId,
  now = Date.now(),
}: {
  readonly port: MeriConversationPort;
  readonly pending: PendingQuestion;
  readonly selection: QuestionSelection;
  readonly freeText: Readonly<Record<string, string>>;
  readonly controlId: string;
  readonly now?: number;
}): Promise<AnswerCommandResult> {
  const observation = port.getSnapshot().observation;
  const fresh = pendingQuestion(observation?.events ?? []);
  if (fresh === null || fresh.questionId !== pending.questionId) {
    return { kind: "skipped", reason: "not-current" };
  }
  if (observation === null || observation === undefined || isSettled(observation.runState)) {
    return { kind: "skipped", reason: "settled" };
  }
  if (Date.parse(fresh.expiresAt) <= now) return { kind: "skipped", reason: "expired" };
  let answers: Record<string, QuestionAnswerValue>;
  try {
    answers = questionAnswers(fresh, selection, freeText);
  } catch {
    // A correctable local selection problem: nothing is sent and the card stays editable.
    return { kind: "phase", phase: "local" };
  }
  try {
    const receipt = await port.control(answerControl(fresh.questionId, answers, controlId));
    const outcome = controlOutcome(receipt);
    return { kind: "phase", phase: outcome === "NOT_DISPATCHED" ? "rejected" : outcome === "UNKNOWN" ? "unknown" : "waiting" };
  } catch (cause) {
    // A superseded or no-longer-current conversation cannot deliver at all; a lost response may have been delivered.
    return { kind: "phase", phase: cause instanceof ConversationUnavailable ? "error" : "unknown" };
  }
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
  readonly submit: (
    selection: QuestionSelection,
    freeText: Readonly<Record<string, string>>,
  ) => void;
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
    "The answer may not have arrived. This question stays open until the run reports it, so it will not be resent automatically.",
  error: "This conversation is no longer current. Reload to continue.",
};

/** setTimeout is bounded to a signed 32-bit delay. */
const MAX_TIMER = 2_147_483_647;

/**
 * Subscribes to the current conversation's durable view and submits the one answer control.
 *
 * The question, its run state and its expiry all come from the admitted durable view, never from local state: a reload
 * or reconnect of the same live run re-derives the same pending question, and a question that quietly passes its deadline
 * stops being answerable without waiting for another event.
 */
export function useRunQuestion(port: MeriConversationPort | null): RunQuestion {
  const [pending, setPending] = useState<PendingQuestion | null>(null);
  const [terminal, setTerminal] = useState(true);
  const [expired, setExpired] = useState(false);
  const [phase, dispatch] = useReducer(questionPhase, "open");
  // The question and port the card currently shows: a completion that arrives after either changed must not touch the
  // newly mounted question's phase.
  const showing = useRef<{ port: MeriConversationPort | null; questionId: string | null }>({
    port: null,
    questionId: null,
  });
  showing.current = { port, questionId: pending?.questionId ?? null };

  useEffect(() => {
    if (!port) {
      setPending(null);
      setTerminal(true);
      return;
    }
    let deadline: ReturnType<typeof setTimeout> | null = null;
    const read = () => {
      const observation = port.getSnapshot().observation;
      const next = pendingQuestion(observation?.events ?? []);
      setPending((current) => {
        // A different question is a fresh decision: the previous phase never carries over.
        if (current?.questionId !== next?.questionId) dispatch({ type: "reset" });
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
  }, [port]);

  const submit = useCallback(
    (selection: QuestionSelection, freeText: Readonly<Record<string, string>>) => {
      if (!port || !pending) return;
      dispatch({ type: "submitted" });
      void answerCommand({
        port,
        pending,
        selection,
        freeText,
        controlId: crypto.randomUUID(),
      }).then((result) => {
        // A late completion from a previous question or port never updates the current card.
        if (showing.current.port !== port || showing.current.questionId !== pending.questionId) return;
        if (result.kind === "phase") {
          dispatch({ type: "result", phase: result.phase });
          return;
        }
        if (result.reason === "expired") setExpired(true);
        else if (result.reason === "settled") setTerminal(true);
        else dispatch({ type: "reset" });
      });
    },
    [port, pending],
  );

  const state = questionCardState(phase, { pending, terminal, expired });
  return {
    questionId: pending?.questionId ?? null,
    pending,
    state,
    error: state === "open" || state === "waiting" ? null : MESSAGES[state],
    submit,
  };
}
