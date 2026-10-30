"use client";
import { refusalOf, useProspectAlerts, useProspectWatch, useWatchActions } from "./api";
import { categoryLabel, type AlertsPage, type WatchAlert, type WatchResponse } from "./contracts";

/**
 * Prospect watch and alert review — the user entry for the existing Core owner.
 *
 * The connected component only resolves current server state; `WatchView` is the rendered surface, so
 * the visible controls and their disabled states can be exercised without a browser. Nothing shown is
 * local inference: the watch row, its per-source health, the alert page and its unread count are the
 * values Core returned, and every action is an explicit button that re-reads through the same queries.
 */
export function ProspectWatch({ prospectId }: { prospectId: string }) {
  const watch = useProspectWatch(prospectId);
  const alerts = useProspectAlerts(prospectId);
  const actions = useWatchActions(prospectId);
  const busy =
    actions.activate.isPending ||
    actions.update.isPending ||
    actions.readAlert.isPending ||
    actions.dismissAlert.isPending;
  return (
    <WatchView
      refusal={refusalOf(watch.error)}
      pending={watch.isPending}
      failed={watch.isError}
      record={watch.data}
      alerts={alerts}
      actionError={
        actions.activate.error ??
        actions.update.error ??
        actions.readAlert.error ??
        actions.dismissAlert.error
      }
      busy={busy}
      onRetry={() => void watch.refetch()}
      onStart={() => actions.activate.mutate({})}
      onStatus={(status) => actions.update.mutate({ status })}
      onRead={(alertId) => actions.readAlert.mutate(alertId)}
      onDismiss={(alertId) => actions.dismissAlert.mutate(alertId)}
    />
  );
}

type AlertsQuery = {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: AlertsPage | undefined;
};

const failureText = (error: unknown, fallback: string) => {
  const status = refusalOf(error);
  if (status === 403)
    return "You can only review alerts delivered to you on this prospect.";
  if (status === 404) return "Business Development watch is not enabled for this workspace.";
  return error ? fallback : undefined;
};

export function WatchView({
  refusal,
  pending,
  failed,
  record,
  alerts,
  actionError,
  busy,
  onRetry,
  onStart,
  onStatus,
  onRead,
  onDismiss,
}: {
  refusal: 403 | 404 | null;
  pending: boolean;
  failed: boolean;
  record: WatchResponse | undefined;
  alerts: AlertsQuery;
  actionError: unknown;
  busy: boolean;
  onRetry: () => void;
  onStart: () => void;
  onStatus: (status: "active" | "paused" | "ended") => void;
  onRead: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
}) {
  if (refusal === 404)
    return (
      <section aria-label="Prospect watch">
        <h2>Watch</h2>
        <p>Business Development watch is not enabled for this workspace.</p>
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
  if (failed || !record)
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
  const page = alerts.data;
  const actionFailure =
    failureText(actionError, "The watch request was refused.") ?? undefined;

  return (
    <section aria-label="Prospect watch">
      <h2>Watch</h2>
      {!current ? (
        <>
          <p>
            Watch this prospect for material award, opportunity, lobbying and entity changes. Alerts
            appear here and in the notification center.
          </p>
          <button type="button" disabled={busy} onClick={onStart}>
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
              <button type="button" disabled={busy} onClick={() => onStatus("paused")}>
                Pause watch
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => onStatus("active")}>
                Resume watch
              </button>
            )}
            {current.status !== "ended" && (
              <button type="button" disabled={busy} onClick={() => onStatus("ended")}>
                End watch
              </button>
            )}
          </div>
        </>
      )}
      {actionFailure && <p role="alert">{actionFailure}</p>}

      {current && (
        <div>
          <h3>Alerts</h3>
          {alerts.isPending && <p>Loading alerts…</p>}
          {alerts.isError && (
            <p role="alert">{failureText(alerts.error, "Alerts are unavailable right now.")}</p>
          )}
          {page && (
            <>
              <p>
                {page.unreadCount} unread · {page.items.length} shown
              </p>
              {page.items.length === 0 ? (
                <p>No alerts yet. The next completed check will record changes here.</p>
              ) : (
                <ul aria-label="Prospect alerts">
                  {page.items.map((alert) => (
                    <AlertRow
                      key={alert.id}
                      alert={alert}
                      busy={busy}
                      onRead={() => onRead(alert.id)}
                      onDismiss={() => onDismiss(alert.id)}
                    />
                  ))}
                </ul>
              )}
              {page.nextCursor && (
                <p>
                  More alerts are available in the notification center; this prospect list shows the
                  newest page.
                </p>
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
