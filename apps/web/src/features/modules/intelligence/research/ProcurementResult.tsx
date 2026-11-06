import type {
  ProcurementMoneyFlow,
  ProcurementHubSummary,
  ProcurementMoneyFlowResult,
  ProcurementObservedFlowGroup,
} from "@capiro/shared";
import { useId, useState } from "react";
import {
  ActionButton,
  Badge,
  DataTable,
  Field,
  Modal,
  TextArea,
  TextInput,
} from "../../../../shared/module-ui";
import { SourceLink } from "./ResearchEvidence";
import {
  procurementUsd,
  downloadProcurementEvidence,
} from "./procurement-selection";
import {
  ProcurementVendorFootprint,
  filterProcurementGroups,
  procurementGroupTotals,
  type ProcurementDisplayFilters,
} from "./ProcurementVendorFootprint";
import {
  ProcurementActionTable,
  filterProcurementActions,
} from "./ProcurementActionTable";
import styles from "./procurement.module.css";

const fiscalFilters = [
  ["all", "All"],
  ["2025", "FY2025"],
  ["2026", "FY2026"],
  ["2025-2026", "FY2025–FY2026"],
] as const;

export function ProcurementResult({
  result,
}: {
  result: ProcurementMoneyFlowResult | ProcurementHubSummary;
}) {
  const id = useId();
  const isObserved = result.contract === "defproc-observed-money-flow/v1";
  const [view, setView] = useState<"groups" | "footprint">("groups");
  const [filters, setFilters] = useState<ProcurementDisplayFilters>({
    fiscalYear: "all",
    vendor: "",
  });
  const [exportNote, setExportNote] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const flow = "groups" in result ? result : null;
  const groups = flow ? filterProcurementGroups(flow.groups, filters) : [];
  const actions = flow?.actionDetails
    ? filterProcurementActions(flow.actionDetails, groups)
    : null;
  const totals = flow ? procurementGroupTotals(groups) : result.totals;
  const hasGroups = Boolean(flow?.groups.length);
  const canExport = Boolean(flow && groups.length && totals);
  const displayKey = JSON.stringify(filters);
  const handleExport = () => {
    if (!flow || !totals || !groups.length || exportNote.length > 4000) return;
    const payload = {
      contract: "procurement-evidence-finding/v1",
      sourceSnapshot: flow,
      display: {
        view,
        filters,
        totals,
        groups,
        ...(actions ? { actions } : {}),
      },
      provenanceScope:
        "sourceSnapshot contains the entire selected award cohort before display filters",
      analystJudgment: exportNote.trim()
        ? { kind: "analyst_judgment", followUp: exportNote }
        : null,
      caveats: [
        "Local export, not saved to a client record.",
        "Partial qualified observed actions; not complete federal or award spending.",
        "This adapter supports AWARD A/B/C/D, not IDVs or OTAs; related awards are excluded.",
        "DoD-funded and DoD-awarded records are subject to SAM's 90-day public disclosure delay.",
        "Source-reported UEIs are not verified corporate ownership. Action outlays are unknown; no account allocation is inferred.",
        ...(isObserved
          ? [
              "For observed contract data: publisher revision labels are verbatim source values, not certified UTC timestamps or chronological ordering.",
            ]
          : []),
      ],
    };
    downloadProcurementEvidence(
      `procurement-evidence-${result.knownAt.slice(0, 10)}.json`,
      payload,
    );
    setShowExportModal(false);
    setExportNote("");
  };
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
          {isObserved
            ? " · Latest observed revision basis"
            : result.sourceThrough
              ? ` · Source cutoff: ${result.sourceThrough}`
              : " · No source cutoff"}
        </p>
        {isObserved && (
          <p className={styles.subtext}>
            Observed: latest revision label per full action identity among
            bounded observations. Publisher labels are verbatim and
            uninterpreted — not certified publisher chronology or complete
            history.
          </p>
        )}
        {hasGroups && (
          <>
            <div
              className={styles.actions}
              aria-label="Procurement display filters"
            >
              <span>Fiscal year:</span>
              {fiscalFilters.map(([value, label]) => (
                <ActionButton
                  key={value}
                  aria-pressed={filters.fiscalYear === value}
                  onClick={() =>
                    setFilters((previous) => ({
                      ...previous,
                      fiscalYear: value,
                    }))
                  }
                >
                  {label}
                </ActionButton>
              ))}
            </div>
            <Field label="Filter vendors" htmlFor={`${id}-vendor`}>
              <TextInput
                id={`${id}-vendor`}
                type="search"
                value={filters.vendor}
                maxLength={200}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    vendor: event.target.value,
                  }))
                }
                placeholder="Name or vendor key"
              />
            </Field>
            {(filters.vendor || filters.fiscalYear !== "all") && (
              <div className={styles.actions}>
                <ActionButton
                  onClick={() => setFilters({ fiscalYear: "all", vendor: "" })}
                >
                  Clear filters
                </ActionButton>
              </div>
            )}
            <p>
              Display subset: {groups.length} of {flow!.groups.length} observed
              groups. These filters apply to both views and the export, not the
              source acquisition scope.
            </p>
          </>
        )}
        {totals ? (
          <>
            <dl className={styles.measures}>
              <div>
                <dt>Observed obligations (USD)</dt>
                <dd>
                  {procurementUsd(totals.obligationUsd)}
                  <span className={styles.subtext}>
                    {totals.obligationKnown} actions with reported obligations
                  </span>
                </dd>
              </div>
              <div>
                <dt>Observed outlays (USD)</dt>
                <dd>
                  {procurementUsd(totals.outlayUsd)}
                  <span className={styles.subtext}>
                    {totals.outlayKnown} actions with reported outlays
                  </span>
                </dd>
              </div>
              <div>
                <dt>Qualified actions</dt>
                <dd>{totals.actions}</dd>
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
            {hasGroups
              ? "No observed actions match these display filters. The subset is unavailable; this does not mean zero spending."
              : "No qualified actions are available for this selection and snapshot. Spending totals are unavailable; this does not mean zero spending."}
          </p>
        )}
        <details>
          <summary>Coverage counts</summary>
          <p>
            Counts describe the entire selected source cohort before display
            filters; omitted categories do not establish complete source
            coverage.
          </p>
          <ul className={styles.coverage}>
            {Object.entries(result.coverage).map(([name, count]) => (
              <li key={name}>
                {name.replaceAll("_", " ")}: {count}
              </li>
            ))}
          </ul>
        </details>
        <p>
          Public records both funded and awarded by DoD are subject to
          SAM&apos;s 90-day disclosure delay. The source observation dates and
          partial coverage still apply.
        </p>
        <details className={styles.evidence}>
          <summary>Source coverage disclosures</summary>
          <p>
            This adapter supports AWARD A/B/C/D only. IDVs, OTAs and
            related/descendant awards are excluded. SAM does not report action
            outlays. Funding/account allocations must not be inferred from these
            awarding-agency groups.
          </p>
          <SourceLink url="https://open.gsa.gov/api/contract-awards/">
            GSA Contract Awards documentation
          </SourceLink>
        </details>
        {hasGroups && (
          <div className={styles.actions}>
            <ActionButton
              aria-pressed={view === "groups"}
              onClick={() => setView("groups")}
            >
              Money Flow
            </ActionButton>
            <ActionButton
              aria-pressed={view === "footprint"}
              onClick={() => setView("footprint")}
            >
              Vendor Footprint
            </ActionButton>
            <ActionButton
              onClick={() => setShowExportModal(true)}
              disabled={!canExport}
            >
              Download evidence finding
            </ActionButton>
          </div>
        )}
        {groups.length > 0 &&
          (view === "footprint" ? (
            <ProcurementVendorFootprint key={displayKey} groups={groups} />
          ) : actions ? (
            <ProcurementActionTable key={displayKey} actions={actions} />
          ) : (
            <ProcurementGroups
              key={displayKey}
              groups={groups}
              isObserved={isObserved}
            />
          ))}
      </div>
      <ProcurementProvenance result={result} />
      <Modal
        className={styles.exportDialog}
        open={showExportModal}
        onOpenChange={setShowExportModal}
        title="Download evidence finding"
        description="This downloads a local JSON file with your display filters and the full source snapshot. It does not save to or attach to a client."
        footer={
          <>
            <ActionButton onClick={() => setShowExportModal(false)}>
              Cancel
            </ActionButton>
            <ActionButton
              onClick={handleExport}
              disabled={!canExport || exportNote.length > 4000}
            >
              Download JSON
            </ActionButton>
          </>
        }
      >
        <Field
          htmlFor={`${id}-note`}
          label="Analyst follow-up (optional)"
          description="Analyst judgment, not an additional source fact. Maximum 4,000 characters."
        >
          <TextArea
            id={`${id}-note`}
            value={exportNote}
            onChange={(event) => setExportNote(event.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="Optional follow-up note (exported as analyst judgment)"
          />
        </Field>
      </Modal>
    </>
  );
}

function ProcurementGroups({
  groups,
  isObserved,
}: {
  groups: readonly (
    | ProcurementMoneyFlow["groups"][number]
    | ProcurementObservedFlowGroup
  )[];
  isObserved: boolean;
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
                {!isObserved && "latestSourceRevision" in row && (
                  <span className={styles.subtext}>
                    Source revision: {row.latestSourceRevision}
                  </span>
                )}
                <span className={styles.subtext}>
                  {isObserved ? "Retrieved" : "Observed"}:{" "}
                  {row.latestSourceObservedAt}
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
  result: ProcurementMoneyFlowResult | ProcurementHubSummary;
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
