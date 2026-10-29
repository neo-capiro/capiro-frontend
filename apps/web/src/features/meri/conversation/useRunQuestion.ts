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
import type { QuestionCardState } from "./QuestionCard";

/**
 * Subscribes to the current conversation's durable events and submits the one answer control.
 *
 * The pending question comes from the run's own event history, so reconnecting or refreshing re-derives the same card
 * instead of losing it. Submitting never grants anything: the control carries only the question id and the chosen
 * labels, Core re-checks the current actor, and a stale, duplicate or cross-tenant answer is refused by the owner.
 */
export function useRunQuestion(port: MeriConversationPort | null): {
  readonly pending: PendingQuestion | null;
  readonly state: QuestionCardState;
  readonly error: string | null;
  readonly submit: (
    selection: QuestionSelection,
    freeText: Readonly<Record<string, string>>,
  ) => void;
} {
  const [pending, setPending] = useState<PendingQuestion | null>(null);
  const [phase, setPhase] = useState<"open" | "waiting" | "error">("open");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!port) {
      setPending(null);
      return;
    }
    const read = () => {
      const snapshot = port.getSnapshot();
      const next = pendingQuestion(snapshot.observation?.events ?? []);
      setPending((current) => {
        if (current?.questionId !== next?.questionId) {
          setPhase("open");
          setError(null);
        }
        return next;
      });
    };
    read();
    return port.subscribe(read);
  }, [port]);

  const submit = useCallback(
    (selection: QuestionSelection, freeText: Readonly<Record<string, string>>) => {
      if (!port || !pending) return;
      setPhase("waiting");
      setError(null);
      void (async () => {
        try {
          const answers = questionAnswers(pending, selection, freeText);
          await port.control(
            answerControl(pending.questionId, answers, crypto.randomUUID()),
          );
          setPhase("open");
        } catch (cause) {
          setPhase("error");
          setError(
            cause instanceof ConversationUnavailable
              ? "This answer could not be sent because the conversation is no longer current."
              : "This answer was not accepted. It may have expired, or the run may have moved on.",
          );
        }
      })();
    },
    [port, pending],
  );

  return { pending, state: phase, error, submit };
}
