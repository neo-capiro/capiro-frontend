"use client";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { DataTable, Panel, StatusPanel } from "../../../shared/module-ui";
import styles from "./research.module.css";
export function ResearchAnalytics({ id }: { id: string }) {
  const query = useCapiroQuery("research.analytics", { params: { id } });
  return (
    <Panel
      title="Analytics"
      description="Totals share fiscal year, funding stage, metric, unit and source basis. Different bases remain separate."
    >
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <DataTable
          rows={query.data?.totals || []}
          rowKey={(r) =>
            [
              r.basis.fundingFiscalYear,
              r.basis.stage,
              r.basis.metric,
              r.basis.unit,
              r.basis.requestEdition,
              r.basis.knownAt,
            ].join(":")
          }
          caption="Compatible research portfolio totals"
          columns={[
            {
              key: "fy",
              label: "Fiscal year",
              render: (r) => r.basis.fundingFiscalYear,
            },
            { key: "stage", label: "Stage", render: (r) => r.basis.stage },
            { key: "value", label: "Value", render: (r) => r.value },
            { key: "unit", label: "Unit", render: (r) => r.basis.unit },
            {
              key: "rows",
              label: "Contributions",
              render: (r) => r.contributionCount,
            },
            {
              key: "edition",
              label: "Request edition",
              render: (r) => r.basis.requestEdition || "Not stated",
            },
          ]}
        />
        <p className={styles.content}>
          {query.data?.coverage.supportedMembers ?? "—"} supported members ·{" "}
          {query.data?.coverage.unavailableMembers ?? "—"} unavailable members
        </p>
        {query.data?.limitations.map((l) => (
          <p key={l} className={styles.content}>
            {l}
          </p>
        ))}
      </StatusPanel>
    </Panel>
  );
}
