"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Panel,
  StatusPanel,
} from "../../../shared/module-ui";
import styles from "./engagement.module.css";
export function ReportView({ clientId }: { clientId: string }) {
  const [period, setPeriod] = useState<"all" | "current" | "previous">("all");
  const query = useCapiroQuery("engagement.report", {
    query: { clientId: clientId || undefined, period },
  });
  const data = query.data;
  return (
    <div className={styles.stack}>
      <div className={styles.tools}>
        <select
          className={styles.select}
          aria-label="Report period"
          value={period}
          onChange={(event) =>
            setPeriod(event.target.value as "all" | "current" | "previous")
          }
        >
          <option value="all">All time</option>
          <option value="current">Current cycle</option>
          <option value="previous">Previous cycle</option>
        </select>
        <ActionButton onClick={query.reload}>Refresh report</ActionButton>
      </div>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {data && (
          <>
            <div className={styles.stats}>
              {Object.entries(data.summary).map(([label, value]) => (
                <div key={label} className={styles.stat}>
                  <p>{label.replace(/([A-Z])/g, " $1")}</p>
                  <strong>{value}</strong>
                  <span>{data.cycle.label}</span>
                </div>
              ))}
            </div>
            <Panel
              title="Target offices"
              description="Prep, outreach and submissions by office and client."
            >
              <DataTable
                rows={data.rows}
                rowKey={(row) => `${row.officeKey}:${row.clientName}`}
                caption="Target office report"
                columns={[
                  {
                    key: "office",
                    label: "Office",
                    render: (row) => row.memberPrincipal,
                  },
                  {
                    key: "client",
                    label: "Client",
                    render: (row) => row.clientName ?? "Unassigned",
                  },
                  {
                    key: "prep",
                    label: "Preparation",
                    render: (row) => (
                      <Badge>{row.prepStatus.replaceAll("_", " ")}</Badge>
                    ),
                  },
                  {
                    key: "outreach",
                    label: "Outreach",
                    render: (row) => (
                      <Badge>{row.outreachStatus.replaceAll("_", " ")}</Badge>
                    ),
                  },
                  {
                    key: "submission",
                    label: "Submission",
                    render: (row) => (
                      <Badge>{row.submissionStatus.replaceAll("_", " ")}</Badge>
                    ),
                  },
                ]}
              />
            </Panel>
          </>
        )}
      </StatusPanel>
    </div>
  );
}
