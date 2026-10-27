"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import type { ResearchAnalyticsProjection } from "../../../shared/capiro/operations/research-schemas";
import {
  ActionButton,
  DataTable,
  Panel,
  StatusPanel,
} from "../../../shared/module-ui";
import {
  ResearchContributions,
  researchBasisKey,
  researchBasisLabel,
} from "./ResearchContributions";
import styles from "./research.module.css";
export function ResearchAnalytics({ id }: { id: string }) {
  const query = useCapiroQuery("research.analytics", { params: { id } });
  const data = query.data?.portfolioId === id ? query.data : undefined;
  return (
    <Panel
      title="Analytics"
      description="Totals share fiscal year, funding stage, metric, unit and source basis. Different bases remain separate."
    >
      <StatusPanel
        loading={query.loading}
        error={
          query.error ||
          (query.data && !data
            ? "These analytics do not match the selected portfolio."
            : undefined)
        }
        onRetry={query.reload}
      >
        {data && (
          <AnalyticsProjection
            key={`${id}:${data.portfolioRevision}`}
            data={data}
          />
        )}
      </StatusPanel>
    </Panel>
  );
}
function AnalyticsProjection({ data }: { data: ResearchAnalyticsProjection }) {
  const [basisFilter, setBasisFilter] = useState("");
  return (
    <>
      <p className={styles.content}>
        Revision {data.portfolioRevision} · {data.availability} ·{" "}
        {data.calculationVersion} · Observed {data.observedAt} · Read{" "}
        {data.readAt}
      </p>
      <DataTable
        rows={data.totals}
        rowKey={(r) => researchBasisKey(r.basis)}
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
          {
            key: "basis",
            label: "Full basis",
            render: (r) => researchBasisLabel(r.basis),
          },
          {
            key: "drilldown",
            label: "Details",
            render: (r) => (
              <ActionButton
                onClick={() => setBasisFilter(researchBasisKey(r.basis))}
              >
                Show contributions for {researchBasisLabel(r.basis)}
              </ActionButton>
            ),
          },
        ]}
      />
      <p className={styles.content}>
        {data.coverage.supportedMembers} supported of{" "}
        {data.coverage.eligibleMembers} eligible members ·{" "}
        {data.coverage.unavailableMembers} unavailable members ·{" "}
        {data.coverage.includedContributions} included ·{" "}
        {data.coverage.excludedContributions} excluded ·{" "}
        {data.coverage.overlapContributions} overlap contributions
      </p>
      {data.limitations.map((l) => (
        <p key={l} className={styles.content}>
          {l}
        </p>
      ))}
      <ResearchContributions
        projection={data}
        basisFilter={basisFilter}
        onBasisFilter={setBasisFilter}
      />
    </>
  );
}
