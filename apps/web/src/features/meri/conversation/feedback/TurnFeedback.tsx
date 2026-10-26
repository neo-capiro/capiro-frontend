"use client";
import { useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@capiro/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@capiro/ui/dialog";
import type { ConversationFeedbackRequest } from "@capiro/meri-contracts/conversation-application";
import type { MeriConversationPort } from "../../../../shared/meri-conversations/host-controller";
import { isTerminal, type TurnView } from "../conversation-view";
import { useFeedbackPort } from "./FeedbackContext";
import { useFeedback } from "./useFeedback";
import {
  FeedbackFields,
  feedbackTargets,
  type FeedbackDraft,
} from "./FeedbackFields";
import { FeedbackReceipts } from "./FeedbackReceipts";
import portal from "../../ui/meri-dialog.module.css";
import styles from "./feedback.module.css";

function initialDraft(
  turn: TurnView,
  pending?: ConversationFeedbackRequest,
): FeedbackDraft {
  const signal = pending?.signal;
  return {
    target: pending
      ? pending.target.kind === "message"
        ? pending.target.messageId
        : pending.target.versionId
      : (feedbackTargets(turn)[0]?.key ?? ""),
    kind: signal?.kind ?? "preference",
    preference: signal?.kind === "preference" ? signal.value : "helpful",
    text:
      signal?.kind === "factual_correction"
        ? signal.proposedCorrection
        : signal?.kind === "recommendation"
          ? signal.recommendation
          : (signal?.note ?? ""),
    sourceEventId: pending?.sourceEventId ?? "",
  };
}

function FeedbackDialog({
  port,
  turn,
}: {
  port: MeriConversationPort;
  turn: TurnView;
}) {
  const feedback = useFeedback(port, turn.runId),
    id = useId();
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(() => initialDraft(turn, feedback.pending));
  const opener = useRef<HTMLButtonElement>(null);
  const eligible =
    isTerminal(turn.runState) &&
    !turn.omittedPrefix &&
    !turn.incompleteHistory &&
    !!turn.throughSequence;
  const selected = feedbackTargets(turn).find(
    (target) => target.key === draft.target,
  );
  const valid =
    !!selected && (draft.kind === "preference" || !!draft.text.trim());
  function submit() {
    if (feedback.pending) {
      void feedback.send(feedback.pending);
      return;
    }
    if (!eligible || !selected || !valid) return;
    const text = draft.text.trim();
    const signal: ConversationFeedbackRequest["signal"] =
      draft.kind === "preference"
        ? { kind: "preference", value: draft.preference, note: text || null }
        : draft.kind === "factual_correction"
          ? { kind: "factual_correction", proposedCorrection: text }
          : { kind: "recommendation", recommendation: text };
    void feedback.send({
      requestId: crypto.randomUUID(),
      target: selected.value,
      signal,
      sourceEventId: draft.sourceEventId || null,
    });
  }
  return (
    <>
      <Button
        ref={opener}
        type="button"
        variant="ghost"
        size="sm"
        className={styles.trigger}
        disabled={!eligible && !feedback.pending}
        onClick={() => {
          setOpen(true);
          void feedback.refresh();
        }}
      >
        {feedback.pending ? "Check feedback" : "Give feedback"}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!feedback.busy) setOpen(next);
        }}
      >
        <DialogContent
          className={`${portal.portalSurface} ${styles.dialog}`}
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
        >
          <div className={styles.heading}>
            <DialogTitle className={styles.title}>
              Feedback on this output
            </DialogTitle>
            <button
              type="button"
              aria-label="Close feedback"
              className={styles.close}
              disabled={feedback.busy}
              onClick={() => setOpen(false)}
            >
              <X aria-hidden />
            </button>
          </div>
          <DialogDescription className={styles.muted}>
            Share a preference, correct a fact, or suggest an improvement. Your
            feedback is saved with this output’s revision.
          </DialogDescription>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <FeedbackFields
              turn={turn}
              draft={draft}
              setDraft={setDraft}
              disabled={feedback.busy || !!feedback.pending || feedback.blocked}
              id={id}
            />
            <p className={styles.muted}>
              Feedback is recorded for review. It does not approve actions or
              apply changes to the answer.
            </p>
            {feedback.pending && (
              <p className={styles.notice}>
                This feedback is retained until its saved outcome is confirmed.
                The captured fields cannot be changed.
              </p>
            )}
            {feedback.error && (
              <p role="alert" className={styles.error}>
                {feedback.error}
              </p>
            )}
            <div className={styles.actions}>
              <Button
                type="submit"
                disabled={
                  feedback.busy ||
                  feedback.blocked ||
                  (!feedback.pending && (!eligible || !valid))
                }
              >
                {feedback.busy
                  ? "Checking…"
                  : feedback.pending
                    ? "Retry exact feedback"
                    : "Save feedback"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={feedback.busy || feedback.blocked}
                onClick={() => void feedback.refresh()}
              >
                Check saved feedback
              </Button>
            </div>
          </form>
          <FeedbackReceipts receipts={feedback.receipts} />
        </DialogContent>
      </Dialog>
    </>
  );
}

/** One compact action per native turn; conversation/session authority remains with the host. */
export function TurnFeedback({ turn }: { turn: TurnView }) {
  const port = useFeedbackPort();
  if (!port || (!turn.messages.length && !turn.artifacts.length)) return null;
  return (
    <FeedbackDialog
      key={`${port.context.conversationId}:${turn.runId}`}
      port={port}
      turn={turn}
    />
  );
}
