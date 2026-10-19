"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { ProgramElement } from "../../../shared/capiro/operations/intelligence-defense";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./intelligence.module.css";
import { ProgramElementProfile } from "./ProgramElementProfile";
const money = (value: string | number | null | undefined) =>
  value == null ? "Not available" : `$${value}M`;
export function DefenseBudget() {
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [service, setService] = useState("");
  const [watched, setWatched] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ProgramElement>();
  const [peCode, setPeCode] = useState(params.get("peCode") || "");
  const query = useCapiroQuery("intelligence.defense.list", {
    query: {
      q,
      service: service || undefined,
      watched: watched ? "true" : undefined,
      page,
      limit: 25,
    },
  });
  if (peCode)
    return (
      <ProgramElementProfile
        peCode={peCode}
        onBack={() => {
          setPeCode("");
          query.reload();
        }}
      />
    );
  return (
    <>
      <div className={styles.toolbar}>
        <TextInput
          aria-label="Search defense budget lines"
          placeholder="PE code, program or capability…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          className={styles.select}
          aria-label="Service"
          value={service}
          onChange={(e) => {
            setService(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Service · Any</option>
          {["Army", "Navy", "Air Force", "Space Force", "Defense-wide"].map(
            (s) => (
              <option key={s}>{s}</option>
            ),
          )}
        </select>
        <ActionButton
          aria-pressed={watched}
          onClick={() => {
            setWatched(!watched);
            setPage(1);
          }}
        >
          {watched ? "Watching only" : "Watchlist"}
        </ActionButton>
        <ActionButton
          onClick={() => {
            setQ("");
            setService("");
            setWatched(false);
            setPage(1);
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
          <Panel
            title={
              query.data
                ? `${query.data.total} program elements`
                : "Defense Budget"
            }
          >
            <DataTable
              rows={query.data?.data || []}
              rowKey={(r) => r.peCode}
              caption="Defense program elements"
              columns={[
                {
                  key: "pe",
                  label: "Program element / title",
                  render: (r) => (
                    <button
                      className={styles.link}
                      onClick={() => setSelected(r)}
                    >
                      <strong>{r.peCode}</strong>
                      <div>{r.title}</div>
                    </button>
                  ),
                },
                {
                  key: "service",
                  label: "Service",
                  render: (r) => r.service || "—",
                },
                {
                  key: "request",
                  label: "Request",
                  render: (r) => (
                    <>
                      {money(r.latestRequest)}
                      <div className={styles.muted}>
                        {r.latestRequestFy
                          ? `FY${r.latestRequestFy}`
                          : "Fiscal year unavailable"}
                      </div>
                    </>
                  ),
                },
                {
                  key: "position",
                  label: "Current position",
                  render: (r) => (
                    <>
                      {money(r.latestCurrent)}
                      <div className={styles.muted}>
                        {[
                          r.latestCurrentFy && `FY${r.latestCurrentFy}`,
                          r.latestCurrentStage,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </>
                  ),
                },
                {
                  key: "signal",
                  label: "Signal",
                  render: (r) => r.signalType || "—",
                },
              ]}
            />
            <footer className={styles.footer}>
              <span>Page {page}</span>
              <div className={styles.actions}>
                <ActionButton
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </ActionButton>
                <ActionButton
                  disabled={page * 25 >= (query.data?.total || 0)}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </ActionButton>
              </div>
            </footer>
          </Panel>
          {selected && (
            <Panel title={selected.title} description={selected.peCode}>
              <dl className={styles.details}>
                {[
                  ["Service", selected.service],
                  ["Budget activity", selected.budgetActivity],
                  ["Appropriation", selected.appropriationType],
                  ["Current stage", selected.latestCurrentStage],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v || "Not provided"}</dd>
                  </div>
                ))}
              </dl>
              <div className={styles.actions}>
                <ActionButton
                  primary
                  onClick={() => setPeCode(selected.peCode)}
                >
                  Open line profile
                </ActionButton>
              </div>
            </Panel>
          )}
        </div>
      </StatusPanel>
    </>
  );
}
