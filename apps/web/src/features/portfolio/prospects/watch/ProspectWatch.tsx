"use client";
import { useEffect, useState } from "react";
import { refusalOf, useProspectAlerts, useProspectWatch, useWatchActions, type Outcome } from "./api";
import type { AlertsPage, WatchAlert, WatchResponse } from "./contracts";
import { categoryLabel } from "./contracts";

/**
 * Prospect watch and alert review — the user entry for the existing Core owner.
 *
 * Server state only: the watch row, its per-source health, and every alert page Core returned. Mutations are
 * reconciled (see `runWatchAction`), so a lost acknowledgement never masquerades as a refusal: the outcome
 * banner reports what the re-read established, and when even that re-read failed the state-changing controls
 * stay closed behind an explicit Retry instead of re-sending a change nobody can describe.
 */
export function ProspectWatch({ prospectId }: { prospectId: string }) {
  const watch = useProspectWatch(prospectId);
  const alerts = useProspectAlerts(prospectId);
  const [outcome, setOutcome] = useState<Outcome>();
  const [recovering, setRecovering] = useState(false);
  const actions = useWatchActions(prospectId, setOutcome);

  // A different prospect is a different inbox: previous pages and outcome text must not carry over.
  useEffect(() => {
    setOutcome(undefined);
    setRecovering(false);
  }, [prospectId]);

  // Keep the rows the user is reviewing: a failed re-read must not blank the list that the recovery
  // lock is protecting. The set is still Core's own pages, never synthesised.
  const [lastPages, setLastPages] = useState<AlertsPage[]>([]);
  useEffect(() => {
    if (alerts.data?.pages) setLastPages(alerts.data.pages);
  }, [alerts.data]);
  const pages = alerts.data?.pages ?? lastPages;
  const items = pages.flatMap((page) => page.items);
  const unread = pages[0]?.unreadCount ?? 0;

  return (
    <WatchView
      refusal={refusalOf(watch.error)}
      pending={watch.isPending}
      failed={watch.isError}
      record={watch.data}
      items={items}
      unread={unread}
      alertsPending={alerts.isPending}
      alertsFailed={alerts.isError}
      hasNext={!!alerts.hasNextPage}
      loadingNext={alerts.isFetchingNextPage}
      outcome={outcome}
      recovering={recovering}
      busy={actions.isPending}
      onRetry={() => void watch.refetch()}
      onRetryReadback={() => {
        // Deliberately keep the outcome and the lock: the unresolved state ends only when a required
        // read-back actually succeeds. A failed recovery leaves the same state on screen with Retry again.
        setRecovering(true);
        void actions
          .retryReadback()
          .then((value) => {
            if (value) setOutcome(undefined);
          })
          .finally(() => setRecovering(false));
      }}
      onLoadMore={() => void alerts.fetchNextPage()}
      onStart={() => {
        setOutcome(undefined);
        actions.reset();
        actions.run({ type: "start" });
      }}
      onStatus={(status) => {
        setOutcome(undefined);
        actions.reset();
        actions.run({ type: "status", status });
      }}
      onRead={(alertId) => {
        setOutcome(undefined);
        actions.reset();
        actions.run({ type: "read", alertId });
      }}
      onDismiss={(alertId) => {
        setOutcome(undefined);
        actions.reset();
        actions.run({ type: "dismiss", alertId });
      }}
    />
  );
}

const outcomeText = (outcome: Outcome | undefined) => {
  if (!outcome) return undefined;
  if (outcome.kind === "refused")
    return outcome.status === 403
      ? "That alert is not delivered to you, so it cannot be changed here."
      : "Watch is unavailable for this prospect. The feature may be off for this workspace, or the prospect may not be available to you.";
  if (outcome.kind === "unconfirmed")
    return outcome.readback
      ? outcome.acknowledged
        ? "The change was accepted, but its result could not be read back. The current state was re-read and is shown above."
        : "The last change was not acknowledged. The current state was re-read and is shown above."
      : outcome.acknowledged
        ? "The change was accepted, but the current watch and alert state could not be re-read."
        : "The last change was not acknowledged and the current state could not be re-read.";
  return undefined;
};

