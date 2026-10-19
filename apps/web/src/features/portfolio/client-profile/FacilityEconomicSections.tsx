"use client";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type {
  ProfileDistrictEconomicContext,
  ProfileEconomicFootprint,
  ProfileEvidenceScope,
} from "./profile-evidence-contracts";
import {
  useProfileDistrictEconomicContext,
  useProfileEconomicFootprint,
} from "./profile-evidence-queries";
import styles from "./facility-evidence.module.css";
import { ProfileReturnedRows } from "./ProfileEvidenceState";

type EconomicRead = ReturnType<typeof useProfileDistrictEconomicContext>;
type Metric = ProfileDistrictEconomicContext["metrics"][number];
type EconomicEvidence = ProfileEconomicFootprint["evidence"][number];
const text = (value: string | number | null | undefined) =>
  value ?? "Not provided";
const label = (value: string) => value.replaceAll("_", " ");

export function FacilityEconomicSections({
  scope,
  open,
  ids,
}: {
  scope: ProfileEvidenceScope;
  open: boolean;
  ids: { economic: string; unemployment: string; workforce: string };
}) {
  const footprint = useProfileEconomicFootprint(scope, open);
  const district = useProfileDistrictEconomicContext(scope, open);
  if (!open) return null;
  const context =
    district.enabled && !district.error ? district.data : undefined;
  return (
    <>
      <ClientEconomicSection
        id={ids.economic}
        facilityId={scope.facilityId}
        query={footprint}
      />
      <DistrictMetricSection
        id={ids.unemployment}
        title="Unemployment"
        source="acs"
        query={district}
        context={context}
        metrics={
          context?.metrics.filter(
            (item) =>
              item.source === "acs" &&
              item.metricKey === "unemployment_rate_percent",
          ) ?? []
        }
        description="ACS unemployment estimates describe the district, not this facility or its employees. Each returned dataset year is shown separately."
        empty="No ACS unemployment_rate_percent values are available in the current district response. Missing values are not zero."
      />
      <DistrictMetricSection
        id={ids.workforce}
        title="Workforce and commuting"
        source="lodes"
        query={district}
        context={context}
        metrics={
          context?.metrics.filter((item) => item.source === "lodes") ?? []
        }
        description="LODES measures describe district jobs, workforce or commuting where source aggregates are loaded. They do not establish facility employment or local hiring."
        empty="Workforce and commuting measures are unavailable in this district response. Do not infer them from the facility staff preview."
      />
    </>
  );
}

function ClientEconomicSection({
  id,
  facilityId,
  query,
}: {
  id: string;
  facilityId: string;
  query: ReturnType<typeof useProfileEconomicFootprint>;
}) {
  const data = query.enabled && !query.error ? query.data : undefined;
  const records = data?.evidence.filter(
    (item) => item.promotedFacilityId === facilityId,
  );
  return (
    <section
      id={id}
      tabIndex={-1}
      className={styles.card}
      aria-labelledby={`${id}-heading`}
    >
      <h3 id={`${id}-heading`}>Client economic footprint</h3>
      <p className={styles.source}>
        Client figures are separate from district public statistics. Only
        evidence explicitly linked to this location is shown; planned, estimated
        and current employment cannot be inferred from a count alone.
      </p>
      <EconomicReadState query={query} district={false} />
      {data && (
        <>
          <p className={styles.source}>
            Latest 1,000 client evidence records at most; this is not a
            period-complete history. Facility staff previews and imported
            evidence are not added together. Response generated:{" "}
            {data.generatedAt}.
          </p>
          {!records?.length && (
            <p className={styles.state}>
              No returned economic evidence is explicitly linked to this
              location. Unlinked and other-location records are not attributed
              here.
            </p>
          )}
          <div className={styles.records}>
            {records && (
              <ProfileReturnedRows
                rows={records}
                rowKey={(record) => record.id}
                render={(record) => <LocationEvidence value={record} />}
              />
            )}
          </div>
          <EvidenceWarnings values={data.warnings} />
        </>
      )}
    </section>
  );
}

function EconomicReadState({
  query,
  district,
}: {
  query: Pick<
    EconomicRead,
    "enabled" | "scopeAvailable" | "isPending" | "error"
  > & { refetch: () => unknown };
  district: boolean;
}) {
  if (!query.enabled)
    return (
      <p className={styles.state}>
        {district && !query.scopeAvailable
          ? "A resolved location district is required for this public district context."
          : "A current session and matching client/location scope are required."}
      </p>
    );
  return (
    <QueryState
      pending={query.isPending}
      error={query.error}
      retry={() => void query.refetch()}
    />
  );
}

