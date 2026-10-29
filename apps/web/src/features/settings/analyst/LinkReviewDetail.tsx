"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import type {
  LinkReviewAttempt,
  LinkReviewKind,
} from "../../../shared/capiro/operations/settings-admin/analyst-links";
import { Badge, StatusPanel } from "../../../shared/module-ui";
import { SettingsButton, SettingsCard, SettingsNotice } from "../components";
import styles from "../styles";
import { LinkReviewEvidence } from "./LinkReviewEvidence";

export function LinkReviewDetail({
  kind,
  id,
  ready,
  submit,
}: {
  kind: LinkReviewKind;
  id: string;
  ready: boolean;
  submit: (attempt: LinkReviewAttempt) => Promise<void>;
}) {
  const detail = useCapiroQuery("settings.analyst.links.detail", {
    params: { kind, id },
  });
  const candidate = detail.data?.candidate;
  const [reason, setReason] = useState("");
  const editable =
    ready &&
    candidate &&
    ["candidate", "quarantined"].includes(candidate.reviewStatus);
  const decide = (decision: "accept" | "reject") => {
    if (!editable) return;
    void submit({
      kind,
      candidateId: id,
      command: {
        requestId: crypto.randomUUID(),
        expectedVersion: candidate.version,
        decision,
        reason: reason.trim(),
      },
    });
  };
  return (
    <SettingsCard
      title="Review source relationship"
      action={
        <SettingsButton onClick={detail.reload}>
          Refresh evidence
        </SettingsButton>
      }
    >
      <StatusPanel
        loading={detail.loading}
        error={detail.error}
        onRetry={detail.reload}
      >
        {candidate && (
          <>
            <Badge>{candidate.reviewStatus}</Badge>
            <LinkReviewEvidence candidate={candidate} />
            {detail.data?.lastReview && (
              <SettingsNotice
                title={"Last decision: " + detail.data.lastReview.status}
              >
                <p>
                  Reviewer: {detail.data.lastReview.reviewerId} ·{" "}
                  {detail.data.lastReview.decidedAt}
                </p>
                <p>{detail.data.lastReview.reason}</p>
              </SettingsNotice>
            )}
            {["candidate", "quarantined"].includes(candidate.reviewStatus) && (
              <>
                <label className={styles.field}>
                  <span>Decision reason</span>
                  <textarea
                    className={styles.input}
                    aria-label="Decision reason"
                    maxLength={4000}
                    disabled={!editable}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
                <p className={styles.description}>
                  This decision applies to the evidence version shown above.
                  Changed evidence requires another review.
                </p>
                <div className={styles.row}>
                  <SettingsButton
                    primary
                    disabled={!editable || !reason.trim()}
                    onClick={() => decide("accept")}
                  >
                    Accept relationship
                  </SettingsButton>
                  <SettingsButton
                    danger
                    disabled={!editable || !reason.trim()}
                    onClick={() => decide("reject")}
                  >
                    Reject relationship
                  </SettingsButton>
                </div>
              </>
            )}
          </>
        )}
      </StatusPanel>
    </SettingsCard>
  );
}
