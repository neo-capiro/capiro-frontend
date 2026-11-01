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
import { SourceLink } from "./ResearchEvidence";
import { ProcurementSelection } from "./ProcurementSelection";
import { ProcurementReadPanel } from "./ProcurementPanel";
import { useProcurementSelection } from "./useProcurementSelection";
import { selectableAward } from "./procurement-selection";
export function AcquisitionRecords() {
  const { params, page } = useResearchLocation();
  const selection = useProcurementSelection();
  const update = selection.update;
  const q = params.get("researchQuery") || "",
    id = params.get("researchId") || "";
  const query = useCapiroQuery("defenseResearch.acquisitions", {
    query: { q: q || undefined, page, limit: 25 },
  });
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
          disabled={selection.pending}
          name="q"
          aria-label="Search acquisitions"
          defaultValue={q}
          maxLength={200}
          placeholder="Source record or title…"
        />
        <ActionButton type="submit" disabled={selection.pending}>
          Search acquisitions
        </ActionButton>
        <ActionButton onClick={query.reload}>Refresh acquisitions</ActionButton>
      </form>
      <ProcurementSelection selection={selection} />
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <Panel title="Acquisition records">
          <DataTable
            rows={query.data?.items || []}
            rowKey={(row) => row.identityKey}
            caption="Acquisition records"
            columns={[
              {
                key: "select",
                label: "Money Flow",
                render: (row) =>
                  selectableAward(row.identityKey) ? (
                    <input
                      type="checkbox"
                      aria-label={`Select award ${row.title || row.sourceRecordId} (${row.identityKey})`}
                      checked={selection.keys.includes(row.identityKey)}
                      disabled={
                        selection.pending ||
                        Boolean(selection.error) ||
                        (selection.keys.length >= 25 &&
                          !selection.keys.includes(row.identityKey))
                      }
                      onChange={() => selection.toggle(row.identityKey)}
                    />
                  ) : (
                    <span>Not an award</span>
                  ),
              },
              {
                key: "name",
                label: "Record",
                render: (row) => (
                  <button
                    disabled={selection.pending}
                    className={styles.link}
                    onClick={() => update({ researchId: row.identityKey })}
                  >
                    {row.title || row.sourceRecordId}
                  </button>
                ),
              },
              {
                key: "kind",
                label: "Source / kind",
                render: (row) => `${row.sourceSystem} · ${row.recordKind}`,
              },
              {
                key: "status",
                label: "Status / text",
                render: (row) =>
                  `${row.status || "Not available"} · ${row.textAvailability}`,
              },
              {
                key: "coverage",
                label: "Continuity",
                render: (row) =>
                  `${row.amendmentCount} amendments · ${row.openCoverageGaps} open coverage gaps`,
              },
            ]}
          />
          {query.data && (
            <ResearchPages
              disabled={selection.pending}
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
      <ProcurementReadPanel selection={selection} />
      {id && (
        <AcquisitionDetail
          pending={selection.pending}
          identityKey={id}
          onClose={() => update({ researchId: null })}
        />
      )}
    </div>
  );
}
function AcquisitionDetail({
  pending,
  identityKey,
  onClose,
}: {
  pending: boolean;
  identityKey: string;
  onClose: () => void;
}) {
  const query = useCapiroQuery("defenseResearch.acquisition", {
    params: { identityKey },
  });
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
    >
      {query.data && (
        <Panel
          title={query.data.title || query.data.sourceRecordId}
          actions={
            <ActionButton onClick={onClose} disabled={pending}>
              Close acquisition
            </ActionButton>
          }
        >
          <div className={styles.content}>
            <Badge>{query.data.textAvailability}</Badge>
            <p>
              Observed: {query.data.sourceObservedAt || "Not available"} ·
              Version: {query.data.sourceVersion || "Not available"}
            </p>
            <p>
              Buyer: {query.data.buyerOffice || "Not available"} · Deadline:{" "}
              {query.data.responseDeadline || "Not available"}
            </p>
            <SourceLink url={query.data.sourceUrl} />
          </div>
          <DataTable
            rows={query.data.revisions}
            rowKey={(row) => row.id}
            caption="Acquisition revisions"
            columns={[
              {
                key: "version",
                label: "Version",
                render: (row) => row.sourceVersion || "Not available",
              },
              {
                key: "observed",
                label: "Observed",
                render: (row) => row.sourceObservedAt || "Not available",
              },
              {
                key: "source",
                label: "Source",
                render: (row) => <SourceLink url={row.sourceUrl} />,
              },
            ]}
          />
          <DataTable
            rows={query.data.associations}
            rowKey={(row) => row.relationshipId}
            caption="Acquisition associations"
            columns={[
              {
                key: "subject",
                label: "Subject",
                render: (row) => row.subjectLabel || row.subjectKey,
              },
              {
                key: "class",
                label: "Relationship / review",
                render: (row) =>
                  `${row.relationshipClass} · ${row.reviewStatus}`,
              },
              {
                key: "amount",
                label: "Source allocation USD",
                render: (row) =>
                  row.allocatedAmountUsd ?? "No allocation stated",
              },
              {
                key: "source",
                label: "Source",
                render: (row) => <SourceLink url={row.sourceUrl} />,
              },
            ]}
          />
        </Panel>
      )}
    </StatusPanel>
  );
}
