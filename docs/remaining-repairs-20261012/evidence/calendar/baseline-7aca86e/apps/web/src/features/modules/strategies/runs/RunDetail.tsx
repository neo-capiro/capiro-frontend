"use client";
import Link from "next/link";

import { useState } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Panel,
  StatusPanel,
} from "../../../../shared/module-ui";
import { ApprovalReview } from "./ApprovalReview";
import { RunActions } from "./RunActions";
import {
  destination,
  runTitle,
  runTone,
  stateLabel,
  taskLabel,
  timestamp,
} from "./run-model";
import styles from "./runs.module.css";

export function RunDetail({
  id,
  strategyTitle,
  onOpen,
  onBack,
}: {
  id: string;
  strategyTitle: (id: string | null) => string;
  onOpen: (id: string) => void;
  onBack: () => void;
}) {
  const query = useCapiroQuery("strategies.run", { params: { id } });
  const policy = useCapiroQuery("strategies.run.policy", { params: { id } });
  const [review, setReview] = useState(false);
  const run = query.data;
  const reload = () => {
    query.reload();
    policy.reload();
  };
  const outputs = Object.entries(run?.findings?.results ?? {}).map(
    ([task, result]) => ({ task, ...result }),
  );
  return (
    <div className={styles.stack} data-design-node="856:162285">
      <div className={styles.toolbar}>
        <ActionButton onClick={onBack}>Back to execution runs</ActionButton>
        <ActionButton onClick={reload}>Refresh run</ActionButton>
      </div>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {run && (
          <>
            <header className={styles.heading}>
              <h2>{runTitle(run)}</h2>
              <p>
                {strategyTitle(run.strategyId)} · {stateLabel(run.trigger)} run
                · Attempt {run.attempt}
              </p>
            </header>
            <section
              className={`${styles.state} ${run.state.startsWith("failed") ? styles.failed : run.state === "waiting_for_input" ? styles.blocked : ""}`}
              aria-label="Run status"
            >
              <Badge tone={runTone(run.state)}>{stateLabel(run.state)}</Badge>
              <p>
                {run.waitingReason ||
                  run.error ||
                  policy.data?.reason ||
                  "Loading the current run policy…"}
              </p>
            </section>
            <Panel title="Execution plan">
              <DataTable
                rows={run.findings?.tasks ?? []}
                rowKey={(task) => `${task.nodeId}:${task.type}`}
                caption="Run execution plan"
                emptyMessage="No reviewed task plan is recorded for this run."
                columns={[
                  {
                    key: "task",
                    label: "Task",
                    render: (task) => (
                      <>
                        <strong>
                          {task.detail?.title ||
                            task.detail?.label ||
                            taskLabel(task.type)}
                        </strong>
                        <small className={styles.meta}>
                          {taskLabel(task.type)}
                        </small>
                      </>
                    ),
                  },
                  {
                    key: "destination",
                    label: "Destination",
                    render: (task) => destination(task.type),
                  },
                  {
                    key: "state",
                    label: "State",
                    render: (task) => {
                      const result =
                        run.findings?.results?.[
                          `${task.type}:${task.nodeId}`
                        ] ?? run.findings?.results?.[task.nodeId];
                      return result?.status
                        ? stateLabel(result.status)
                        : run.state === "ready_for_review" ||
                            run.state === "approved"
                          ? "Planned"
                          : "No task result recorded";
                    },
                  },
                ]}
              />
            </Panel>
            <Panel title="Readiness and audit">
              <dl className={styles.audit}>
                <div>
                  <dt>Plan version</dt>
                  <dd>
                    {run.findings?.execution?.pinnedVersionId ??
                      "No pinned version recorded"}
                  </dd>
                </div>
                <div>
                  <dt>Trigger</dt>
                  <dd>
                    {stateLabel(run.trigger)} · {timestamp(run.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt>Started / finished</dt>
                  <dd>
                    {timestamp(run.startedAt)} / {timestamp(run.finishedAt)}
                  </dd>
                </div>
                <div>
                  <dt>Last heartbeat</dt>
                  <dd>
                    {timestamp(policy.data?.heartbeatAt ?? run.heartbeatAt)}
                  </dd>
                </div>
                <div>
                  <dt>Inactivity threshold</dt>
                  <dd>
                    {policy.data
                      ? policy.data.timeoutMinutes === null
                        ? "No inactivity timeout for this state"
                        : `${policy.data.timeoutMinutes} minutes`
                      : "Not available"}
                  </dd>
                </div>
                <div>
                  <dt>Run ID</dt>
                  <dd>{run.id}</dd>
                </div>
                {run.retryOfRunId && (
                  <div>
                    <dt>Earlier attempt</dt>
                    <dd>
                      <button
                        className={styles.link}
                        onClick={() => onOpen(run.retryOfRunId!)}
                      >
                        Open {run.retryOfRunId}
                      </button>
                    </dd>
                  </div>
                )}
                {run.supersededByRunId && (
                  <div>
                    <dt>Later attempt</dt>
                    <dd>
                      <button
                        className={styles.link}
                        onClick={() => onOpen(run.supersededByRunId!)}
                      >
                        Open {run.supersededByRunId}
                      </button>
                    </dd>
                  </div>
                )}
              </dl>
              {run.findings?.findings?.map((finding, index) => (
                <div
                  key={`${finding.code}:${index}`}
                  className={styles.finding}
                >
                  <Badge
                    tone={
                      finding.severity === "error" ||
                      finding.severity === "critical"
                        ? "danger"
                        : "warning"
                    }
                  >
                    {finding.severity}
                  </Badge>
                  <strong>{finding.title || finding.code}</strong>
                  <p>{finding.message}</p>
                  {finding.impact && <p>{finding.impact}</p>}
                  {finding.suggestion && <p>{finding.suggestion}</p>}
                </div>
              ))}
            </Panel>
            {outputs.length > 0 && (
              <Panel title="Staged outputs">
                <DataTable
                  rows={outputs}
                  rowKey={(output) => output.task}
                  caption="Run output references"
                  columns={[
                    {
                      key: "kind",
                      label: "Output",
                      render: (output) =>
                        output.kind ? stateLabel(output.kind) : output.task,
                    },
                    {
                      key: "state",
                      label: "Status",
                      render: (output) =>
                        output.status
                          ? stateLabel(output.status)
                          : "Not recorded",
                    },
                    {
                      key: "reference",
                      label: "Artifact reference",
                      render: (output) => output.artifactRef ?? "Not linked",
                    },
                  ]}
                />
                <div className={styles.actions}>
                  {run.findings?.execution?.kind === "workspace" && (
                    <Link className={styles.anchor} href="/modules/workspace">
                      Open Workspace
                    </Link>
                  )}
                  {run.findings?.execution?.kind === "outreach" && (
                    <Link
                      className={styles.anchor}
                      href="/modules/engagement?view=outreach"
                    >
                      Open Outreach
                    </Link>
                  )}
                </div>
              </Panel>
            )}
            <StatusPanel
              loading={policy.loading}
              error={policy.error}
              onRetry={policy.reload}
            >
              {policy.data && (
                <RunActions
                  run={run}
                  policy={policy.data}
                  onReview={() => setReview(true)}
                  onUpdated={(updated) => {
                    if (updated.id !== run.id) onOpen(updated.id);
                    else reload();
                  }}
                />
              )}
            </StatusPanel>
            {review && (
              <ApprovalReview
                id={id}
                open={review}
                onClose={() => setReview(false)}
                onApproved={reload}
              />
            )}
          </>
        )}
      </StatusPanel>
    </div>
  );
}
