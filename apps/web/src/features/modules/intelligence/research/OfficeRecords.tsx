"use client";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "../intelligence.module.css";
import { ResearchPages, useResearchLocation } from "./ResearchNavigation";
import { EvidenceList, SourceLink } from "./ResearchEvidence";
export function OfficeRecords() {
  const { params, update, page } = useResearchLocation();
  const q = params.get("researchQuery") || "",
    id = params.get("researchId") || "";
  const query = useCapiroQuery("defenseResearch.offices", {
    query: { q: q || undefined, page, limit: 25 },
  });
  const detail = useCapiroQuery(
    "defenseResearch.office",
    { params: { officeId: id } },
    { enabled: Boolean(id) },
  );
  const relationships = useCapiroQuery(
    "defenseResearch.relationships",
    { query: { from: id, page: 1, limit: 100 } },
    { enabled: Boolean(id) },
  );
  return (
    <div className={styles.stack}>
      <form
        key={q}
        className={styles.toolbar}
        onSubmit={(event) => {
          event.preventDefault();
          update({
            researchQuery: String(
              new FormData(event.currentTarget).get("q") || "",
            ),
            researchPage: null,
            researchId: null,
          });
        }}
      >
        <TextInput
          name="q"
          aria-label="Search offices"
          defaultValue={q}
          maxLength={200}
          placeholder="Office name…"
        />
        <ActionButton type="submit">Search offices</ActionButton>
        <ActionButton onClick={query.reload}>Refresh offices</ActionButton>
      </form>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <Panel title="Offices">
          <DataTable
            rows={query.data?.items || []}
            rowKey={(row) => row.id}
            caption="Research offices"
            columns={[
              {
                key: "name",
                label: "Office",
                render: (row) => (
                  <button
                    className={styles.link}
                    onClick={() => update({ researchId: row.id })}
                  >
                    {row.name}
                  </button>
                ),
              },
              {
                key: "type",
                label: "Type / service",
                render: (row) =>
                  `${row.officeType} · ${row.service || "Not available"}`,
              },
              {
                key: "status",
                label: "Status / review",
                render: (row) =>
                  `${row.status} · ${row.reviewStatus || "Unreviewed"}`,
              },
              {
                key: "validity",
                label: "Effective dates",
                render: (row) =>
                  `${row.effectiveStart || "Unknown"} – ${row.effectiveEnd || "Open / unknown"}`,
              },
            ]}
          />
          {query.data && (
            <ResearchPages
              page={query.data.page}
              total={query.data.total}
              limit={query.data.limit}
              onPage={(value) =>
                update({ researchPage: String(value), researchId: null })
              }
            />
          )}
        </Panel>
      </StatusPanel>
      {id && (
        <>
          <StatusPanel
            loading={detail.loading}
            error={detail.error}
            onRetry={detail.reload}
          >
            {detail.data && (
              <Panel
                title={detail.data.name}
                actions={
                  <ActionButton onClick={() => update({ researchId: null })}>
                    Close office
                  </ActionButton>
                }
              >
                <div className={styles.content}>
                  <Badge>{detail.data.availability}</Badge>
                  <p>{detail.data.mission || "Mission not available."}</p>
                  <p>
                    {detail.data.responsibilities ||
                      "Responsibilities not available."}
                  </p>
                  <p>{detail.data.scope || "Scope not available."}</p>
                  <SourceLink url={detail.data.sourceUrl} />
                  <EvidenceList items={detail.data.evidence} />
                </div>
              </Panel>
            )}
          </StatusPanel>
          <StatusPanel
            loading={relationships.loading}
            error={relationships.error}
            onRetry={relationships.reload}
          >
            <Panel
              title="Outgoing relationships"
              description="At most 100 current matching edges. Associations do not imply funding or award authority."
            >
              <DataTable
                rows={relationships.data?.items || []}
                rowKey={(row) => row.id}
                caption="Office relationships"
                columns={[
                  {
                    key: "target",
                    label: "Target",
                    render: (row) => row.to.label,
                  },
                  {
                    key: "relation",
                    label: "Relation",
                    render: (row) => row.relation,
                  },
                  {
                    key: "basis",
                    label: "Basis",
                    render: (row) =>
                      `${row.sourceStated ? "Source stated" : row.derived ? "Derived" : row.inferred ? "Inferred" : "Unspecified"} · ${row.reviewStatus} · ${row.validity}`,
                  },
                  {
                    key: "evidence",
                    label: "Evidence",
                    render: (row) => <EvidenceList items={row.evidence} />,
                  },
                ]}
              />
            </Panel>
          </StatusPanel>
        </>
      )}
    </div>
  );
}
