"use client";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useCapabilityFit } from "./queries";
import { useRefreshFit } from "./mutations";
import { fitLink, type fitSchema } from "./contracts";
import type { z } from "zod";
import styles from "./capabilities.module.css";

type FitQuery = ReturnType<typeof useCapabilityFit>;
type FitRefresh = ReturnType<typeof useRefreshFit>;

export function CapabilityFit({
  clientId,
  existingApp,
  compact = false,
}: {
  clientId: string;
  existingApp?: string;
  compact?: boolean;
}) {
  const query = useCapabilityFit(clientId);
  const result = query.isSuccess && !query.error ? query.data : undefined;
  const refresh = useRefreshFit(clientId, Boolean(result));
  return compact ? (
    <CompactFit query={query} refresh={refresh} existingApp={existingApp} />
  ) : (
    <FullFit query={query} refresh={refresh} existingApp={existingApp} />
  );
}

function CompactFit({
  query,
  refresh,
  existingApp,
}: {
  query: FitQuery;
  refresh: FitRefresh;
  existingApp?: string;
}) {
  const result = query.isSuccess && !query.error ? query.data : undefined;
  const preview = result?.matches.slice(0, 3) ?? [];
  return (
    <section className={styles.fitStrip} aria-label="Capability fit">
      <span className={styles.fitIcon} aria-hidden="true">
        !
      </span>
      <div className={styles.fitCopy}>
        <p>Where capabilities create fit</p>
        <details className={styles.fitDetails}>
          <summary>
            {result
              ? `${result.matches.length} fit ${result.matches.length === 1 ? "match" : "matches"} available`
              : "Capability fit"}
          </summary>
          {result && (
            <div className={styles.fitExpanded}>
              <small>
                {result.status === "stale"
                  ? "Profile changed; refresh these matches. "
                  : ""}
                {result.computedAt
                  ? `Computed ${new Date(result.computedAt).toLocaleString()}`
                  : result.status === "unavailable"
                    ? "Compute time unavailable"
                    : "Not computed yet"}
              </small>
              {result.matches.map((match) => (
                <article key={match.id}>
                  <strong>
                    {match.target} · Fit {match.fit}/100
                  </strong>
                  <p>{match.why}</p>
                  {fitLink(match.href, existingApp) && (
                    <a href={fitLink(match.href, existingApp)}>Open target ↗</a>
                  )}
                </article>
              ))}
              {result.matches.length === 0 && !result.emptyReason && (
                <p>No matches available.</p>
              )}
            </div>
          )}
        </details>
        <p className={styles.fitPreview}>
          {result?.status === "stale" && "Profile changed; refresh. "}
          {preview.length > 0
            ? preview.map((match, index) => {
                const href = fitLink(match.href, existingApp);
                return (
                  <span key={match.id}>
                    {index > 0 && " · "}
                    {index === 0 && href ? (
                      <a href={href} aria-label="Open target">
                        {match.target}
                      </a>
                    ) : (
                      match.target
                    )}
                  </span>
                );
              })
            : result
              ? "No matches available."
              : "Fit details unavailable."}
        </p>
        {result && <FitCoverage result={result} />}
        <QueryState
          pending={query.isPending}
          error={query.error ?? refresh.error}
          retry={() => void query.refetch()}
        />
      </div>
      <button
        className={`button ${styles.fitAction}`}
        disabled={!refresh.canWrite || refresh.isPending || query.isFetching}
        onClick={() => refresh.mutate()}
      >
        {refresh.isPending ? "Refreshing…" : "Refresh"}
      </button>
    </section>
  );
}

function FullFit({
  query,
  refresh,
  existingApp,
}: {
  query: FitQuery;
  refresh: FitRefresh;
  existingApp?: string;
}) {
  const result = query.isSuccess && !query.error ? query.data : undefined;
  return (
    <section className="card stack">
      <header className="row between">
        <div>
          <p className="eyebrow">Where capabilities create fit</p>
          <h3>
            {result ? `${result.matches.length} fit matches` : "Capability fit"}
          </h3>
        </div>
        <button
          className="button"
          disabled={!refresh.canWrite || refresh.isPending || query.isFetching}
          onClick={() => refresh.mutate()}
        >
          {refresh.isPending ? "Refreshing…" : "Refresh"}
        </button>
      </header>
      <QueryState
        pending={query.isPending}
        error={query.error ?? refresh.error}
        retry={() => void query.refetch()}
      />
      {result && (
        <>
          <small>
            {result.status === "stale"
              ? "Profile changed; refresh these matches. "
              : ""}
            {result.computedAt
              ? `Computed ${new Date(result.computedAt).toLocaleString()}`
              : result.status === "unavailable"
                ? "Compute time unavailable"
                : "Not computed yet"}
          </small>
          <FitCoverage result={result} />
          {result.matches.map((match) => (
            <article key={match.id} className="stack">
              <div className="row">
                <strong>{match.target}</strong>
                <span className="chip">Fit {match.fit}/100</span>
              </div>
              <p className="muted">{match.why}</p>
              {fitLink(match.href, existingApp) && (
                <a href={fitLink(match.href, existingApp)}>Open target ↗</a>
              )}
            </article>
          ))}
          {result.matches.length === 0 && !result.emptyReason && (
            <p>No matches available.</p>
          )}
        </>
      )}
    </section>
  );
}

function FitCoverage({ result }: { result: z.infer<typeof fitSchema> }) {
  const labels = {
    ready: "Fit results available",
    empty: "No fit results",
    profile_too_thin: "More profile detail needed",
    stale: "Saved results may be outdated",
    partial: "Partial coverage",
    unavailable: "Fit unavailable",
  };
  return (
    <div className="stack" aria-label="Fit coverage">
      <p className="muted">{labels[result.status]}</p>
      {result.emptyReason && <p className="status">{result.emptyReason}</p>}
      {result.sources ? (
        <>
          <ul className="muted">
            {(
              [
                ["Program elements", result.sources.pe],
                ["Bills", result.sources.bill],
                ["Funding opportunities", result.sources.fo],
              ] as const
            ).map(([label, contributed]) => (
              <li key={label}>
                {label}: {contributed ? "contributed" : "not confirmed"}
              </li>
            ))}
          </ul>
          <small>
            Source contributions do not establish full catalog coverage.
          </small>
        </>
      ) : (
        <small>Source contributions unknown</small>
      )}
      {(result.status === "partial" || result.status === "unavailable") && (
        <small>
          Incomplete refreshes do not replace saved results. Reloading reads the
          last saved result, if any.
        </small>
      )}
    </div>
  );
}
