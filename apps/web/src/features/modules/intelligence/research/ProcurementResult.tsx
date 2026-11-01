import type {
  ProcurementMoneyFlow,
  ProcurementHubSummary,
} from "@capiro/shared";
import { useState } from "react";
import { ActionButton, Badge, DataTable } from "../../../../shared/module-ui";
import { SourceLink } from "./ResearchEvidence";
import { procurementUsd } from "./procurement-selection";
import styles from "./procurement.module.css";

export function ProcurementResult({
  result,
}: {
  result: ProcurementMoneyFlow | ProcurementHubSummary;
}) {
  return (
    <>
      <div className={styles.content}>
        <Badge>
          {result.state === "partial"
            ? "Partial source coverage"
            : "Unavailable"}
        </Badge>
        <p>
          {result.scope.awardIdentityKeys.length} explicitly selected awards ·
          Public federal procurement · Related awards excluded.
        </p>
        <p>
          Knowledge snapshot: <time>{result.knownAt}</time>
          {result.sourceThrough
            ? ` · Source cutoff: ${result.sourceThrough}`
            : " · No source cutoff"}
        </p>
        {result.totals ? (
          <>
            <dl className={styles.measures}>
              <div>
                <dt>Observed obligations (USD)</dt>
                <dd>
                  {procurementUsd(result.totals.obligationUsd)}
                  <span className={styles.subtext}>
                    {result.totals.obligationKnown} actions with reported
                    obligations
                  </span>
                </dd>
              </div>
              <div>
                <dt>Observed outlays (USD)</dt>
                <dd>
                  {procurementUsd(result.totals.outlayUsd)}
                  <span className={styles.subtext}>
                    {result.totals.outlayKnown} actions with reported outlays
                  </span>
                </dd>
              </div>
              <div>
                <dt>Qualified actions</dt>
                <dd>{result.totals.actions}</dd>
              </div>
            </dl>
            <p>
              These signed action amounts cover the selected qualified
              observations only. They are not complete award values or total
              federal spending. Unreported amounts are not zero.
            </p>
            {"groupCount" in result && (
              <p>
                {result.groupCount} fiscal year, agency and vendor groups. Open
                Money Flow for group detail and observation clocks.
              </p>
            )}
          </>
        ) : (
          <p role="status">
            No qualified actions are available for this selection and snapshot.
            Spending totals are unavailable; this does not mean zero spending.
          </p>
        )}
        <details>
          <summary>Coverage counts</summary>
          <p>
            Counts describe observed classifications; omitted categories do not
            establish complete source coverage.
          </p>
          <ul className={styles.coverage}>
            {Object.entries(result.coverage).map(([name, count]) => (
              <li key={name}>
                {name.replaceAll("_", " ")}: {count}
              </li>
            ))}
          </ul>
        </details>
      </div>
      {"groups" in result && result.groups.length > 0 && (
        <ProcurementGroups groups={result.groups} />
      )}
      <ProcurementProvenance result={result} />
    </>
  );
}

