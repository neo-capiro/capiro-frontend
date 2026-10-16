"use client";
import type { Destinations } from "@/shared/portfolio/config/config";
import { Temporal } from "temporal-polyfill";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useCapiroQuery } from "@/shared/capiro/queries";
import {
  currentStrategyHref,
  strategyHref,
} from "@/shared/capiro/strategy-navigation";
import { useStrategies, useStrategyDetails } from "./queries";
import { workProjection } from "./contracts";
import { workOwnerLabel } from "./owners";
import { WorkspaceDocuments } from "./WorkspaceDocuments";
import {
  isRetryingWorkFailure,
  WorkStrategyFailure,
  WorkStrategyUnavailable,
} from "./WorkStrategyState";
import styles from "./work.module.css";
export function WorkPage({
  clientId,
  destinations,
}: {
  clientId: string;
  destinations: Destinations;
}) {
  const members = useCapiroQuery("settings.tenantMembers", {});
  const ownerLabel = (ownerId: string | null) =>
    workOwnerLabel(ownerId, members.data);
  const summaries = useStrategies(clientId);
  const currentSummaries =
    summaries.isSuccess && !summaries.error ? summaries.data : undefined;
  const queries = useStrategyDetails(
    clientId,
    (currentSummaries ?? []).map((summary) => summary.id),
  );
  const details = queries.flatMap((query) =>
    query.isSuccess && !query.error ? [query.data] : [],
  );
  const complete =
    currentSummaries !== undefined &&
    queries.every((query) => query.isSuccess && !query.error);
  const projection = workProjection(
    details,
    Temporal.Now.plainDateISO().toString(),
  );
  const strategyLink = (id: string, nodeId?: string) =>
    currentStrategyHref(clientId, id, nodeId);
  const error = summaries.error ?? queries.find((query) => query.error)?.error;
  const summariesUnavailable =
    Boolean(summaries.error) || isRetryingWorkFailure(summaries);
  const retryingDetailFailure = queries.some(isRetryingWorkFailure);
  return (
    <div className="page stack">
      <header className="row between">
        <h1>Client work</h1>
        <div className={styles.actions}>
          <span className={styles.source}>Source of truth: Strategies</span>
          <a className="button" href={strategyHref({ clientId })}>
            Open Strategies
          </a>
          <a
            className="button primary"
            href={strategyHref({ clientId, create: true })}
          >
            New strategy
          </a>
        </div>
      </header>
      {summariesUnavailable ? (
        <WorkStrategyUnavailable />
      ) : (
        <section
          className={styles.pulse}
          aria-label="Client strategy portfolio"
        >
          <h2>Client strategy portfolio</h2>
          {[
            ["Current strategies", currentSummaries?.length],
            [
              "Active / in progress",
              complete ? projection.live.length : undefined,
            ],
            ["Next 30 days", complete ? projection.upcoming.length : undefined],
            ["Open risks", complete ? projection.risks.length : undefined],
            ["Linked artifacts", complete ? projection.artifacts : undefined],
          ].map(([label, count]) => (
            <div key={label}>
              <strong>{count ?? "—"}</strong>
              <span>{label}</span>
            </div>
          ))}
        </section>
      )}
      {error || summariesUnavailable || retryingDetailFailure ? (
        <WorkStrategyFailure
          error={error}
          partial={!summariesUnavailable}
          retrying={
            summaries.isFetching || queries.some((query) => query.isFetching)
          }
          onRetry={() => {
            void summaries.refetch();
            queries.forEach((query) => void query.refetch());
          }}
        />
      ) : (
        <QueryState
          pending={
            summaries.isPending || queries.some((query) => query.isPending)
          }
        />
      )}
      {members.error && (
        <div role="status" className="row">
          <p>Owner names could not be loaded.</p>
          <button className="button" onClick={members.reload}>
            Retry owner names
          </button>
        </div>
      )}
      <WorkspaceDocuments
        clientId={clientId}
        destinations={destinations}
        members={members.data}
      />
      {!summariesUnavailable && (
        <div className={styles.columns}>
          <section className="stack" aria-label="Strategies">
            {details.map((strategy) => (
              <article key={strategy.id} className="card stack">
                <p className="eyebrow">
                  {strategy.type}
                  {strategy.draftedByMeri && " · Drafted with Meri"}
                </p>
                <header className="row between">
                  <h2>{strategy.title}</h2>
                  <a href={strategyLink(strategy.id)}>Open strategy ↗</a>
                </header>
                <p className="muted">{strategy.goal ?? "No goal provided."}</p>
                <small className={styles.owner}>
                  Owner: {ownerLabel(strategy.ownerUserId)}
                </small>
                <small>
                  Target {strategy.targetDate?.slice(0, 10) ?? "not set"}
                </small>
                <h3>Next strategy nodes</h3>
                {strategy.nodes
                  .filter((n) => n.status !== "completed")
                  .slice(0, 5)
                  .map((node) => (
                    <div className="row between" key={node.id}>
                      <span className="stack">
                        <span>{node.title}</span>
                        <small className={styles.owner}>
                          Owner: {ownerLabel(node.ownerUserId)}
                        </small>
                      </span>
                      <span className="chip">
                        {node.status.replaceAll("_", " ")}
                      </span>
                      <small>{node.startsOn.slice(0, 10)}</small>
                      <a href={strategyLink(strategy.id, node.id)}>
                        Open step ↗
                      </a>
                    </div>
                  ))}
              </article>
            ))}
            {currentSummaries?.length === 0 && (
              <p className="empty">No current strategies for this client.</p>
            )}
          </section>
          <aside className="stack">
            <section className="card stack">
              <h2>Upcoming work</h2>
              <small>
                Active and in-progress nodes starting in the next 30 days.
              </small>
              {projection.upcoming.map((node) => (
                <div className="stack" key={node.id}>
                  <strong>{node.title}</strong>
                  <small>
                    {node.startsOn.slice(0, 10)} · {node.strategyTitle}
                  </small>
                  <div className="row">
                    <small className={styles.owner}>
                      Owner: {ownerLabel(node.ownerUserId)}
                    </small>
                    <span className="chip">
                      {node.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <a href={strategyLink(node.strategyId, node.id)}>
                    Open step ↗
                  </a>
                </div>
              ))}
              {complete && projection.upcoming.length === 0 && (
                <p className="muted">No dated work in this range.</p>
              )}
            </section>
            <section className="card stack">
              <h2>Risks &amp; blockers</h2>
              {projection.risks.map((node) => (
                <article key={node.id} className={styles.risk}>
                  <strong>{node.title}</strong>
                  <p>{node.note}</p>
                  <small className={styles.owner}>
                    Owner: {ownerLabel(node.ownerUserId)}
                  </small>
                  <small>
                    {node.openEnded ? "Ongoing" : node.startsOn.slice(0, 10)}
                  </small>
                  <p>
                    <a href={strategyLink(node.strategyId, node.id)}>
                      Open risk ↗
                    </a>
                  </p>
                </article>
              ))}
              {complete && projection.risks.length === 0 && (
                <p className="muted">No open risks.</p>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
