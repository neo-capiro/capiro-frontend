"use client";
import { useEffect, useRef, useState } from "react";
import type {
  ConversationFeedbackRequest,
  ConversationFeedbackReceipt,
} from "@capiro/meri-contracts/conversation-application";
import type { MeriConversationPort } from "../../../../shared/meri-conversations/host-controller";
import {
  feedbackRecovery,
  matchingFeedback,
} from "../../../../shared/meri-feedback/recovery";

const uncertain =
  "Saving could not be confirmed. Check saved feedback or retry this exact feedback.";
const errors: Record<string, string> = {
  FEEDBACK_REVISION_CHANGED:
    "This answer changed. Reload the conversation before sending feedback.",
  FEEDBACK_TARGET_REFUSED: "This output is no longer available for feedback.",
  FEEDBACK_SOURCE_REFUSED:
    "The selected source is no longer available for this answer.",
  FEEDBACK_LIMIT: "This run has reached its feedback limit.",
  FEEDBACK_REPLAY_REFUSED:
    "The saved request does not match this feedback. Check saved feedback before continuing.",
};

/** A pending request stays frozen in existing tab recovery until an exact receipt or definite refusal. */
export function useFeedback(port: MeriConversationPort, runId: string) {
  const [recovery] = useState(() => {
    try {
      const journal = feedbackRecovery(port.context, runId);
      return { journal, pending: journal.read() };
    } catch {
      return {
        error:
          "Feedback recovery is unavailable in this tab. Keep this page open and try again after restoring tab storage.",
      };
    }
  });
  const [pending, setPending] = useState<
    ConversationFeedbackRequest | undefined
  >(recovery.pending);
  const [receipts, setReceipts] = useState<ConversationFeedbackReceipt[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(recovery.error);
  const alive = useRef(true),
    active = useRef(false),
    controller = useRef(new AbortController());
  useEffect(() => {
    alive.current = true;
    controller.current = new AbortController();
    return () => {
      alive.current = false;
      controller.current.abort();
    };
  }, []);
  const current = () =>
    alive.current &&
    !!recovery.journal?.current() &&
    port.getSnapshot().status !== "disposed";
  const begin = () => {
    if (!current() || active.current) return false;
    active.current = true;
    setBusy(true);
    setError(undefined);
    return true;
  };
  const finish = () => {
    active.current = false;
    if (alive.current) setBusy(false);
  };
  const clear = () => {
    recovery.journal!.clear();
    setPending(undefined);
  };

  async function refresh() {
    if (!begin()) return;
    try {
      const reply = await port.feedback.read(runId, controller.current.signal);
      if (!current()) return;
      if (reply.kind !== "ok") {
        setError(
          "Saved feedback could not be loaded. Your pending feedback is still retained.",
        );
        return;
      }
      const unresolved = recovery.journal!.read();
      if (unresolved) {
        const receipt = await matchingFeedback(
          unresolved,
          reply.value.receipts,
        );
        if (!current()) return;
        if (receipt) clear();
        else setError(uncertain);
      }
      setReceipts(reply.value.receipts);
    } catch {
      if (alive.current)
        setError(
          "Saved feedback did not match the captured request. Keep this page open and retry the same feedback.",
        );
    } finally {
      finish();
    }
  }
  async function send(input: ConversationFeedbackRequest) {
    if (!begin()) return;
    try {
      const previouslyUnresolved = !!recovery.journal!.read();
      recovery.journal!.write(input);
      const captured = recovery.journal!.read();
      if (!captured) throw new Error("Feedback was not retained");
      setPending(captured);
      const reply = await port.feedback.record(
        captured,
        controller.current.signal,
      );
      if (!current()) return;
      if (reply.kind === "ok") {
        clear();
        setReceipts((previous) => [
          ...previous.filter(
            (r) => r.feedbackId !== reply.value.receipt.feedbackId,
          ),
          reply.value.receipt,
        ]);
      } else if (reply.kind === "refused" || reply.kind === "not_sent") {
        // A refusal now does not settle an earlier uncertain delivery.
        if (!previouslyUnresolved) clear();
        setError(
          previouslyUnresolved
            ? "This attempt could not confirm the earlier save. The exact feedback is still retained; check saved feedback when access returns."
            : reply.kind === "refused"
              ? (errors[reply.code] ??
                "Feedback was refused. Reopen the conversation to check current access.")
              : "Feedback was not sent. Try again.",
        );
      } else setError(uncertain);
    } catch {
      if (alive.current)
        setError(
          "Feedback could not be safely saved or confirmed. Keep this page open and check saved feedback.",
        );
    } finally {
      finish();
    }
  }
  return {
    pending,
    receipts,
    busy,
    error,
    blocked: !!recovery.error,
    refresh,
    send,
  };
}
