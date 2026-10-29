"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
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
  | { readonly type: "failed" };

/** The card's own phase: what the last submission attempt did, independent of the run's durable state.
 *
 * A correctable local selection problem and an explicitly refused answer both stay answerable; a delivered answer that
 * has not been confirmed yet waits; a delivery whose outcome the server reported as unknown latches, because resending
 * it under a fresh control id would assert a delivery this client cannot prove. */
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
    default:
      return phase;
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

/**
 * Subscribes to the current conversation's durable view and submits the one answer control.
 *
 * The question, its run state and its expiry all come from the admitted durable view, never from local state: a reload
 * or reconnect of the same live run re-derives the same pending question. A local selection problem keeps the card
 * editable; a rejected answer can be retried with a fresh selection; an answer whose delivery is genuinely unknown is
 * not resent under a new control id, because that would claim a delivery the client cannot prove.
 */
export function useRunQuestion(port: MeriConversationPort | null): RunQuestion {
  const [pending, setPending] = useState<PendingQuestion | null>(null);
  const [terminal, setTerminal] = useState(true);
  const [expired, setExpired] = useState(false);
  const [phase, dispatch] = useReducer(questionPhase, "open");

  useEffect(() => {
    if (!port) {
      setPending(null);
      setTerminal(true);
      return;
    }
    const read = () => {
      const snapshot = port.getSnapshot();
      const observation = snapshot.observation;
      const next = pendingQuestion(observation?.events ?? []);
      setPending((current) => {
        // A different question is a fresh decision: the previous phase never carries over.
        if (current?.questionId !== next?.questionId) dispatch({ type: "reset" });
        return next;
      });
      setTerminal(observation ? isSettled(observation.runState) : true);
      setExpired(next !== null && Date.parse(next.expiresAt) <= Date.now());
    };
    read();
    return port.subscribe(read);
  }, [port]);

  const submit = useCallback(
    (selection: QuestionSelection, freeText: Readonly<Record<string, string>>) => {
      if (!port || !pending) return;
      let answers: Record<string, QuestionAnswerValue>;
      try {
        answers = questionAnswers(pending, selection, freeText);
      } catch {
        // A correctable local selection problem: nothing is sent and the card stays editable.
        dispatch({ type: "invalid" });
        return;
      }
      dispatch({ type: "submitted" });
      void (async () => {
        try {
          const receipt = await port.control(
            answerControl(pending.questionId, answers, crypto.randomUUID()),
          );
          dispatch("state" in receipt
            ? { type: "receipt", state: String(receipt.state) }
            : { type: "refused" });
        } catch (cause) {
          dispatch({
            type: cause instanceof ConversationUnavailable ? "failed" : "refused",
          });
        }
      })();
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
