"use client";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useCapabilityFit } from "./queries";
import { useRefreshFit } from "./mutations";
import { fitLink } from "./contracts";
export function CapabilityFit({
  clientId,
  existingApp,
}: {
  clientId: string;
  existingApp?: string;
}) {
  const query = useCapabilityFit(clientId);
  const result = query.isSuccess && !query.error ? query.data : undefined;
  const refresh = useRefreshFit(clientId, Boolean(result));
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
              : "Not computed yet"}
          </small>
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
          {result.matches.length === 0 && (
            <p>{result.emptyReason ?? "No matches available."}</p>
          )}
        </>
      )}
    </section>
  );
}
