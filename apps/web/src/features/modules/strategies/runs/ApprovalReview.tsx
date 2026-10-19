"use client";

import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Modal,
  Panel,
  StatusPanel,
} from "../../../../shared/module-ui";
import styles from "./runs.module.css";

export function ApprovalReview({
  id,
  open,
  onClose,
  onApproved,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  onApproved: () => void;
}) {
  const query = useCapiroQuery(
    "strategies.run.approval",
    { params: { id } },
    { enabled: open },
  );
  const approve = useCapiroMutation("strategies.run.approve");
  const [accepted, setAccepted] = useState(false);
  const [receipt, setReceipt] = useState<string>();
  const content = query.data;
  async function record() {
    if (!content || !accepted) return;
    try {
      const result = await approve.run({
        params: { id },
        body: { contentHash: content.contentHash },
      });
      if (!result.approvalValid || result.contentHash !== content.contentHash) {
        query.reload();
        setAccepted(false);
        return;
      }
      setReceipt(
        "Approval recorded for this exact content. Execution remains a separate action.",
      );
      onApproved();
      query.reload();
      setAccepted(false);
    } catch {
      /* A changed payload returns a conflict; preserve the reviewed text and hash. */
    }
  }
  return (
    <Modal
      open={open}
      onOpenChange={(value) => {
        if (!value && !approve.pending) onClose();
      }}
      title="Review exact content"
      description="Approval is recorded against the content hash displayed here."
      side="right"
      footer={
        <>
          <ActionButton disabled={approve.pending} onClick={onClose}>
            Close review
          </ActionButton>
          <ActionButton
            primary
            disabled={
              !content ||
              !accepted ||
              approve.pending ||
              (content.action === "send" && !content.sendEnabled)
            }
            onClick={record}
          >
            {approve.pending
              ? "Recording…"
              : content?.action === "send"
                ? "Record send approval"
                : "Record staging approval"}
          </ActionButton>
        </>
      }
    >
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={() => {
          setAccepted(false);
          query.reload();
        }}
      >
        {content && (
          <div className={styles.stack}>
            <div className={styles.actions}>
              <Badge tone={content.action === "send" ? "warning" : "neutral"}>
                {content.effect}
              </Badge>
              <Badge tone={content.approvalValid ? "success" : "neutral"}>
                {content.approvalValid
                  ? "Recorded approval is valid"
                  : "Current content needs review"}
              </Badge>
            </div>
            {content.action === "send" && !content.sendEnabled && (
              <p className={styles.warning}>
                External sending is disabled for this run. Review the Outreach
                record in its destination workflow.
              </p>
            )}
            {content.approvalInvalidReason && (
              <p className={styles.warning}>
                Earlier approval is invalid: {content.approvalInvalidReason}.
                Changed fields:{" "}
                {content.changedFields.join(", ") || "not listed"}.
              </p>
            )}
            <dl className={styles.audit}>
              <div>
                <dt>Channel</dt>
                <dd>{content.binding.channel}</dd>
              </div>
              <div>
                <dt>Plan version</dt>
                <dd>{content.binding.strategyVersionId ?? "Not recorded"}</dd>
              </div>
              <div>
                <dt>Recipients</dt>
                <dd>
                  {content.binding.recipients.length
                    ? content.binding.recipients.map((person, index) => (
                        <span
                          className={styles.recipient}
                          key={person.id ?? index}
                        >
                          {person.name ||
                            person.address ||
                            person.id ||
                            "Unresolved recipient"}
                          {person.name &&
                            person.address &&
                            ` · ${person.address}`}
                        </span>
                      ))
                    : "No recipients bound to this action"}
                </dd>
              </div>
              <div>
                <dt>Subject</dt>
                <dd>
                  {content.binding.subject || "No subject bound to this action"}
                </dd>
              </div>
            </dl>
            <Panel
              title={
                content.action === "stage"
                  ? "Staging content"
                  : "Exact message body"
              }
            >
              <div className={styles.body}>
                {content.binding.body ||
                  (content.action === "stage"
                    ? "The staging approval binds the task and destination. Generated content will be reviewed in its destination workflow."
                    : "No message body available.")}
              </div>
            </Panel>
            <Panel title="Source readiness">
              <dl className={styles.audit}>
                <div>
                  <dt>Grounding status</dt>
                  <dd>{content.warnings.groundingStatus ?? "Not reported"}</dd>
                </div>
                <div>
                  <dt>Grounded content</dt>
                  <dd>
                    {content.binding.grounded
                      ? "Yes"
                      : content.action === "stage"
                        ? "Content is generated after staging"
                        : "No"}
                  </dd>
                </div>
                <div>
                  <dt>Model</dt>
                  <dd>{content.binding.model ?? "Not recorded"}</dd>
                </div>
              </dl>
              {content.warnings.fallbackContent && (
                <p className={styles.warning}>Fallback content is present.</p>
              )}
              {content.warnings.versionDrift && (
                <p className={styles.warning}>
                  The pinned plan version differs from the current version.
                </p>
              )}
              {content.warnings.changedSinceReview && (
                <p className={styles.warning}>
                  The payload changed since the earlier review.
                </p>
              )}
              {content.warnings.missingRequiredContext.length > 0 && (
                <p className={styles.warning}>
                  Missing required context:{" "}
                  {content.warnings.missingRequiredContext.join(", ")}.
                </p>
              )}
            </Panel>
            <div>
              <strong>Content hash</strong>
              <code className={styles.hash}>{content.contentHash}</code>
            </div>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              I reviewed this content, destination and source readiness.
            </label>
            {receipt && <p role="status">{receipt}</p>}
          </div>
        )}
      </StatusPanel>
      {approve.error && (
        <div role="alert" className={styles.error}>
          <p>{approve.error.message}</p>
          <ActionButton
            onClick={() => {
              setAccepted(false);
              setReceipt(undefined);
              approve.reset();
              query.reload();
            }}
          >
            Reload current content
          </ActionButton>
        </div>
      )}
    </Modal>
  );
}
