"use client";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  PageHeader,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "../intelligence.module.css";
import { useResearchLocation } from "./ResearchNavigation";
import { CoverageOutcome } from "./CoverageOutcome";
const filterNames = [
  "perimeter",
  "component",
  "account",
  "family",
  "edition",
  "stage",
  "detail",
] as const;
export function ResearchCoverage() {
  const { params, update } = useResearchLocation();
  const filters = Object.fromEntries(
    filterNames.map((name) => [
      name,
      params.get(`coverage_${name}`) || undefined,
    ]),
  );
  const year = Number(params.get("coverage_fiscalYear"));
  const fiscalYear =
    Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : undefined;
  const query = useCapiroQuery("defenseResearch.coverage", {
    query: { ...filters, fiscalYear },
  });
  return (
    <>
      <PageHeader
        title="Research coverage"
        description="Customer coverage from the current source publication. Counts are physical documents; unknown denominators do not imply completeness."
        actions={
          <ActionButton onClick={query.reload}>Refresh coverage</ActionButton>
        }
      />
      <form
        key={params.toString()}
        className={styles.toolbar}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          update(
            Object.fromEntries(
              [...filterNames, "fiscalYear"].map((name) => [
                `coverage_${name}`,
                String(data.get(name) || ""),
              ]),
            ),
          );
        }}
      >
        {filterNames.map((name) => (
          <TextInput
            key={name}
            name={name}
            aria-label={`Coverage ${name}`}
            placeholder={name.charAt(0).toUpperCase() + name.slice(1)}
            defaultValue={filters[name] || ""}
            maxLength={200}
          />
        ))}
        <TextInput
          type="number"
          name="fiscalYear"
          aria-label="Coverage fiscal year"
          min={1900}
          max={2200}
          defaultValue={fiscalYear || ""}
          placeholder="Fiscal year"
        />
        <ActionButton type="submit">Apply coverage filters</ActionButton>
        <ActionButton
          type="button"
          onClick={() =>
            update(
              Object.fromEntries(
                [...filterNames, "fiscalYear"].map((name) => [
                  `coverage_${name}`,
                  null,
                ]),
              ),
            )
          }
        >
          Clear filters
        </ActionButton>
      </form>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data && (
          <Panel title="Published source coverage">
            <div className={styles.content}>
              <p>
                {query.data.denominatorKnown
                  ? "A denominator is available for the displayed cohorts."
                  : "Complete physical-source denominators are not established for this selection."}
              </p>
              {query.data.limitations.map((text) => (
                <p key={text}>{text}</p>
              ))}
              <p>
                Refresh reads the latest published status. It does not ingest or
                requalify sources.
              </p>
            </div>
            <DataTable
              rows={query.data.rows}
              rowKey={(row) =>
                [
                  row.perimeter,
                  row.component,
                  row.account,
                  row.family,
                  row.fiscalYear,
                  row.edition,
                  row.stage,
                  row.detail,
                ].join(":")
              }
              caption="Research coverage cohorts"
              columns={[
                {
                  key: "cohort",
                  label: "Cohort",
                  render: (row) => (
                    <>
                      <strong>
                        {row.family} · FY{row.fiscalYear}
                      </strong>
                      <p>
                        {row.perimeter} ·{" "}
                        {row.component || "Component unspecified"} ·{" "}
                        {row.account || "Account unspecified"}
                      </p>
                      <p>
                        {row.edition || "Edition unspecified"} · {row.stage} ·{" "}
                        {row.detail || "Detail unspecified"}
                      </p>
                    </>
                  ),
                },
                {
                  key: "denominator",
                  label: "Physical documents",
                  render: (row) => (
                    <>
                      <strong>
                        {row.denominator.state === "known" &&
                        row.denominator.value !== null
                          ? row.denominator.value
                          : "Unknown"}
                      </strong>
                      <p>{row.denominator.reason}</p>
                      {row.denominator.attestedAt && (
                        <p>Attested {row.denominator.attestedAt}</p>
                      )}
                    </>
                  ),
                },
                {
                  key: "counts",
                  label: "Progress",
                  render: (row) => (
                    <>
                      {row.discovered} discovered · {row.parsed} parsed
                      <br />
                      {row.qualified} qualified · {row.published} published
                    </>
                  ),
                },
                {
                  key: "recordedOutcome",
                  label: "Recorded source outcomes",
                  render: (row) => (
                    <CoverageOutcome outcome={row.recordedOutcome} />
                  ),
                },
                {
                  key: "status",
                  label: "Status / limitations",
                  render: (row) => (
                    <>
                      <Badge>{row.outcome}</Badge>
                      {row.limitations.map((text) => (
                        <p key={text}>{text}</p>
                      ))}
                      <p>As of {row.asOf}</p>
                    </>
                  ),
                },
              ]}
            />
          </Panel>
        )}
      </StatusPanel>
    </>
  );
}
