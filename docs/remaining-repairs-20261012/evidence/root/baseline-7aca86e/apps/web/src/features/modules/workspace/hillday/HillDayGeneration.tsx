"use client";

import { useEffect, useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Panel,
  StatusPanel,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";

export function HillDayGeneration({
  id,
  onOpen,
}: {
  id: string;
  onOpen: () => void;
}) {
  const [jobId, setJobId] = useState("");
  const start = useCapiroMutation("workspace.hillday.generate");
  const job = useCapiroQuery(
    "workspace.hillday.job",
    { params: { id, jobId } },
    { enabled: Boolean(jobId) },
  );
  const active =
    job.data?.status === "queued" || job.data?.status === "running";
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(job.reload, 2500);
    return () => clearTimeout(timer);
  }, [active, job.data, job.reload]);
  async function generate() {
    try {
      const result = await start.run({ params: { id } });
      setJobId(result.jobId);
    } catch {
      /* Service failures remain visible. */
    }
  }
  return (
    <div className={styles.form}>
      <Panel
        title={
          active
            ? "Building your packet"
            : job.data?.status === "complete"
              ? "Your packet is ready"
              : "Ready to generate"
        }
        description="Workspace creates a section for each selected meeting and keeps source gaps visible."
      >
        <div className={styles.actions}>
          <ActionButton
            primary
            disabled={start.pending || active}
            onClick={generate}
          >
            {start.pending
              ? "Starting…"
              : job.data?.status === "failed"
                ? "Try generation again"
                : "Generate packet"}
          </ActionButton>
          {jobId && (
            <ActionButton onClick={job.reload}>Refresh progress</ActionButton>
          )}
          {job.data?.status === "complete" && (
            <ActionButton primary onClick={onOpen}>
              Open document →
            </ActionButton>
          )}
        </div>
        {start.error && (
          <p role="alert" className={styles.error}>
            {start.error.message}
          </p>
        )}
      </Panel>
      {jobId && (
        <StatusPanel
          loading={job.loading && !job.data}
          error={job.error}
          onRetry={job.reload}
        >
          {job.data && (
            <>
              <p
                className={
                  job.data.status === "failed" ? styles.notice : styles.success
                }
              >
                {job.data.status}
                {job.data.quality !== null
                  ? ` · Quality ${job.data.quality}%`
                  : ""}
                {job.data.error ? ` · ${job.data.error}` : ""}
              </p>
              <DataTable
                rows={job.data.units}
                rowKey={(row) => row.meetingId}
                caption="Generation progress by meeting"
                columns={[
                  {
                    key: "meeting",
                    label: "MEETING",
                    render: (row) => row.meetingId,
                  },
                  {
                    key: "status",
                    label: "STATE",
                    render: (row) => (
                      <Badge
                        tone={
                          row.state === "done"
                            ? "success"
                            : row.state === "failed"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {row.state}
                      </Badge>
                    ),
                  },
                  {
                    key: "reason",
                    label: "DETAIL",
                    render: (row) => row.reason ?? "—",
                  },
                ]}
              />
            </>
          )}
        </StatusPanel>
      )}
    </div>
  );
}
