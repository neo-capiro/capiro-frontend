"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  PageHeader,
  StatusPanel,
} from "../../../shared/module-ui";
import { ResearchPortfolioDetail } from "./ResearchDetail";
import { ResearchCreateAction } from "./ResearchCreate";
import styles from "./research.module.css";
export function ResearchPortfoliosScreen() {
  const params = useSearchParams();
  const [id, setId] = useState(params.get("portfolioId") || "");
  const [role, setRole] = useState("");
  const [mode, setMode] = useState("");
  const [lifecycle, setLifecycle] = useState("active");
  const [cursor, setCursor] = useState<string>();
  const [history, setHistory] = useState<(string | undefined)[]>([]);
  const query = useCapiroQuery("research.list", {
    query: { cursor, limit: 50 },
  });
  const rows = (query.data?.items || []).filter(
    (r) =>
      (!role || r.myRole === role) &&
      (!mode || r.mode === mode) &&
      (!lifecycle || r.lifecycle === lifecycle),
  );
  const view = params.get("view") || "overview";
  if (id)
    return (
      <ResearchPortfolioDetail
        id={id}
        initialView={view}
        onBack={() => {
          setId("");
          query.reload();
        }}
      />
    );
  return (
    <>
      <PageHeader
        title="Research Portfolios"
        description={
          view !== "overview"
            ? `Choose a portfolio to open ${view}.`
            : undefined
        }
        actions={
          <ResearchCreateAction
            onCreated={(portfolioId) => {
              query.reload();
              setId(portfolioId);
            }}
          />
        }
      />
      <div className={styles.toolbar}>
        <select
          className={styles.select}
          aria-label="Portfolio role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Role · Any</option>
          {["owner", "editor", "viewer"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select
          className={styles.select}
          aria-label="Portfolio mode"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="">Mode · Any</option>
          {["manual", "rules", "hybrid"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select
          className={styles.select}
          aria-label="Portfolio status"
          value={lifecycle}
          onChange={(e) => setLifecycle(e.target.value)}
        >
          <option value="">Status · All</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <div className={styles.cards}>
          {rows.map((r) => (
            <button
              key={r.id}
              className={styles.card}
              onClick={() => setId(r.id)}
            >
              <header>
                <h2>{r.name}</h2>
                <Badge tone={r.lifecycle === "active" ? "success" : "neutral"}>
                  {r.lifecycle}
                </Badge>
              </header>
              <p>{r.purpose || "Purpose not provided"}</p>
              <dl>
                {[
                  ["Members", r.memberCount],
                  ["Clients", r.clientLinkCount],
                  ["Role", r.myRole],
                  ["Mode", r.mode],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </button>
          ))}
        </div>
        {!rows.length && <p>No portfolios match the current filters.</p>}
        <footer className={styles.footer}>
          <ActionButton
            disabled={!history.length}
            onClick={() => {
              setCursor(history[history.length - 1]);
              setHistory(history.slice(0, -1));
            }}
          >
            Previous
          </ActionButton>
          <ActionButton
            disabled={!query.data?.nextCursor}
            onClick={() => {
              setHistory([...history, cursor]);
              setCursor(query.data?.nextCursor || undefined);
            }}
          >
            Next
          </ActionButton>
        </footer>
      </StatusPanel>
    </>
  );
}
