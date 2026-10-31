"use client";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";
import { ActionButton } from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";
import { DeliveryRunView } from "../delivery/DeliveryRunView";
export function ResearchReportReview({ selectionId }: { selectionId: string }) {
  const preview = useCapiroMutation("legiwatch.research.report.preview"),
    approve = useCapiroMutation("legiwatch.research.report.approve");
  const inspect = async () => {
    try {
      await preview.run({ body: { selectionId } });
    } catch {
      /* Review remains open. */
    }
  };
  const freeze = async () => {
    if (!preview.data) return;
    try {
      await approve.run({
        body: { selectionId, approvalHash: preview.data.approvalHash },
      });
    } catch {
      /* Changed output requires a new preview. */
    }
  };
  if (approve.data)
    return (
      <DeliveryRunView runId={approve.data.runId} onBack={approve.reset} />
    );
  return (
    <div className={styles.form}>
      <h3>Review research draft</h3>
      <p className={styles.description}>
        The backend checks the folder, client, session and exact edited output
        against the saved research sources.
      </p>
      <ActionButton
        disabled={preview.pending || approve.pending}
        onClick={() => void inspect()}
      >
        Preview exact edited output
      </ActionButton>
      {preview.data && (
        <>
          <pre className={styles.briefText}>{preview.data.rendered.text}</pre>
          <ActionButton
            primary
            disabled={approve.pending}
            onClick={() => void freeze()}
          >
            Approve this internal report version
          </ActionButton>
        </>
      )}
      {(preview.error || approve.error) && (
        <p role="alert">{(approve.error ?? preview.error)?.message}</p>
      )}
    </div>
  );
}
