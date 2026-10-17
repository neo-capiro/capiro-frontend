"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  PageHeader,
  StatusPanel,
} from "../../../shared/module-ui";
import { ResearchPortfolioDetail } from "./ResearchDetail";
import { ResearchCreateAction } from "./ResearchCreate";
import {
  readResearchPortfolioFilters,
  readResearchPortfolioView,
  researchPortfolioHref,
  type ResearchPortfolioFilters,
  type ResearchPortfolioView,
} from "./research-navigation";
import styles from "./research.module.css";
export function ResearchPortfoliosScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("portfolioId") || "";
  const view = readResearchPortfolioView(params.get("view"));
  const filters = readResearchPortfolioFilters(params);
  const { role, mode, lifecycle } = filters;
  const filterKey = `${role}:${mode}:${lifecycle}`;
  const navigate = (
    portfolioId: string,
    nextView: ResearchPortfolioView = view,
  ) =>
    router.push(
      researchPortfolioHref({ portfolioId, view: nextView }, params.toString()),
    );
  const changeFilter = (key: keyof ResearchPortfolioFilters, value: string) => {
    const requested = new URLSearchParams(params.toString());
    requested.set(key, value);
    router.push(
      researchPortfolioHref(
        {
          portfolioId: id,
          view,
          filters: readResearchPortfolioFilters(requested),
        },
        params.toString(),
      ),
    );
  };
  const [pagination, setPagination] = useState<{
    filterKey: string;
    cursor?: string;
    history: (string | undefined)[];
  }>({ filterKey, cursor: undefined, history: [] });
  if (pagination.filterKey !== filterKey)
    setPagination({ filterKey, cursor: undefined, history: [] });
  const cursor =
    pagination.filterKey === filterKey ? pagination.cursor : undefined;
  const history = pagination.filterKey === filterKey ? pagination.history : [];
  const query = useCapiroQuery("research.list", {
    query: { cursor, limit: 50 },
  });
  const reloadList = query.reload;
  const wasDetail = useRef(Boolean(id));
  useEffect(() => {
    if (wasDetail.current && !id) reloadList();
    wasDetail.current = Boolean(id);
  }, [id, reloadList]);
  const rows = (query.data?.items || []).filter(
    (r) =>
      (!role || r.myRole === role) &&
      (!mode || r.mode === mode) &&
      (lifecycle === "all" || r.lifecycle === lifecycle),
  );
  if (id)
    return (
      <ResearchPortfolioDetail
        key={id}
        id={id}
        view={view}
        onView={(nextView) => navigate(id, nextView)}
        onBack={() => navigate("")}
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
              navigate(portfolioId);
            }}
          />
        }
      />
      <div className={styles.toolbar}>
        <select
          className={styles.select}
          aria-label="Portfolio role"
          value={role}
          onChange={(e) => changeFilter("role", e.target.value)}
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
          onChange={(e) => changeFilter("mode", e.target.value)}
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
          onChange={(e) => changeFilter("lifecycle", e.target.value)}
        >
          <option value="all">Status · All</option>
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
              onClick={() => navigate(r.id)}
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
              setPagination({
                filterKey,
                cursor: history[history.length - 1],
                history: history.slice(0, -1),
              });
            }}
          >
            Previous
          </ActionButton>
          <ActionButton
            disabled={!query.data?.nextCursor}
            onClick={() => {
              setPagination({
                filterKey,
                cursor: query.data?.nextCursor || undefined,
                history: [...history, cursor],
              });
            }}
          >
            Next
          </ActionButton>
        </footer>
      </StatusPanel>
    </>
  );
}
