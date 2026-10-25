"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import type { Prospect } from "../contracts";
import { useContactTransfer } from "./useContactTransfer";
import {
  assertTransferReview,
  type TransferDecision,
  type FreshTransferReview,
} from "./review";
import { TransferReview } from "./TransferReview";

export function ContactTransfer({ record }: { record: Prospect }) {
  const identity = useIdentity();
  if (!record.convertedAt || !record.linkedClientId) return null;
  return (
    <TransferSession
      key={`${identity.data?.tenant?.id}:${identity.data?.user.id}:${record.id}:${record.linkedClientId}`}
      record={record}
    />
  );
}
function TransferSession({ record }: { record: Prospect }) {
  const flow = useContactTransfer(record);
  const [open, setOpen] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  const [decisions, setDecisions] = useState<TransferDecision[]>([]);
  const [freshReview, setFreshReview] = useState<FreshTransferReview>();
  const trigger = useRef<HTMLButtonElement>(null);
  const pending = flow.recovery.record,
    busy = flow.action.isPending || flow.review.isPending;
  const review =
    freshReview?.review ??
    (!flow.review.isPending && !flow.review.error
      ? flow.review.data
      : undefined);
  const receipt =
    pending && flow.action.data?.receipt.requestId === pending.command.requestId
      ? flow.action.data.receipt
      : undefined;
  let reviewError = "";
  if (review && decisions.length) {
    try {
      assertTransferReview(review, review, decisions);
    } catch (error) {
      reviewError =
        error instanceof Error
          ? error.message
          : "Review these decisions again.";
    }
  }
  const refresh = () => {
    setDecisions([]);
    setConfirmed(false);
    setFreshReview(undefined);
    flow.action.reset();
    flow.review.mutate();
  };
  const error =
    flow.contextError ??
    flow.recovery.error ??
    flow.action.error?.message ??
    flow.review.error?.message;
  return (
    <>
      <button
        ref={trigger}
        className="button"
        disabled={!flow.recovery.ready || Boolean(flow.contextError)}
        onClick={() => {
          setOpen(true);
          setConfirmed(false);
          if (!pending && !freshReview) refresh();
        }}
      >
        {pending ? "Recover contact carry-over" : "Review contact carry-over"}
      </button>
      {flow.contextError && <p role="alert">{flow.contextError}</p>}
      {flow.recovery.error && (
        <div role="alert">
          <p>{flow.recovery.error}</p>
          <button className="button" onClick={flow.recovery.retry}>
            Retry contact recovery
          </button>
        </div>
      )}
      {open && (
        <Dialog
          open
          title={
            pending ? "Recover contact carry-over" : "Review contact carry-over"
          }
          description="Transfer only the contacts you explicitly review to the linked client. Source contacts stay on the prospect. Files and research stay unchanged."
          onOpenChange={(value) => {
            if (!busy) setOpen(value);
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <div className="stack">
            {error && <p role="alert">{error}</p>}
            {flow.contextError ? null : pending ? (
              <>
                <h3>Original transfer to {pending.clientName}</h3>
                <ul>
                  {pending.command.items.map((item, index) => (
                    <li key={item.sourceId}>
                      {pending.summary[index]!.name}:{" "}
                      {item.action === "create"
                        ? "Create new contact"
                        : item.action === "skip"
                          ? "Skip"
                          : `Link to ${pending.summary[index]!.targetName}`}
                    </li>
                  ))}
                </ul>
                {receipt ? (
                  <>
                    <p role="status">
                      {receipt.status === "completed"
                        ? "Core confirmed the reviewed contact transfer completed."
                        : receipt.refusal.message}
                    </p>
                    {receipt.status === "completed" && (
                      <Link
                        className="button"
                        href={`/portfolio/${receipt.clientId}`}
                      >
                        Open linked client
                      </Link>
                    )}
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        flow.action.mutate(
                          {
                            kind:
                              receipt.status === "completed"
                                ? "acknowledge"
                                : "retire-refusal",
                            expected: pending,
                          },
                          {
                            onSuccess: (outcome) => {
                              setConfirmed(false);
                              if (outcome.freshReview) {
                                setFreshReview(outcome.freshReview);
                                setDecisions(outcome.freshReview.decisions);
                              } else {
                                setOpen(false);
                                setDecisions([]);
                                setFreshReview(undefined);
                              }
                            },
                          },
                        )
                      }
                    >
                      {receipt.status === "completed"
                        ? "Acknowledge transfer result"
                        : "Review a new transfer after refusal"}
                    </button>
                  </>
                ) : (
                  <>
                    <p>
                      This original command is saved across reloads. A missing
                      receipt or an interrupted response does not establish
                      whether it completed.
                    </p>
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        flow.action.mutate({ kind: "check", expected: pending })
                      }
                    >
                      Check original transfer result
                    </button>
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        flow.action.mutate({ kind: "retry", expected: pending })
                      }
                    >
                      Retry the same reviewed transfer
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                {freshReview && (
                  <section
                    aria-label="Changes since the refused transfer"
                    className="stack"
                  >
                    <p>
                      Your previous choices are retained for a fresh review.
                      Confirm them again before submitting.
                    </p>
                    {freshReview.notices.map((notice, index) => (
                      <p role="status" key={`${notice.sourceId}:${index}`}>
                        {notice.message}
                      </p>
                    ))}
                  </section>
                )}
                {flow.review.isPending && (
                  <p role="status">
                    Loading current source and client contacts…
                  </p>
                )}
                {review && (
                  <TransferReview
                    review={review}
                    decisions={decisions}
                    disabled={busy}
                    onChange={(next) => {
                      setDecisions(next);
                      setConfirmed(false);
                    }}
                  />
                )}
                <button className="button" disabled={busy} onClick={refresh}>
                  Refresh contact review
                </button>
                {reviewError && <p role="alert">{reviewError}</p>}
                <label>
                  <input
                    type="checkbox"
                    checked={confirmed}
                    disabled={
                      busy ||
                      !review ||
                      !decisions.length ||
                      Boolean(reviewError)
                    }
                    onChange={(event) => setConfirmed(event.target.checked)}
                  />{" "}
                  I reviewed each selected create, link or skip decision.
                </label>
                <button
                  className="button primary"
                  disabled={
                    !flow.recovery.ready ||
                    busy ||
                    !review ||
                    !confirmed ||
                    !decisions.length ||
                    Boolean(reviewError)
                  }
                  onClick={() => {
                    if (review && confirmed)
                      flow.action.mutate({ kind: "submit", review, decisions });
                  }}
                >
                  Transfer reviewed contacts
                </button>
              </>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
