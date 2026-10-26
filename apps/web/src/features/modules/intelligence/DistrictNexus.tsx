"use client";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import type { DistrictSummary } from "../../../shared/capiro/operations/intelligence-defense";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  PageHeader,
  Panel,
  SelectInput,
  StatusPanel,
} from "../../../shared/module-ui";
import { DistrictMap } from "./DistrictMap";
import { US_STATE_CODES } from "./us-states";
import styles from "./intelligence.module.css";
const dollars = (n: number | null) =>
  n == null
    ? "Not available"
    : n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });
/** Figma 1064:241658 shows compact card figures ($1.9B, $212M), not full amounts. */
const compact = (n: number | null) =>
  n == null
    ? "–"
    : n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      });
/**
 * Sum only over reported values. A district that never reported is not zero, so
 * an all-null set stays null and renders "–" rather than a fabricated $0.
 */
const sumReported = (values: (number | null)[]) => {
  const reported = values.filter((value): value is number => value != null);
  return reported.length
    ? reported.reduce((total, value) => total + value, 0)
    : null;
};
/**
 * "Firm nexus only" is offered as a narrowing filter but is NOT the default: a
 * district whose nexus score is unresolved is still a district in scope, and
 * defaulting to firm-only silently hid every unresolved one (most of them).
 */
