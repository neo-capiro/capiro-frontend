"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ConversationUnavailable,
  answerControl,
  pendingQuestion,
  questionAnswers,
} from "@capiro/meri-client/conversation";
import type {
  PendingQuestion,
  QuestionSelection,
} from "@capiro/meri-client/conversation";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import { isSettled } from "./conversation-view";
import type { QuestionCardState } from "./QuestionCard";

type Phase = "open" | "waiting" | "unknown" | "rejected" | "local" | "error";

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
  const [phase, setPhase] = useState<Phase>("open");

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
        if (current?.questionId !== next?.questionId) setPhase("open");
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
      let answers: Record<string, string | string[]>;
      try {
        answers = questionAnswers(pending, selection, freeText);
      } catch {
        // A correctable local selection problem: nothing is sent and the card stays editable.
        setPhase("local");
        return;
      }
      setPhase("waiting");
      void (async () => {
        try {
          const receipt = await port.control(
            answerControl(pending.questionId, answers, crypto.randomUUID()),
          );
          // The durable record settles the card; an unknown delivery is never retried blindly as a new control.
          setPhase(receipt.state === "UNKNOWN" ? "unknown" : "waiting");
        } catch (cause) {
          setPhase(cause instanceof ConversationUnavailable ? "error" : "rejected");
        }
      })();
    },
    [port, pending],
  );

  const state: QuestionCardState =
    pending === null || terminal || expired ? "unavailable" : phase;
  return {
    questionId: pending?.questionId ?? null,
    pending,
    state,
    error: state === "open" || state === "waiting" ? null : MESSAGES[state],
    submit,
  };
}
