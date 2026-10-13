"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { DistrictSummary } from "../../../shared/capiro/operations/intelligence-defense";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import { DistrictMap } from "./DistrictMap";
import styles from "./intelligence.module.css";
const dollars = (n: number | null) =>
  n == null
    ? "Not available"
    : n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });
export function DistrictNexus() {
  const params = useSearchParams();
  const [state, setState] = useState("");
  const [selected, setSelected] = useState<DistrictSummary>();
  const query = useCapiroQuery("intelligence.district.map", {
    query: {
      view: "current",
      clientId: params.get("clientId") || undefined,
      state: state || undefined,
    },
  });
  const rows = query.data?.districts || [];
  return (
    <>
      <div className={styles.toolbar}>
        <TextInput
          aria-label="Filter state"
          maxLength={2}
          placeholder="State abbreviation"
          value={state}
          onChange={(e) => setState(e.target.value.toUpperCase())}
        />
        <ActionButton
          onClick={() => {
            setState("");
            setSelected(undefined);
          }}
        >
          Clear all
        </ActionButton>
      </div>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <div className={styles.split}>
          <div className={styles.stack}>
            <Panel
              title="District footprint"
              description="Current districts. Contracts, grant obligations and grant outlays remain separate."
            >
              <DistrictMap districts={rows} onSelect={setSelected} />
            </Panel>
            <Panel title={`${rows.length} districts in scope`}>
              <DataTable
                rows={rows}
                rowKey={(r) => r.districtKey}
                caption="District Nexus metrics"
                columns={[
                  {
                    key: "district",
                    label: "District",
                    render: (r) => (
                      <button
                        className={styles.link}
                        onClick={() => setSelected(r)}
                      >
                        {r.districtKey}
                      </button>
                    ),
                  },
                  {
                    key: "clients",
                    label: "Clients",
                    render: (r) => r.clientCount,
                  },
                  {
                    key: "score",
                    label: "Nexus score",
                    render: (r) => r.score ?? "Unknown",
                  },
                  {
                    key: "coverage",
                    label: "Coverage",
                    render: (r) => `${r.coveragePercent}%`,
                  },
                  {
                    key: "contracts",
                    label: "Contract obligations",
                    render: (r) => dollars(r.awarded.contractObligations),
                  },
                ]}
              />
            </Panel>
          </div>
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
                  ["Contracts", dollars(selected.awarded.contractObligations)],
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
        <div className={styles.content}>
          {query.data?.warnings.map((w) => (
            <p key={w.code}>{w.message}</p>
          ))}
          {query.data?.freshness.map((f) => (
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
