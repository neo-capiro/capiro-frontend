"use client";
import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Panel,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
import { ReportRunView } from "../reports/ReportRunView";

export function BriefingReview({
  selectionId,
  folderId,
}: {
  selectionId: string;
  folderId?: string;
}) {
  const reports = useCapiroQuery("legiwatch.reports", {});
  const [reportId, setReport] = useState(""),
    [audience, setAudience] = useState<"internal" | "external">("internal"),
    [acceptSourceGaps, setAcceptGaps] = useState(false);
  const preview = useCapiroMutation("legiwatch.briefing.preview"),
    approve = useCapiroMutation("legiwatch.briefing.approve");
  const body = { selectionId, reportId, audience, acceptSourceGaps },
    pending = preview.pending || approve.pending;
  const reset = () => {
    preview.reset();
    approve.reset();
  };
  const review = async () => {
    try {
      await preview.run({ body });
    } catch {
      /* Retain the review fields. */
    }
  };
  const freeze = async () => {
    if (!preview.data) return;
    try {
      await approve.run({
        body: { ...body, approvalHash: preview.data.approvalHash },
      });
    } catch {
      /* The service rejects changed output or scope. */
    }
  };
  if (approve.data)
    return <ReportRunView runId={approve.data.runId} onBack={reset} />;
  return (
    <Panel
      title="Review edited Workspace output"
      description="Saving a draft does not authorize delivery. Review the current edited output before creating a frozen report run."
    >
      <div className={styles.form}>
        {!folderId && (
          <p className={styles.banner}>
            Choose a permitted folder before preparing an edition for report
            distribution.
          </p>
        )}
        <StatusPanel
          loading={reports.loading}
          error={reports.error}
          onRetry={reports.reload}
        >
          <fieldset disabled={pending} className={styles.form}>
            <SelectField
              id="briefing-report"
              label="Report for the selected folder"
              value={reportId}
              onChange={(value) => {
                reset();
                setReport(value);
              }}
            >
              <option value="">Choose a report</option>
              {reports.data
                ?.filter(
                  (report) =>
                    report.canEdit !== false &&
                    report.folderIds.length === 1 &&
                    report.folderIds[0] === folderId,
                )
                .map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.name}
                  </option>
                ))}
            </SelectField>
            <SelectField
              id="briefing-audience"
              label="Audience"
              value={audience}
              onChange={(value) => {
                if (value === "internal" || value === "external") {
                  reset();
                  setAudience(value);
                }
              }}
            >
              <option value="internal">Internal review only</option>
              <option value="external">External distribution review</option>
            </SelectField>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={acceptSourceGaps}
                onChange={(event) => {
                  reset();
                  setAcceptGaps(event.target.checked);
                }}
              />
              I reviewed the retained-source gaps for this audience.
            </label>
          </fieldset>
        </StatusPanel>
        <div className={styles.actions}>
          <ActionButton
            disabled={pending || !reportId || !folderId}
            onClick={() => void review()}
          >
            Preview current edition
          </ActionButton>
          <ActionButton
            primary
            disabled={pending || !preview.data}
            onClick={() => void freeze()}
          >
            Approve this exact edition
          </ActionButton>
        </div>
        {preview.data && (
          <>
            <p className={styles.description}>
              {preview.data.deliveryState.replaceAll("_", " ")} · Definition{" "}
              {preview.data.definitionVersion}
            </p>
            <pre className={styles.briefText}>{preview.data.rendered.text}</pre>
          </>
        )}
        {(preview.error || approve.error) && (
          <p className={styles.error} role="alert">
            {preview.error?.message || approve.error?.message}
          </p>
        )}
      </div>
    </Panel>
  );
}