const coverageOptions = [
  { value: "all", label: "All districts" },
  { value: "firm", label: "Firm nexus only" },
];
const colourOptions = [
  { value: "nexus", label: "Nexus" },
  { value: "coverage", label: "Coverage" },
];
const fundingOptions = [
  { value: "", label: "Any" },
  { value: "1000000", label: "$1M+" },
  { value: "10000000", label: "$10M+" },
  { value: "100000000", label: "$100M+" },
];
const sortOptions = [
  { value: "nexus", label: "Sort: Nexus" },
  { value: "contracts", label: "Sort: Contracts" },
  { value: "employees", label: "Sort: Employees" },
  { value: "district", label: "Sort: District" },
];
export function DistrictNexus({ tabs }: { tabs?: ReactNode }) {
  const params = useSearchParams();
  const [state, setState] = useState("");
  const [client, setClient] = useState(params.get("clientId") ?? "");
  const [coverage, setCoverage] = useState("all");
  const [colourBy, setColourBy] = useState("nexus");
  const [minFunding, setMinFunding] = useState("");
  const [sort, setSort] = useState("nexus");
  const [selection, setSelection] = useState<{
    scope: string;
    districtKey: string;
  }>();
  const clients = useCapiroQuery("clients.list", {});
  const input = {
    query: {
      view: "current" as const,
      clientId: client || undefined,
      state: state || undefined,
    },
  };
  const scope = JSON.stringify(input);
  const query = useCapiroQuery("intelligence.district.map", input);
  const inScope = useMemo(
    () => (!query.loading && !query.error ? (query.data?.districts ?? []) : []),
    [query.loading, query.error, query.data],
  );
  // Presentation filters apply on top of the requested scope, so the query key
  // stays the server scope and a chart choice never re-fetches.
  const rows = useMemo(() => {
    const threshold = minFunding ? Number(minFunding) : 0;
    const filtered = inScope.filter((row) => {
      if (coverage === "firm" && row.score == null) return false;
      if (threshold > 0 && (row.awarded.contractObligations ?? 0) < threshold)
        return false;
      return true;
    });
    const rank = (row: DistrictSummary) => {
      switch (sort) {
        case "contracts":
          return -(row.awarded.contractObligations ?? -1);
        case "employees":
          return -(row.employeeCount ?? -1);
        default:
          return -(row.score ?? -1);
      }
    };
    return [...filtered].sort((a, b) =>
      sort === "district"
        ? a.districtKey.localeCompare(b.districtKey)
        : rank(a) - rank(b),
    );
  }, [inScope, coverage, minFunding, sort]);
  const selected =
    selection?.scope === scope
      ? rows.find((row) => row.districtKey === selection.districtKey)
      : undefined;
  if (
    selection &&
    (selection.scope !== scope ||
      (!query.loading && !query.error && query.data && !selected))
  )
    setSelection(undefined);
  function select(row: DistrictSummary) {
    if (!query.loading && !query.error && rows.includes(row))
      setSelection({ scope, districtKey: row.districtKey });
  }
  const firmNexus = inScope.filter((row) => row.score != null).length;
  const statesInScope = new Set(inScope.map((row) => row.state)).size;
  const employees = sumReported(inScope.map((row) => row.employeeCount));
  const unreported = inScope.filter((row) => row.employeesUnreported).length;
  const contracts = sumReported(
    inScope.map((row) => row.awarded.contractObligations),
  );
  const grantOutlays = sumReported(
    inScope.map((row) => row.awarded.grantOutlays),
  );
  const opportunities = sumReported(
    inScope.map((row) => row.opportunities.opportunityEstimatedFunding),
  );
  const warnings = query.data?.warnings ?? [];
  const freshness = query.data?.freshness ?? [];
  const stateOptions = [
    { value: "", label: "All states" },
    ...US_STATE_CODES.map((code) => ({ value: code, label: code })),
  ];
  const clientOptions = [
    {
      value: "",
      label: clients.data?.length
        ? `All ${clients.data.length} clients`
        : "All clients",
    },
    ...(clients.data ?? []).map((entry) => ({
      value: entry.id,
      label: entry.name,
    })),
  ];
  const cards = [
    {
      label: "Districts",
      value: String(inScope.length),
      detail: `${firmNexus} firm nexus · ${statesInScope} states`,
    },
    {
      label: "Employees",
      value: employees == null ? "–" : employees.toLocaleString("en-US"),
      detail: `${unreported} districts not fully reported`,
    },
    { label: "Contracts", value: compact(contracts), detail: "DoD prime only" },
    { label: "Grants", value: compact(grantOutlays), detail: "outlaid" },
    {
      label: "Opportunities",
      value: opportunities == null ? "–" : compact(opportunities),
      detail: "not awarded money",
    },
  ];
  return (
    <>
      <PageHeader
        title="District Nexus"
        titleAccessory={
          <span className={styles.infoTip} aria-hidden="true">
            i
          </span>
        }
        actions={
          <>
            <span className={styles.scopeSelect}>
              <SelectInput
                aria-label="Scope"
                value={client}
                options={clientOptions}
                onValueChange={(next) => {
                  setClient(next);
                  setSelection(undefined);
                }}
              />
            </span>
            <ActionButton
              aria-label={`Freshness · ${freshness.length} sources`}
              title={freshness
                .map(
                  (entry) =>
                    `${entry.label}: ${entry.lastSyncedAt ?? "unknown"}`,
                )
                .join("\n")}
            >
              Freshness
            </ActionButton>
            <ActionButton
              aria-label={`Data quality · ${warnings.length}`}
              title={warnings.map((entry) => entry.message).join("\n")}
            >
              Data quality · {warnings.length}
            </ActionButton>
          </>
        }
      />
      {tabs}
      {/* Filters stay OUTSIDE StatusPanel: a refused read must not remove the
          controls needed to clear the filter that caused it. */}
      <div className={styles.filterRow}>
        <SelectInput
          aria-label="Client"
          value={client}
          options={[
            { value: "", label: "All clients" },
            ...(clients.data ?? []).map((entry) => ({
              value: entry.id,
              label: entry.name,
            })),
          ]}
          onValueChange={(next) => {
            setClient(next);
            setSelection(undefined);
          }}
        />
        <SelectInput
          aria-label="State"
          value={state}
          options={stateOptions}
          onValueChange={(next) => setState(next)}
        />
        <SelectInput
          aria-label="Coverage"
          value={coverage}
          options={coverageOptions}
          onValueChange={(next) => setCoverage(next)}
        />
        <SelectInput
          aria-label="Color by"
          value={colourBy}
          options={colourOptions}
          onValueChange={(next) => setColourBy(next)}
        />
        <SelectInput
          aria-label="Min funding"
          value={minFunding}
          options={fundingOptions}
          onValueChange={(next) => setMinFunding(next)}
        />
      </div>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <div className={styles.metrics}>
          {cards.map((card) => (
            <div key={card.label} className={styles.metric}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.detail}</small>
            </div>
          ))}
        </div>
        <div className={styles.split}>
          <Panel
            title="District footprint"
            description="Current districts. Contracts, grant obligations and grant outlays remain separate."
          >
            <DistrictMap
              districts={rows}
              onSelect={select}
              colorBy={colourBy === "coverage" ? "coverage" : "nexus"}
            />
            <ul className={styles.legend}>
              <li>
                <span className={styles.swatch} data-tone="none" /> No data
              </li>
              <li>
                <span className={styles.swatch} data-tone="resolved" /> Resolved
                district
              </li>
              <li>
                <span className={styles.swatch} data-tone="selected" /> Selected
              </li>
            </ul>
          </Panel>
          <div className={styles.stack}>
            <Panel
              title={`Districts · ${rows.length}`}
              actions={
                <span className={styles.scopeSelect}>
                  <SelectInput
                    aria-label="Sort districts"
                    value={sort}
                    options={sortOptions}
                    onValueChange={(next) => setSort(next)}
                  />
                </span>
              }
            >
              <DataTable
                rows={rows}
                rowKey={(r) => r.districtKey}
                caption="District Nexus metrics"
                columns={[
                  {
                    key: "district",
                    label: "District",
                    render: (r) => (
                      <>
                        <button
                          className={styles.link}
                          onClick={() => select(r)}
                        >
                          {r.districtKey}
                        </button>
                        {r.name && (
                          <span className={styles.districtName}>
                            {" · "}
                            {r.name}
                          </span>
                        )}
                      </>
                    ),
                  },
                  {
                    key: "nexus",
                    label: "Nexus",
                    render: (r) =>
                      r.score == null
                        ? "Unknown"
                        : r.score >= 60
                          ? "High"
                          : r.score >= 30
                            ? "Med"
                            : "Low",
                  },
                  {
                    key: "contracts",
                    label: "Contracts",
                    render: (r) => dollars(r.awarded.contractObligations),
                  },
                  {
                    key: "employees",
                    label: "Employees",
                    render: (r) =>
                      r.employeeCount == null
                        ? "Not reported"
                        : `${r.employeeCount.toLocaleString("en-US")}${r.employeesUnreported ? "+" : ""}`,
                  },
                ]}
              />
              <footer className={styles.footer}>
                <span>
                  {coverage === "firm"
                    ? "Firm nexus only · switch Coverage to include unresolved districts"
                    : `All ${inScope.length} districts in scope`}
                </span>
                <span>{rows.length} shown</span>
              </footer>
            </Panel>
            {selected && (
              <Panel
                title={selected.name || selected.districtKey}
                description={selected.districtKey}
              >
                <dl className={styles.details}>
                  {[
                    [
                      "Nexus score",
                      selected.score == null
                        ? "Unknown"
                        : `${selected.score}/100`,
                    ],
                    ["Evidence coverage", `${selected.coveragePercent}%`],
                    ["Clients", String(selected.clientCount)],
                    [
                      "Employees",
                      selected.employeeCount == null
                        ? "Not reported"
                        : `${selected.employeeCount}${selected.employeesUnreported ? "+" : ""}`,
                    ],
                    [
                      "Contracts",
                      dollars(selected.awarded.contractObligations),
                    ],
                    [
                      "Grant obligations",
                      dollars(selected.awarded.grantObligations),
                    ],
                    ["Grant outlays", dollars(selected.awarded.grantOutlays)],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                {selected.warnings.map((w) => (
                  <p key={w.code} className={styles.content}>
                    {w.message}
                  </p>
                ))}
              </Panel>
            )}
          </div>
        </div>
        <div className={styles.content}>
          {warnings.map((w) => (
            <p key={w.code}>{w.message}</p>
          ))}
          {freshness.map((f) => (
            <p key={f.source}>
              {f.label} ·{" "}
              {f.freshnessUnavailable
                ? "Freshness unknown"
                : f.neverSynced
                  ? "No successful sync"
                  : f.lastSyncedAt || "Freshness unavailable"}
            </p>
          ))}
        </div>
      </StatusPanel>
    </>
  );
}
