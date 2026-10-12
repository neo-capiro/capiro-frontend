"use client";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { DataTable, Panel, StatusPanel } from "../../../shared/module-ui";
import styles from "./intelligence.module.css";
export function ProgramBills({ peCode }: { peCode: string }) {
  const query = useCapiroQuery("intelligence.defense.bills", {
    params: { peCode },
  });
  return (
    <Panel
      title="Relevant bills"
      description="Bills that name or fund this line"
    >
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <DataTable
          rows={query.data || []}
          rowKey={(r) => r.id}
          caption="Bills linked to this program element"
          columns={[
            {
              key: "bill",
              label: "Bill",
              render: (r) => (
                <>
                  {r.billType.toUpperCase()} {r.billNumber} · {r.title}
                </>
              ),
            },
            {
              key: "package",
              label: "Budget vehicle",
              render: (r) =>
                r.budgetPackage
                  ? `${r.budgetPackage.name} · ${r.budgetPackage.track}`
                  : "Not a mapped budget vehicle",
            },
            {
              key: "action",
              label: "Latest action",
              render: (r) => r.latestActionText || "Not stated",
            },
            {
              key: "source",
              label: "Source",
              render: (r) =>
                r.url && /^https?:\/\//.test(r.url) ? (
                  <a href={r.url} target="_blank" rel="noreferrer">
                    Official bill ↗
                  </a>
                ) : (
                  "Unavailable"
                ),
            },
          ]}
        />
      </StatusPanel>
    </Panel>
  );
}
export function ProgramStructure({ peCode }: { peCode: string }) {
  const query = useCapiroQuery("intelligence.defense.projects", {
    params: { peCode },
  });
  return (
    <Panel title="Program structure">
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data?.map((p) => (
          <div key={p.id} className={styles.content}>
            <strong>
              {p.projectCode} · {p.title}
            </strong>
            <p>{p.mission || "Mission not provided"}</p>
            <span className={styles.muted}>
              {p.fy ? `FY${p.fy}` : "Fiscal year not provided"}
              {p.pageNumber != null ? ` · Page ${p.pageNumber}` : ""}
            </span>
            {p.sourceUrl && /^https?:\/\//.test(p.sourceUrl) && (
              <p>
                <a href={p.sourceUrl} target="_blank" rel="noreferrer">
                  Open source ↗
                </a>
              </p>
            )}
          </div>
        ))}
        {!query.data?.length && (
          <p className={styles.content}>No project records available.</p>
        )}
      </StatusPanel>
    </Panel>
  );
}
export function ProgramSources({ peCode }: { peCode: string }) {
  const query = useCapiroQuery("intelligence.defense.sources", {
    params: { peCode },
  });
  return (
    <Panel title="Sources and proof">
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data?.map((s) => (
          <div key={s.id} className={styles.content}>
            <strong>{s.sourceDocument?.title || s.docType}</strong>
            <p className={styles.muted}>
              {s.publisher || "Publisher not stated"} ·{" "}
              {s.fy ? `FY${s.fy}` : "Fiscal year not stated"}
              {s.pageNumber != null
                ? ` · Pages ${s.pageNumber}${s.pageEnd != null && s.pageEnd !== s.pageNumber ? `–${s.pageEnd}` : ""}`
                : ""}
            </p>
            {s.snippet && <blockquote>{s.snippet}</blockquote>}
            {/^https?:\/\//.test(s.sourceUrl) && (
              <a href={s.sourceUrl} target="_blank" rel="noreferrer">
                Open source ↗
              </a>
            )}
            {s.sourceDocument?.sha256 && (
              <p className={styles.muted}>
                Document SHA256: {s.sourceDocument.sha256}
              </p>
            )}
          </div>
        ))}
        {!query.data?.length && (
          <p className={styles.content}>No proof-pack sources available.</p>
        )}
      </StatusPanel>
    </Panel>
  );
}
