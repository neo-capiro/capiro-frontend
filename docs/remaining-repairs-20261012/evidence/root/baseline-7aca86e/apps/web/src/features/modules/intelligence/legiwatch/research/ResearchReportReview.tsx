"use client";
import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import { ActionButton, StatusPanel } from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
import { ReportRunView } from "../reports/ReportRunView";
export function ResearchReportReview({ selectionId }: { selectionId: string }) {
  const [runId, setRun] = useState("");
  const history = useCapiroQuery("legiwatch.report.history", {}),
    preview = useCapiroMutation("legiwatch.research.report.preview"),
    approve = useCapiroMutation("legiwatch.research.report.approve");
  const inspect = async () => {
    try {
      await preview.run({ body: { selectionId, runId } });
    } catch {
      /* Review remains open. */
    }
  };
  const freeze = async () => {
    if (!preview.data) return;
    try {
      await approve.run({
        body: { selectionId, runId, approvalHash: preview.data.approvalHash },
      });
    } catch {
      /* Changed output requires a new preview. */
    }
  };
  if (approve.data)
    return <ReportRunView runId={approve.data.runId} onBack={approve.reset} />;
  return (
    <div className={styles.form}>
      <h3>Review with an internal report</h3>
      <p className={styles.description}>
        The backend checks the folder, client, session and exact edited output
        against the selected base report.
      </p>
      <StatusPanel
        loading={history.loading}
        error={history.error}
        onRetry={history.reload}
      >
        <fieldset disabled={preview.pending || approve.pending}>
          <SelectField
            id="research-base-report"
            label="Frozen internal report"
            value={runId}
            onChange={(value) => {
              setRun(value);
              preview.reset();
              approve.reset();
            }}
          >
            <option value="">Choose an internal report run</option>
            {history.data
              ?.filter((run) => run.audience === "internal")
              .map((run) => (
                <option key={run.id} value={run.id}>
                  {run.reportId} · {run.cutoff} · Version{" "}
                  {run.definitionVersion}
                </option>
              ))}
          </SelectField>
        </fieldset>
      </StatusPanel>
      <ActionButton
        disabled={!runId || preview.pending || approve.pending}
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
