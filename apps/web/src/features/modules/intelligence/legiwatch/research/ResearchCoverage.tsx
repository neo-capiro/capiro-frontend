"use client";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import { Badge, Panel, StatusPanel } from "../../../../../shared/module-ui";
import type { EvidenceScope } from "../sources/EvidenceActions";
import styles from "../legiwatch.module.css";
export function ResearchCoverage({ scope }: { scope: EvidenceScope }) {
  const query = useCapiroQuery("legiwatch.research.coverage", {
    query: { ...scope, jurisdiction: "FL" },
  });
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
    >
      <div className={styles.form}>
        <p className={styles.banner}>
          Receipts describe their retained source scope. A complete receipt does
          not establish complete statewide legislative coverage.
        </p>
        {query.data?.receipts.length === 0 && (
          <p>No retained coverage receipts are available.</p>
        )}
        {query.data?.receipts.map((receipt) => (
          <Panel
            key={receipt.id}
            title={receipt.source}
            description={receipt.observed_at}
          >
            <Badge>
              {receipt.complete ? "Receipt complete" : "Partial receipt"}
            </Badge>
            <p>
              {receipt.manifest.reason ??
                receipt.manifest.status ??
                "Scope recorded by the source service."}
            </p>
            {receipt.manifest.coverage && <p>{receipt.manifest.coverage}</p>}
          </Panel>
        ))}
      </div>
    </StatusPanel>
  );
}