export function WatchView({
  refusal,
  pending,
  failed,
  record,
  items,
  unread,
  alertsPending,
  alertsFailed,
  hasNext,
  loadingNext,
  outcome,
  recovering,
  busy,
  onRetry,
  onRetryReadback,
  onLoadMore,
  onStart,
  onStatus,
  onRead,
  onDismiss,
}: {
  refusal: 403 | 404 | null;
  pending: boolean;
  failed: boolean;
  record: WatchResponse | undefined;
  items: WatchAlert[];
  unread: number;
  alertsPending: boolean;
  alertsFailed: boolean;
  hasNext: boolean;
  loadingNext: boolean;
  outcome: Outcome | undefined;
  recovering: boolean;
  busy: boolean;
  onRetry: () => void;
  onRetryReadback: () => void;
  onLoadMore: () => void;
  onStart: () => void;
  onStatus: (status: "active" | "paused" | "ended") => void;
  onRead: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
}) {
  if (refusal === 404)
    return (
      <section aria-label="Prospect watch">
        <h2>Watch</h2>
        <p>Watch is unavailable for this prospect.</p>
      </section>
    );
  if (refusal === 403)
    return (
      <section aria-label="Prospect watch">
        <h2>Watch</h2>
        <p>You do not have access to this prospect&apos;s watch.</p>
      </section>
    );
  if (pending)
    return (
      <section aria-label="Prospect watch">
        <h2>Watch</h2>
        <p>Loading watch…</p>
      </section>
    );
  if (!record)
    return (
      <section aria-label="Prospect watch">
        <h2>Watch</h2>
        <p>Watch state is unavailable right now.</p>
        <button type="button" onClick={onRetry}>
          Retry watch
        </button>
      </section>
    );

  const current = record.watch;
  // Unresolved = the write's effect is not established. It stays true through the recovery request, so no
  // control can change state while a read-back is in flight.
  const unresolved = outcome?.kind === "unconfirmed" && !outcome.readback;
  const message = outcomeText(outcome);
  const locked = busy || recovering || unresolved;

  return (
    <section aria-label="Prospect watch">
      <h2>Watch</h2>
      {failed && (
        <p role="alert">The last successful watch read is shown; the newest read failed.</p>
      )}
      {!current ? (
        <>
          <p>
            Watch this prospect for material award, opportunity, lobbying and entity changes. Alerts
            appear here for review.
          </p>
          <button type="button" disabled={locked} onClick={onStart}>
            Start watch
          </button>
        </>
      ) : (
        <>
          <p>
            Status: {current.status}
            {current.mutedUntil ? ` · muted until ${current.mutedUntil}` : ""}
          </p>
          <p>
            Categories:{" "}
            {current.categories.length
              ? current.categories.map(categoryLabel).join(", ")
              : "All categories"}
          </p>
          <p>
            Owner: {current.ownerUserId ? "assigned member" : "unassigned"} · Last completed check:{" "}
            {record.lastCompletedCheckAt ?? "not yet"}
          </p>
          <ul aria-label="Source health">
            {record.sources.map((source) => (
              <li key={source.source}>
                {source.source}: {source.health}
                {source.lastCheckedAt ? ` · ${source.lastCheckedAt}` : ""}
                {source.detail ? ` · ${source.detail}` : ""}
              </li>
            ))}
          </ul>
          <div>
            {current.status === "active" ? (
              <button type="button" disabled={locked} onClick={() => onStatus("paused")}>
                Pause watch
              </button>
            ) : (
              <button type="button" disabled={locked} onClick={() => onStatus("active")}>
                Resume watch
              </button>
            )}
            {current.status !== "ended" && (
              <button type="button" disabled={locked} onClick={() => onStatus("ended")}>
                End watch
              </button>
            )}
          </div>
        </>
      )}

      {message && (
        <p aria-label="Watch change outcome" role={unresolved ? "alert" : "status"}>
          {message}
          {unresolved && (
            <>
              {" "}
              <button type="button" disabled={recovering} onClick={onRetryReadback}>
                {recovering ? "Checking current state…" : "Retry"}
              </button>
            </>
          )}
        </p>
      )}

      {current && (
        <div>
          <h3>Alerts</h3>
          {alertsPending && <p>Loading alerts…</p>}
          {alertsFailed && <p role="alert">Alerts are unavailable right now.</p>}
          {!alertsPending && (
            <>
              <p>
                {unread} unread · {items.length} shown
              </p>
              {items.length === 0 ? (
                alertsFailed ? null : <p>No alerts yet. The next completed check will record changes here.</p>
              ) : (
                <ul aria-label="Prospect alerts">
                  {items.map((alert) => (
                    <AlertRow
                      key={alert.id}
                      alert={alert}
                      busy={locked}
                      onRead={() => onRead(alert.id)}
                      onDismiss={() => onDismiss(alert.id)}
                    />
                  ))}
                </ul>
              )}
              {hasNext && !alertsFailed && (
                <button type="button" disabled={loadingNext} onClick={onLoadMore}>
                  {loadingNext ? "Loading older alerts…" : "Load older alerts"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function AlertRow({
  alert,
  busy,
  onRead,
  onDismiss,
}: {
  alert: WatchAlert;
  busy: boolean;
  onRead: () => void;
  onDismiss: () => void;
}) {
  const severity = alert.materialityLevel ?? alert.materiality;
  return (
    <li>
      <p>
        {alert.title}
        {severity ? ` · ${severity}` : ""}
        {alert.category ? ` · ${categoryLabel(alert.category)}` : ""}
      </p>
      {alert.summary && <p>{alert.summary}</p>}
      {alert.implication && <p>{alert.implication}</p>}
      <p>
        {alert.sourceFamily ? `${alert.sourceFamily} · ` : ""}
        {alert.firstObservedAt ?? "observed time unavailable"}
        {alert.dismissedAt
          ? ` · dismissed ${alert.dismissedAt}`
          : alert.readAt
            ? ` · read ${alert.readAt}`
            : " · unread"}
      </p>
      <div>
        <button type="button" disabled={busy || !!alert.readAt} onClick={onRead}>
          Mark read
        </button>
        <button type="button" disabled={busy || !!alert.dismissedAt} onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </li>
  );
}