function LocationEvidence({ value }: { value: EconomicEvidence }) {
  return (
    <article className={styles.record}>
      <h4>{value.subjectName ?? label(value.evidenceType)}</h4>
      <p className={styles.source}>
        Explicit location attribution · Supporting record {value.id}
      </p>
      <dl className={styles.rows}>
        {[
          ["Evidence type", label(value.evidenceType)],
          ["Value", value.numericValue],
          ["Unit", value.unit],
          ["Currency", value.currency],
          ["Review status", label(value.reviewStatus)],
          ["Verification status", label(value.verificationStatus)],
          [
            "External use",
            value.externalUseApproved ? "Approved" : "Not approved",
          ],
          ["Effective from", value.effectiveFrom],
          ["Effective to", value.effectiveTo],
          ["Observed at", value.observedAt],
          ["Reviewed at", value.reviewedAt],
          ["Record created", value.createdAt],
          ["Import record", value.importId],
          ["Import row", value.rowOrdinal],
          ["Reported state", value.state],
          ["Reported district", value.congressionalDistrict],
          ["Boundary Congress", value.boundaryCongress],
        ].map(([name, value]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{text(value)}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function DistrictMetricSection({
  id,
  title,
  source,
  query,
  context,
  metrics,
  description,
  empty,
}: {
  id: string;
  title: string;
  source: "acs" | "lodes";
  query: EconomicRead;
  context: ProfileDistrictEconomicContext | undefined;
  metrics: Metric[];
  description: string;
  empty: string;
}) {
  return (
    <section
      id={id}
      tabIndex={-1}
      className={styles.card}
      aria-labelledby={`${id}-heading`}
    >
      <h3 id={`${id}-heading`}>{title}</h3>
      <p className={styles.source}>{description}</p>
      <EconomicReadState query={query} district />
      {context && (
        <>
          <p className={styles.source}>
            District {context.districtKey} · Response generated{" "}
            {context.generatedAt}. Returned vintages are not collapsed into a
            presumed latest period.
          </p>
          {!metrics.length && <p className={styles.state}>{empty}</p>}
          <div className={styles.metrics}>
            {metrics.map((metric, index) => (
              <PublicMetric
                key={`${metric.source}:${metric.dataset}:${metric.sourceYear}:${metric.metricKey}:${index}`}
                metric={metric}
              />
            ))}
          </div>
          <SourceRuns
            source={source}
            values={context.sources.filter((run) => run.source === source)}
          />
          <EvidenceWarnings values={context.warnings} />
        </>
      )}
    </section>
  );
}

function PublicMetric({ metric }: { metric: Metric }) {
  return (
    <article className={styles.metric}>
      <h4>{label(metric.metricKey)}</h4>
      <strong className={styles.value}>
        {metric.value ?? "Not available"}
      </strong>
      <dl className={styles.rows}>
        {[
          ["Unit", metric.unit],
          ["Dataset", metric.dataset],
          ["Dataset year", metric.sourceYear],
          ["Boundary Congress", metric.boundaryCongress],
          ["Margin of error", metric.marginOfError],
          ["NAICS code", metric.naicsCode],
          ["Observed at", metric.observedAt],
          ["Last synced", metric.lastSyncedAt],
          ["Source record", metric.sourceRecordId],
          ["Source URL", metric.sourceUrl],
        ].map(([name, value]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{text(value)}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function SourceRuns({
  source,
  values,
}: {
  source: "acs" | "lodes";
  values: ProfileDistrictEconomicContext["sources"];
}) {
  return (
    <div className={styles.records}>
      <h4>{source.toUpperCase()} source sync</h4>
      {!values.length && (
        <p className={styles.source}>
          No {source.toUpperCase()} source sync status was returned.
        </p>
      )}
      {values.map((run, index) => (
        <div
          className={styles.record}
          key={`${run.dataset}:${run.sourceYear}:${index}`}
        >
          <strong>
            {run.dataset} · {run.sourceYear ?? "Year unavailable"}
          </strong>
          <dl className={styles.rows}>
            {[
              ["Status", label(run.status)],
              ["Cadence", "Annual"],
              ["Boundary Congress", run.boundaryCongress],
              ["Last attempt", run.lastAttemptAt],
              ["Last completed", run.lastCompletedAt],
              ["Rows seen", run.rowsSeen],
              ["Rows written", run.rowsWritten],
              ["Rows rejected", run.rowsRejected],
            ].map(([name, value]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{text(value)}</dd>
              </div>
            ))}
          </dl>
          {run.error && (
            <p className={styles.source}>This source reported an error.</p>
          )}
        </div>
      ))}
    </div>
  );
}

function EvidenceWarnings({ values }: { values: string[] }) {
  return values.length ? (
    <ul className={styles.source} aria-label="Source limitations">
      {values.map((value, index) => (
        <li key={`${index}:${value}`}>{value}</li>
      ))}
    </ul>
  ) : null;
}
