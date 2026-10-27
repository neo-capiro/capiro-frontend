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
import { useResearchLocation } from "./ResearchNavigation";
import { SourceLink } from "./ResearchEvidence";
export function ContextRecords() {
  const { params, update } = useResearchLocation();
  const family = params.get("researchFamily") || "",
    id = params.get("researchId") || "";
  const query = useCapiroQuery("defenseResearch.context", {
    query: { family: family || undefined, limit: 100 },
  });
  const detail = useCapiroQuery(
    "defenseResearch.context.detail",
    { params: { documentId: id } },
    { enabled: Boolean(id) },
  );
  return (
    <div className={styles.stack}>
      <form
        key={family}
        className={styles.toolbar}
        onSubmit={(event) => {
          event.preventDefault();
          update({
            researchFamily: String(
              new FormData(event.currentTarget).get("family") || "",
            ),
            researchId: null,
          });
        }}
      >
        <TextInput
          name="family"
          aria-label="Context source family"
          defaultValue={family}
          placeholder="Source family · Any"
          maxLength={200}
        />
        <ActionButton type="submit">Apply filter</ActionButton>
        <ActionButton onClick={query.reload}>Refresh documents</ActionButton>
      </form>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <Panel
          title="Context documents"
          description="Up to 100 matching observations. This bounded list does not establish complete source coverage."
        >
          {query.data && (
            <p className={styles.content}>
              {query.data.denominator.observed} observed ·{" "}
              {query.data.denominator.qualified} qualified ·{" "}
              {query.data.denominator.unavailable} unavailable
            </p>
          )}
          <DataTable
            rows={query.data?.items || []}
            rowKey={(row) => row.id}
            caption="Context documents"
            columns={[
              {
                key: "title",
                label: "Document",
                render: (row) => (
                  <button
                    className={styles.link}
                    onClick={() => update({ researchId: row.id })}
                  >
                    {row.title}
                  </button>
                ),
              },
              {
                key: "family",
                label: "Family / publisher",
                render: (row) => `${row.family} · ${row.publisher}`,
              },
              {
                key: "published",
                label: "Published",
                render: (row) => row.publishedAt || "Not available",
              },
              {
                key: "coverage",
                label: "Coverage",
                render: (row) => <Badge>{row.coverage}</Badge>,
              },
            ]}
          />
        </Panel>
      </StatusPanel>
      {id && (
        <StatusPanel
          loading={detail.loading}
          error={detail.error}
          onRetry={detail.reload}
        >
          {detail.data && (
            <Panel
              title={detail.data.title}
              actions={
                <ActionButton onClick={() => update({ researchId: null })}>
                  Close document
                </ActionButton>
              }
            >
              <div className={styles.content}>
                <Badge>{detail.data.coverage}</Badge>
                <p>
                  {detail.data.coverageReason ||
                    `Transcript: ${detail.data.transcriptAvailability}`}
                </p>
                <SourceLink url={detail.data.sourceUrl} />
              </div>
              <DataTable
                rows={detail.data.revisions}
                rowKey={(row) => row.id}
                caption="Document revisions"
                columns={[
                  {
                    key: "version",
                    label: "Version",
                    render: (row) => row.version,
                  },
                  {
                    key: "observed",
                    label: "Observed",
                    render: (row) => row.observedAt,
                  },
                  {
                    key: "source",
                    label: "Exact revision source",
                    render: (row) => <SourceLink url={row.sourceUrl} />,
                  },
                ]}
              />
              <DataTable
                rows={detail.data.sections}
                rowKey={(row) => row.id}
                caption="Document sections"
                columns={[
                  {
                    key: "section",
                    label: "Section",
                    render: (row) => row.label,
                  },
                  {
                    key: "locator",
                    label: "Native locator",
                    render: (row) => row.nativeLocator || "Not available",
                  },
                  {
                    key: "availability",
                    label: "Text availability",
                    render: (row) => row.textAvailability,
                  },
                ]}
              />
            </Panel>
          )}
        </StatusPanel>
      )}
    </div>
  );
}
