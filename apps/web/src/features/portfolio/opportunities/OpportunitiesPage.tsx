"use client";
import { useRouter, useSearchParams } from "next/navigation";
import type { Destinations } from "@/shared/portfolio/config/config";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useMatchedOpportunities, useRelevantPrograms } from "./queries";
import {
  boundedPage,
  opportunityDate,
  opportunityLink,
  pageWorkflowCounts,
} from "./presentation";
import { OpportunityResults } from "./OpportunityResults";
import { RelevantPrograms } from "./RelevantPrograms";
import styles from "./opportunities.module.css";
export function OpportunitiesPage({
  clientId,
  destinations,
}: {
  clientId: string;
  destinations: Destinations;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const query = (params.get("q") ?? "").slice(0, 512);
  const page = boundedPage(params.get("page"));
  const programPage = boundedPage(params.get("programPage"));
  const opportunities = useMatchedOpportunities(clientId, page, query);
  const programs = useRelevantPrograms(clientId, programPage);
  const base = destinations.existingApp;
  function set(values: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.push(`/portfolio/${clientId}/opportunities?${next}`, {
      scroll: false,
    });
  }
  const result =
    opportunities.isSuccess && !opportunities.error
      ? opportunities.data
      : undefined;
  const programResult =
    programs.isSuccess && !programs.error ? programs.data : undefined;
  const workflows = result
    ? pageWorkflowCounts(result.opportunities)
    : undefined;
  return (
    <div className="page stack">
      <header className="row between">
        <h1>Opportunities</h1>
        <button
          className="button"
          disabled={opportunities.isFetching || programs.isFetching}
          onClick={() => {
            void opportunities.refetch();
            void programs.refetch();
          }}
        >
          Refresh
        </button>
      </header>
      <section className={styles.stats} aria-label="Opportunity summary">
        {[
          [
            result?.counts.active ?? "Unavailable",
            "Available active opportunities",
          ],
          [workflows?.pursuing ?? "Unavailable", "Pursuing · this page"],
          [workflows?.saved ?? "Unavailable", "Saved · this page"],
          [programResult?.data.length ?? "Unavailable", "Programs shown"],
          [
            result?.opportunities.length
              ? opportunityDate(result.opportunities[0]?.deadline ?? null)
              : "Unavailable",
            "First deadline · this page",
          ],
        ].map(([value, label]) => (
          <div key={label}>
            <strong>
              {typeof value === "number"
                ? value.toLocaleString("en-US")
                : value}
            </strong>
            <span className="eyebrow">{label}</span>
          </div>
        ))}
      </section>
      <div className={styles.columns}>
        <section className="card stack" aria-label="Available opportunities">
          <header className="row between">
            <h2>Opportunities</h2>
            {base && result && (
              <a href={opportunityLink(base, clientId)}>Open recommendations</a>
            )}
          </header>
          <form
            className="toolbar"
            onSubmit={(event) => {
              event.preventDefault();
              const search = String(
                new FormData(event.currentTarget).get("query") ?? "",
              );
              set({ q: search.trim(), page: "1" });
            }}
          >
            <input
              key={query}
              name="query"
              aria-label="Search available opportunities"
              defaultValue={query}
              maxLength={512}
              placeholder="Search available opportunities"
            />
            <button className="button">Search</button>
          </form>
          <QueryState
            pending={opportunities.isPending}
            error={opportunities.error}
            retry={() => void opportunities.refetch()}
          />
          {result && (
            <>
              <OpportunityResults
                data={result}
                clientId={clientId}
                base={base}
              />
              <PageControls
                page={page}
                rows={result.opportunities.length}
                total={result.total}
                pageSize={result.pageSize}
                onChange={(value) => set({ page: String(value) })}
              />
            </>
          )}
        </section>
        <section className="card stack" aria-label="Relevant budget programs">
          <header className="row between">
            <h2>Relevant budget programs</h2>
            {base && programResult && (
              <a href={`${base}/program-elements`}>Open budget</a>
            )}
          </header>
          <QueryState
            pending={programs.isPending}
            error={programs.error}
            retry={() => void programs.refetch()}
          />
          {programResult && (
            <>
              <RelevantPrograms data={programResult} base={base} />
              <PageControls
                page={programPage}
                rows={programResult.data.length}
                total={programResult.total}
                pageSize={programResult.limit}
                onChange={(value) => set({ programPage: String(value) })}
              />
            </>
          )}
        </section>
      </div>
      {!base && (
        <p className="status">
          Opportunity and program details are unavailable until the existing
          application destination is configured.
        </p>
      )}
    </div>
  );
}
function PageControls({
  page,
  rows,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  rows: number;
  total: number | null;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="row between">
      <small>
        Page {page} · {rows.toLocaleString("en-US")} shown ·{" "}
        {total == null ? "Unknown" : total.toLocaleString("en-US")} total
      </small>
      <div className="row">
        <button
          className="button"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </button>
        <button
          className="button"
          disabled={total === null ? rows < pageSize : page * pageSize >= total}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
