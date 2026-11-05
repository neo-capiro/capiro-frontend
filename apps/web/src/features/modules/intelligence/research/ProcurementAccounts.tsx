"use client";
import type {
  ProcurementAccountReport,
  ProcurementAccountReports,
  ProcurementAccountScopeRequest,
} from "@capiro/shared";
import { useState } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  StatusPanel,
} from "../../../../shared/module-ui";
import { SourceLink } from "./ResearchEvidence";
import {
  downloadProcurementEvidence,
  procurementUsd,
  sameProcurementScope,
} from "./procurement-selection";
import styles from "./procurement.module.css";

const caveats = [
  "Source-reported accounting rows only; not complete award spending or monthly cash flow.",
  "Federal account codes are not full Treasury Account Symbols; availability-period detail is not provided here.",
  "Rows and reporting periods are not summed or differenced, and are never added to SAM action obligations.",
  "This independent report covers all selected awards. Action-year and vendor display filters do not change it.",
  "Missing observations or amounts do not establish zero spending. Local export is not a client-record save.",
];

function AccountObservation({
  report,
  initiallyOpen,
}: {
  report: ProcurementAccountReport;
  initiallyOpen: boolean;
}) {
  const [page, setPage] = useState(0);
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(report.rows.length / 20) - 1),
  );
  const awardId = report.awardIdentityKey.slice("usaspending|award|".length);
  return (
    <details open={initiallyOpen} className={styles.accountObservation}>
      <summary>
        {awardId} ·{" "}
        {report.state === "reported"
          ? `${report.rows.length} reported rows`
          : report.state === "conflict"
            ? "Conflicting observations"
            : "No observation available"}
      </summary>
      <div className={styles.content}>
        <SourceLink url={report.sourceUrl}>USAspending award source</SourceLink>
        {report.state !== "reported" ? (
          <p>
            {report.state === "conflict"
              ? "Conflicting observations were withheld; no financial rows were selected."
              : "No stored account observation is available at this knowledge snapshot. This does not mean zero spending."}
          </p>
        ) : (
          <>
            <p>
              Retrieved <time>{report.sourceObservedAt}</time> · Recorded{" "}
              <time>{report.recordedAt}</time>
            </p>
            <details className={styles.evidence}>
              <summary>Observation receipt</summary>
              <dl>
                <dt>Snapshot</dt>
                <dd>{report.snapshotId}</dd>
                <dt>Response SHA256</dt>
                <dd>{report.sourcePayloadSha256}</dd>
              </dl>
            </details>
            {report.rows.length === 0 ? (
              <p>
                The source returned no accounting rows. This does not establish
                zero obligations or outlays.
              </p>
            ) : (
              <div className={styles.accountTable}>
                <p className={styles.accountScrollHint}>
                  Scroll horizontally to see reported amounts and source
                  agencies.
                </p>
                <DataTable
                  caption="Source-reported accounting rows; values are not summed"
                  scrollRegion
                  rows={report.rows.slice(
                    currentPage * 20,
                    currentPage * 20 + 20,
                  )}
                  rowKey={(row) => String(row.sourceRowIndex)}
                  columns={[
                    {
                      key: "period",
                      label: "Reporting period",
                      render: (row) => (
                        <>
                          <div>
                            {row.reportingFiscalYear === null
                              ? "Fiscal year unreported"
                              : `FY${row.reportingFiscalYear}`}
                          </div>
                          <div>
                            Month {row.reportingFiscalMonth ?? "unreported"} ·
                            Quarter {row.reportingFiscalQuarter ?? "unreported"}
                          </div>
                          <div>
                            {row.isQuarterlySubmission === null
                              ? "Submission basis unreported"
                              : row.isQuarterlySubmission
                                ? "Quarterly submission"
                                : "Monthly submission"}
                          </div>
                          <small>Source row {row.sourceRowIndex + 1}</small>
                        </>
                      ),
                    },
                    {
                      key: "account",
                      label: "Federal account",
                      render: (row) => (
                        <>
                          <div>{row.federalAccount || "Unreported"}</div>
                          <div>{row.accountTitle || "Title unreported"}</div>
                        </>
                      ),
                    },
                    {
                      key: "activity",
                      label: "Program activity / object class",
                      render: (row) => (
                        <>
                          <div>
                            {row.programActivityCode ||
                              "Unreported activity code"}{" "}
                            · {row.programActivityName || "Name unreported"}
                          </div>
                          <div>
                            {row.objectClass || "Unreported object class"} ·{" "}
                            {row.objectClassName || "Name unreported"}
                          </div>
                          <small>
                            DEFC:{" "}
                            {row.disasterEmergencyFundCode || "Unreported"}
                          </small>
                        </>
                      ),
                    },
                    {
                      key: "agencies",
                      label: "Source agencies",
                      render: (row) => (
                        <>
                          <div>
                            Funding: {row.fundingAgencyName || "Unreported"}
                          </div>
                          <div>
                            Awarding: {row.awardingAgencyName || "Unreported"}
                          </div>
                        </>
                      ),
                    },
                    {
                      key: "obligations",
                      label: "Reported obligations (USD)",
                      render: (row) => (
                        <span className={styles.actionAmount}>
                          {procurementUsd(row.reportedObligationUsd)}
                        </span>
                      ),
                    },
                    {
                      key: "outlays",
                      label: "Reported gross outlays (USD)",
                      render: (row) => (
                        <span className={styles.actionAmount}>
                          {procurementUsd(row.reportedGrossOutlayUsd)}
                        </span>
                      ),
                    },
                  ]}
                />
                {report.rows.length > 20 && (
                  <div className={styles.actions}>
                    <ActionButton
                      disabled={currentPage === 0}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      Previous account rows
                    </ActionButton>
                    <span>
                      Rows {currentPage * 20 + 1}–
                      {Math.min((currentPage + 1) * 20, report.rows.length)} of{" "}
                      {report.rows.length}
                    </span>
                    <ActionButton
                      disabled={(currentPage + 1) * 20 >= report.rows.length}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      Next account rows
                    </ActionButton>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}

export function ProcurementAccounts({
  result,
}: {
  result: ProcurementAccountReports;
}) {
  const rows = result.reports.flatMap((report) => report.rows);
  const historicalOnly =
    rows.length > 0 &&
    rows.every(
      (row) =>
        row.reportingFiscalYear !== null && row.reportingFiscalYear < 2025,
    );
  return (
    <>
      <p>
        Knowledge snapshot: <time>{result.knownAt}</time>.{" "}
        {result.scope.awardIdentityKeys.length} selected awards; related awards
        excluded.
      </p>
      {historicalOnly && (
        <p role="note">
          Only historical reporting periods are available here. These rows
          provide no FY2025–FY2026 account figures.
        </p>
      )}
      {result.reports.some((report) => report.state === "reported") && (
        <div className={styles.actions}>
          <ActionButton
            onClick={() =>
              downloadProcurementEvidence(
                `procurement-accounts-${result.knownAt.slice(0, 10)}.json`,
                {
                  contract: "procurement-account-evidence/v1",
                  sourceSnapshot: result,
                  caveats,
                },
              )
            }
          >
            Export account evidence
          </ActionButton>
        </div>
      )}
      {result.reports.map((report, index) => (
        <AccountObservation
          key={`${report.awardIdentityKey}:${report.snapshotId ?? report.state}`}
          report={report}
          initiallyOpen={index === 0}
        />
      ))}
    </>
  );
}

export function ProcurementAccountPanel({
  scope,
  waiting = false,
  hasSamCutoff = false,
}: {
  scope: ProcurementAccountScopeRequest;
  waiting?: boolean;
  hasSamCutoff?: boolean;
}) {
  const query = useCapiroQuery(
    "procurement.accountReports",
    {
      body: {
        awardIdentityKeys: [...scope.awardIdentityKeys],
        knownAt: scope.knownAt,
      },
    },
    { enabled: !waiting },
  );
  const result =
    !waiting &&
    !query.loading &&
    !query.error &&
    query.data &&
    sameProcurementScope(scope, { ...query.data, sourceThrough: null })
      ? query.data
      : undefined;
  const mismatch =
    query.data && !query.loading && !query.error && !waiting && !result
      ? new Error(
          "The account report did not match the selected awards or knowledge snapshot.",
        )
      : undefined;
  return (
    <section
      aria-label="Reported accounts and outlays"
      className={styles.content}
    >
      <h3>Reported accounts and outlays</h3>
      <p>
        Independent USAspending accounting observations for all selected awards,
        not SAM action outlays. Action-year and vendor display filters do not
        change this section.
      </p>
      <p>
        Federal account codes are not full Treasury Account Symbols. Period
        values are not summed or added to the action totals above.
      </p>
      {hasSamCutoff && (
        <p>
          The SAM source cutoff does not apply to these independent account
          reports.
        </p>
      )}
      <div className={styles.actions}>
        <ActionButton
          onClick={query.reload}
          disabled={waiting || query.loading}
        >
          Reload account snapshot
        </ActionButton>
        <small>
          Reads stored observations; does not trigger an upstream refresh.
        </small>
      </div>
      <StatusPanel
        loading={waiting || query.loading}
        error={query.error ?? mismatch}
        onRetry={query.reload}
      >
        {result ? (
          <ProcurementAccounts result={result} />
        ) : (
          <p>Account observations are not available.</p>
        )}
      </StatusPanel>
    </section>
  );
}
