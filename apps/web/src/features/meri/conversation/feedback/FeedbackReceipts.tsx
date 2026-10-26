import type { ConversationFeedbackReceipt } from "@capiro/meri-contracts/conversation-application";
import styles from "./feedback.module.css";
const label = {
  preference: "Preference",
  factual_correction: "Factual correction",
  recommendation: "Recommendation",
};
export function FeedbackReceipts({
  receipts,
}: {
  receipts: readonly ConversationFeedbackReceipt[];
}) {
  if (!receipts.length) return null;
  return (
    <section
      className={styles.receipts}
      aria-label="Saved feedback"
      aria-live="polite"
    >
      <h3>Saved feedback</h3>
      {receipts
        .slice(-3)
        .reverse()
        .map((receipt) => (
          <article key={receipt.feedbackId} className={styles.receipt}>
            <p>
              <strong>{label[receipt.signal.kind]}</strong> · Recorded · Not
              reviewed
            </p>
            <p>
              {receipt.signal.kind === "preference"
                ? `${receipt.signal.value === "helpful" ? "Helpful" : "Not helpful"}${receipt.signal.note ? ` · ${receipt.signal.note}` : ""}`
                : receipt.signal.kind === "factual_correction"
                  ? receipt.signal.proposedCorrection
                  : receipt.signal.recommendation}
            </p>
            <p className={styles.muted}>
              No correction or action has been applied by this feedback.
            </p>
            <details>
              <summary>Recorded context</summary>
              <dl>
                <dt>Output</dt>
                <dd>
                  {receipt.target.kind === "message"
                    ? "Saved answer revision"
                    : "Published file version"}
                </dd>
                <dt>Actual run models</dt>
                <dd>
                  {receipt.execution.status === "recorded"
                    ? `${receipt.execution.models.join(", ")} (including subagents)`
                    : "Unavailable in the saved run evidence"}
                </dd>
                <dt>Related source</dt>
                <dd>
                  {receipt.sourceRevision.status === "bound"
                    ? "Exact saved source revision"
                    : "Not applicable · no source selected"}
                </dd>
                <dt>Task revision</dt>
                <dd>Not applicable to this output</dd>
                <dt>Recorded</dt>
                <dd>{new Date(receipt.recordedAt).toLocaleString()}</dd>
                <dt>Feedback reference</dt>
                <dd>{receipt.feedbackId}</dd>
              </dl>
              {receipt.linkedReceipts.length > 0 && (
                <p>
                  Existing approval or checkpoint receipts are linked. Their
                  outcomes remain with the original action.
                </p>
              )}
            </details>
          </article>
        ))}
      {receipts.length > 3 && (
        <p className={styles.muted}>
          Showing the latest 3 of {receipts.length} recorded feedback entries.
        </p>
      )}
    </section>
  );
}
