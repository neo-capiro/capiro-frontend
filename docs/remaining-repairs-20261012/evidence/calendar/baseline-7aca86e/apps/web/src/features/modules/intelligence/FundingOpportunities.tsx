"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { FundingRecord } from "../../../shared/capiro/operations/intelligence-funding";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import { FundingDetail } from "./FundingDetail";
import styles from "./intelligence.module.css";
export function FundingOpportunities() {
  const params = useSearchParams();
  const clientId = params.get("clientId") || undefined;
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [lifecycle, setLifecycle] = useState("active");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<FundingRecord>();
  const [open, setOpen] = useState(false);
  const query = useCapiroQuery("intelligence.funding.search", {
    query: {
      query: q,
      mode: clientId ? "matched" : "all",
      clientId,
      source: source || undefined,
      lifecycle,
      sort: "deadline",
      direction: "asc",
      page,
      pageSize: 25,
    },
  });
  const d = query.data;
  if (open && selected)
    return (
      <FundingDetail
        record={selected}
        clientId={clientId}
        onBack={() => setOpen(false)}
      />
    );
  return (
    <>
      <div className={styles.toolbar}>
        <TextInput
          aria-label="Search funding opportunities"
          placeholder="Search opportunities…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          className={styles.select}
          aria-label="Source"
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Source · Any</option>
          {[
            "grants_gov",
            "sam_gov",
            "agency_forecast",
            "dibbs",
            "sbir_sttr",
            "ca_portal",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          className={styles.select}
          aria-label="Lifecycle"
          value={lifecycle}
          onChange={(e) => {
            setLifecycle(e.target.value);
            setPage(1);
          }}
        >
          {["active", "forecast", "closed", "post_award"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <ActionButton
          onClick={() => {
            setQ("");
            setSource("");
            setLifecycle("active");
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
              d?.total != null
                ? `${d.total.toLocaleString()}${d.totalIsCapped ? "+" : ""} opportunities`
                : "Funding Opportunities"
            }
            description={
              d && !d.catalogComplete
                ? "Coverage is partial. Review source freshness below."
                : undefined
            }
          >
            <DataTable
              rows={d?.opportunities || []}
              rowKey={(r) => r.id}
              caption="Funding opportunities"
              columns={[
                {
                  key: "title",
                  label: "Opportunity",
                  render: (r) => (
                    <button
                      className={styles.link}
                      onClick={() => {
                        setSelected(r);
                        setOpen(false);
                      }}
                    >
                      <strong>{r.title}</strong>
                      <div className={styles.muted}>
                        {r.agency} · {r.source}
                      </div>
                    </button>
                  ),
                },
                {
                  key: "type",
                  label: "Type",
                  render: (r) => <Badge>{r.type}</Badge>,
                },
                {
                  key: "deadline",
                  label: "Deadline",
                  render: (r) => r.deadline || "Not stated",
                },
                {
                  key: "value",
                  label: "Funding",
                  render: (r) =>
                    r.value == null
                      ? "Not stated"
                      : r.value.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        }),
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
                  disabled={
                    d?.total != null
                      ? page * 25 >= d.total
                      : (d?.opportunities.length || 0) < 25
                  }
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </ActionButton>
              </div>
            </footer>
            {d?.emptyReason && (
              <p className={styles.content}>{d.emptyReason}</p>
            )}
          </Panel>
          {selected && (
            <Panel
              title={selected.title}
              description={selected.agency || undefined}
            >
              <dl className={styles.details}>
                {[
                  ["Source", selected.source],
                  ["Deadline", selected.deadline],
                  ["Eligibility", selected.eligibility?.state],
                  ["Status", selected.lifecycle],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v || "Not provided"}</dd>
                  </div>
                ))}
              </dl>
              <p className={styles.content}>
                {selected.summary || "Summary not provided"}
              </p>
              <div className={styles.actions}>
                <ActionButton primary onClick={() => setOpen(true)}>
                  Open opportunity
                </ActionButton>
              </div>
            </Panel>
          )}
        </div>
        <div className={styles.content}>
          {d?.freshness.map((f) => (
            <p key={f.source}>
              {f.source} · {f.state} ·{" "}
              {f.lastSyncedAt || "Freshness unavailable"}
            </p>
          ))}
        </div>
      </StatusPanel>
    </>
  );
}