function ProcurementGroups({
  groups,
}: {
  groups: ProcurementMoneyFlow["groups"];
}) {
  const [page, setPage] = useState(0);
  const lastPage = Math.max(0, Math.ceil(groups.length / 20) - 1);
  const current = Math.min(page, lastPage);
  return (
    <>
      <DataTable
        caption="Selected procurement action groups"
        scrollRegion
        rows={groups.slice(current * 20, current * 20 + 20)}
        rowKey={(row) =>
          JSON.stringify([
            row.fiscalYear,
            row.awardingAgency,
            row.awardingSubTier,
            row.vendorKey,
            row.contractorName,
            row.attributeState,
          ])
        }
        columns={[
          {
            key: "year",
            label: "Fiscal year",
            render: (row) => row.fiscalYear ?? "Undated",
          },
          {
            key: "agency",
            label: "Awarding agency",
            render: (row) => (
              <>
                {row.awardingAgency || "Agency unavailable"}
                <span className={styles.subtext}>
                  {row.awardingSubTier || "Sub-tier unavailable"}
                </span>
              </>
            ),
          },
          {
            key: "vendor",
            label: "Vendor attribution",
            render: (row) => (
              <>
                {row.contractorName || "Name unavailable"}
                <span className={styles.subtext}>
                  {row.vendorIdentityState === "source_uei"
                    ? `Source-reported UEI: ${row.recipientUei}`
                    : `Unresolved identity · ${row.vendorKey}`}
                </span>
                <span className={styles.subtext}>
                  {row.attributeState.replaceAll("_", " ")}
                </span>
              </>
            ),
          },
          {
            key: "obligation",
            label: "Obligations (USD)",
            render: (row) => procurementUsd(row.obligationUsd),
          },
          {
            key: "outlay",
            label: "Outlays (USD)",
            render: (row) => procurementUsd(row.outlayUsd),
          },
          {
            key: "actions",
            label: "Qualified actions",
            render: (row) => row.actions,
          },
          {
            key: "freshness",
            label: "Observation clocks (UTC)",
            render: (row) => (
              <>
                <span className={styles.subtext}>
                  Source revision: {row.latestSourceRevision}
                </span>
                <span className={styles.subtext}>
                  Observed: {row.latestSourceObservedAt}
                </span>
                <span className={styles.subtext}>
                  Recorded: {row.latestRecordedAt}
                </span>
                <span className={styles.subtext}>
                  Catalog: {row.latestAttributeRecordedAt || "Unavailable"}
                </span>
              </>
            ),
          },
        ]}
      />
      <nav className={styles.content} aria-label="Procurement group pages">
        <div className={styles.actions}>
          <ActionButton
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            Previous groups
          </ActionButton>
          <span>
            Page {current + 1} of {lastPage + 1} · {groups.length} groups
          </span>
          <ActionButton
            disabled={current === lastPage}
            onClick={() => setPage(current + 1)}
          >
            Next groups
          </ActionButton>
        </div>
      </nav>
    </>
  );
}

function ProcurementProvenance({
  result,
}: {
  result: ProcurementMoneyFlow | ProcurementHubSummary;
}) {
  return (
    <div className={styles.content}>
      <p>
        Source observations may predate the knowledge snapshot. A
        source-reported UEI is not independent SAM registration or
        corporate-family verification.
      </p>
      <details className={styles.evidence}>
        <summary>
          Sources and qualification evidence ({result.provenance.length})
        </summary>
        {result.provenance.map((entry) => (
          <details key={JSON.stringify(entry)}>
            <summary>
              {entry.awardIdentityKey} · {entry.selectedActions} selected
              actions
            </summary>
            <dl>
              <dt>Action source</dt>
              <dd>
                <SourceLink url={entry.sourceUrl} />
              </dd>
              <dt>Award source</dt>
              <dd>
                <SourceLink url={entry.catalogSourceUrl} />
              </dd>
              <dt>Catalog recorded</dt>
              <dd>{entry.attributeRecordedAt || "Unavailable"}</dd>
              <dt>Catalog revision</dt>
              <dd>{entry.catalogRevisionId || "Unavailable"}</dd>
              <dt>Qualification run</dt>
              <dd>{entry.runId}</dd>
              <dt>Contract / target</dt>
              <dd>
                {entry.contract} · {entry.targetId}
              </dd>
              <dt>Producer commit</dt>
              <dd>{entry.producerCommit}</dd>
              <dt>Producer image</dt>
              <dd>{entry.imageDigest}</dd>
            </dl>
          </details>
        ))}
        {result.sources.map((source) => (
          <p key={source.system}>
            <SourceLink url={source.documentationUrl}>
              {source.system} documentation
            </SourceLink>{" "}
            · {source.semantics}
          </p>
        ))}
      </details>
    </div>
  );
}
