"use client";
import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Panel,
  StatusPanel,
} from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";
import { ReportRunView } from "../reports/ReportRunView";
import { useLegiWatchRoute } from "../use-legiwatch-route";
export function WorkflowActionView({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const query = useCapiroQuery("legiwatch.workflow.action", { params: { id } }),
    execute = useCapiroMutation("legiwatch.workflow.execute"),
    pause = useCapiroMutation("legiwatch.workflow.pause");
  const [report, setReport] = useState<string>(),
    [confirmed, setConfirmed] = useState(false),
    route = useLegiWatchRoute();
  const pending = execute.pending || pause.pending,
    row = query.data;
  const run = async (action: "execute" | "pause") => {
    try {
      await (action === "execute" ? execute : pause).run({ params: { id } });
      setConfirmed(false);
      query.reload();
    } catch {
      query.reload();
    }
  };
  if (report)
    return <ReportRunView runId={report} onBack={() => setReport(undefined)} />;
  return (
    <div className={styles.form}>
      <ActionButton onClick={onBack}>Back to workflows</ActionButton>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {row && (
          <Panel
            title={row.template.replaceAll("_", " ")}
            actions={<Badge>{row.state}</Badge>}
          >
            <p>
              {row.input.jurisdiction} · {row.input.sessionKey} · Attempt{" "}
              {row.attempts} of 5
            </p>
            {row.reason && <p className={styles.gap}>{row.reason}</p>}
            <div className={styles.actions}>
              {row.steps.draftId && (
                <a
                  className={styles.link}
                  href={`/modules/workspace?draftId=${encodeURIComponent(row.steps.draftId)}`}
                >
                  Open private Workspace draft
                </a>
              )}
              {row.steps.reportRunId && (
                <ActionButton onClick={() => setReport(row.steps.reportRunId)}>
                  Open frozen report
                </ActionButton>
              )}
              {row.input.eventId && (
                <ActionButton
                  onClick={() =>
                    route.navigate({
                      lw: "hearings",
                      hearingId: row.input.eventId ?? null,
                      lwMore: null,
                    })
                  }
                >
                  Review source hearing
                </ActionButton>
              )}
            </div>
            <fieldset disabled={pending} className={styles.form}>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                Execute or resume this saved internal action against its
                reviewed source context.
              </label>
              <div className={styles.actions}>
                <ActionButton
                  disabled={
                    !confirmed ||
                    ![
                      "pending",
                      "partial",
                      "failed",
                      "held",
                      "running",
                    ].includes(row.state) ||
                    row.attempts >= 5
                  }
                  onClick={() => void run("execute")}
                >
                  Execute / retry action
                </ActionButton>
                <ActionButton
                  disabled={["paused", "complete"].includes(row.state)}
                  onClick={() => void run("pause")}
                >
                  Pause action
                </ActionButton>
                <ActionButton onClick={query.reload}>
                  Refresh action
                </ActionButton>
              </div>
            </fieldset>
          </Panel>
        )}
      </StatusPanel>
      {(execute.error || pause.error) && (
        <p role="alert">{(execute.error ?? pause.error)?.message}</p>
      )}
    </div>
  );
}
