"use client";
import { useIntelligenceLocation } from "./intelligence-location";
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
  const { params, page, update } = useIntelligenceLocation();
  const q = (params.get("q") ?? "").slice(0, 500);
  const service = params.get("service") ?? "";
  const watched = params.get("watched") === "true";
  const peCode = params.get("peCode") ?? "";
  const setPage = (value: number) =>
    update({ page: String(value), record: null });
  const setPeCode = (value: string) => update({ peCode: value, peTab: null });
  const query = useCapiroQuery("intelligence.defense.list", {
    query: {
      q,
      service: service || undefined,
      watched: watched ? "true" : undefined,
      page,
      limit: 25,
    },
  });
  const selected = query.data?.data.find(
    (row) => row.peCode === params.get("record"),
  );
  if (peCode)
    return (
      <ProgramElementProfile
        key={peCode}
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
            update({ q: e.target.value, page: null, record: null }, true);
          }}
        />
        <select
          className={styles.select}
          aria-label="Service"
          value={service}
          onChange={(e) => {
            update({ service: e.target.value, page: null, record: null });
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
            update({
              watched: watched ? null : "true",
              page: null,
              record: null,
            });
          }}
        >
          {watched ? "Watching only" : "Watchlist"}
        </ActionButton>
        <ActionButton
          onClick={() => {
            update({
              q: null,
              service: null,
              watched: null,
              page: null,
              record: null,
            });
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
                      onClick={() => update({ record: r.peCode })}
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
