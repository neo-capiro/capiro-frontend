"use client";

import { useState } from "react";
import { MeriPageHeading } from "../ui/MeriPageHeading";
import { Notice } from "../ui/Notice";
import ui from "../ui/meri-ui.module.css";
import { ownerCandidateTitle, type OwnerMemoryCandidate } from "./owner-review";
import { useOwnerMemoryInbox, type OwnerDecision } from "./useOwnerMemoryInbox";
import styles from "./owner-review.module.css";

/** Core is the current-memory owner. A failed Core read never looks like zero reviews. */
export function MemoryOwnerInbox({ enabled }: { enabled: boolean }) {
  const {
    inbox,
    feedback,
    working,
    loadingMore,
    loadMoreError,
    verifying,
    holdStatus,
    uncertainIds,
    refresh,
    loadMore,
    verifyUncertain,
    decide,
  } = useOwnerMemoryInbox(enabled);
  const [confirm, setConfirm] = useState<{
    id: string;
    decision: OwnerDecision;
  } | null>(null);
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Personal memory review"
        description="Decide your own pending personal memory submissions. Core checks current ownership for every decision."
        action={
          <button
            className={ui.outline}
            type="button"
            disabled={!enabled || working !== null || inbox.state === "loading"}
            onClick={() => {
              setConfirm(null);
              refresh();
            }}
          >
            Refresh
          </button>
        }
      />
      {!enabled ? (
        <Notice title="Memory review unavailable">
          The governed owner review connection is not enabled for this
          workspace.
        </Notice>
      ) : (
        <>
          {holdStatus === "unavailable" ? (
            <Notice tone="danger" title="Review actions paused">
              This browser cannot preserve an uncertain decision across reloads.
              Decisions are held here until recovery storage is available.
            </Notice>
          ) : null}
          {feedback ? (
            <p role="status" className={styles.feedback}>
              {feedback}
            </p>
          ) : null}
          {uncertainIds.size > 0 ? (
            <Notice tone="danger" title="Decision outcome needs verification">
              {uncertainIds.size} personal memory
              {uncertainIds.size === 1 ? " decision is" : " decisions are"} held
              until Core confirms a terminal outcome. A pending list cannot
              establish the result.
              <div className={ui.row}>
                <button
                  className={ui.outline}
                  type="button"
                  disabled={verifying || holdStatus !== "ready"}
                  onClick={() => void verifyUncertain()}
                >
                  {verifying
                    ? "Checking outcomes…"
                    : "Verify outcomes with Core"}
                </button>
              </div>
            </Notice>
          ) : null}
          {inbox.state === "loading" ? (
            <p role="status">Checking current memory proposals…</p>
          ) : inbox.state === "error" ? (
            <Notice tone="danger" title="Memory reviews unavailable">
              {inbox.message}
            </Notice>
          ) : inbox.candidates.length === 0 && !inbox.nextCursor ? (
            <Notice title="No reviewable proposals returned">
              Core returned no pending personal memory proposals.
            </Notice>
          ) : (
            <section
              aria-label="Pending personal memory proposals"
              className={styles.list}
            >
              <p role="status" className={ui.muted}>
                {inbox.candidates.length} pending personal
                {inbox.candidates.length === 1
                  ? " proposal"
                  : " proposals"}{" "}
                loaded{inbox.nextCursor ? "; more are available." : "."}
              </p>
              {inbox.candidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  busy={working !== null || holdStatus !== "ready"}
                  uncertain={uncertainIds.has(candidate.id)}
                  confirmation={
                    confirm?.id === candidate.id ? confirm.decision : null
                  }
                  onChoose={(decision) =>
                    setConfirm({ id: candidate.id, decision })
                  }
                  onCancel={() => setConfirm(null)}
                  onConfirm={(decision, reason) => {
                    setConfirm(null);
                    void decide(candidate, decision, reason);
                  }}
                />
              ))}
              {loadMoreError ? (
                <Notice tone="danger" title="More reviews unavailable">
                  {loadMoreError}
                </Notice>
              ) : null}
              {inbox.nextCursor ? (
                <button
                  className={ui.outline}
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  {loadingMore
                    ? "Checking more proposals…"
                    : "Show more proposals"}
                </button>
              ) : null}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function CandidateCard({
  candidate,
  busy,
  uncertain,
  confirmation,
  onChoose,
  onCancel,
  onConfirm,
}: {
  candidate: OwnerMemoryCandidate;
  busy: boolean;
  uncertain: boolean;
  confirmation: OwnerDecision | null;
  onChoose: (decision: OwnerDecision) => void;
  onCancel: () => void;
  onConfirm: (decision: OwnerDecision, reason?: string) => void;
}) {
  const [reason, setReason] = useState("");
  const needsReason =
    candidate.kind !== "addition" && confirmation === "reject";
  return (
    <article className={styles.card} id={`memory-candidate-${candidate.id}`}>
      <div className={styles.cardHeading}>
        <h2>{ownerCandidateTitle(candidate)}</h2>
        <span className={styles.kind}>{candidate.kind}</span>
      </div>
      <p className={styles.value}>{candidate.value}</p>
      <p className={ui.muted}>
        {candidate.sourceType === "meri"
          ? "Submitted through Meri"
          : "Personal memory proposal"}
        {" · "}
        {new Date(candidate.createdAt).toLocaleString()}
      </p>
      {candidate.kind !== "addition" ? (
        <p className={styles.versionNotice}>
          This {candidate.kind} uses Core&apos;s governed immutable version
          decision. A contradiction may leave a conflict for further review.
        </p>
      ) : null}
      {uncertain ? (
        <p className={styles.versionNotice} role="status">
          This decision may already have committed. Actions are paused until its
          outcome is verified.
        </p>
      ) : confirmation ? (
        <div
          className={styles.confirm}
          role="group"
          aria-label={`Confirm ${confirmation} decision`}
        >
          <p>
            Confirm {confirmation === "approve" ? "approval" : "rejection"} of
            this personal memory?
          </p>
          {needsReason ? (
            <label>
              Rejection reason (required)
              <textarea
                className={styles.reason}
                value={reason}
                maxLength={1_000}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          ) : null}
          <div className={ui.row}>
            <button
              className={ui.primary}
              type="button"
              disabled={busy || (needsReason && !reason.trim())}
              onClick={() =>
                onConfirm(confirmation, needsReason ? reason.trim() : undefined)
              }
            >
              Confirm {confirmation}
            </button>
            <button
              className={ui.outline}
              type="button"
              onClick={() => {
                setReason("");
                onCancel();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className={ui.row}>
          <button
            className={ui.primary}
            type="button"
            disabled={busy}
            onClick={() => onChoose("approve")}
          >
            Approve
          </button>
          <button
            className={ui.outline}
            type="button"
            disabled={busy}
            onClick={() => {
              setReason("");
              onChoose("reject");
            }}
          >
            Reject
          </button>
        </div>
      )}
    </article>
  );
}
