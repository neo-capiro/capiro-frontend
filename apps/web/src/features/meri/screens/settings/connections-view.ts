import type { z } from "zod";
import type { integrationSchema } from "../../../../shared/capiro/operations/settings-schemas";
import type {
  ConnectionRow,
  ConnectorAccountsView,
} from "./ConnectorAccountsScreen";
import type { SettingsNotice } from "./settings-view";

/**
 * 09.02 Connections projected from the supported owner.
 *
 * Core's `GET /engagement/integrations` (the fixed `settings.integrations.list`
 * operation) already returns the current actor's own provider connections for the
 * current tenant — the same rows Meri's server-side turn envelope derives
 * `authorizedMailboxConnectionIds` from. This module only renders what that
 * response carries: it never infers a grant from stored scope names, never
 * treats a registry row or a connected status as health, and never claims a
 * Meri-owned connection or authorization.
 */
type Connection = z.infer<typeof integrationSchema>;

const providerNames: Record<Connection["provider"], string> = {
  microsoft_365: "Microsoft 365",
  google_workspace: "Google Workspace",
  imap_caldav: "IMAP / CalDAV",
};

/** Provider-reported status only; never an inferred or optimistic connection state. */
const statusNames: Record<Connection["status"], string> = {
  needs_configuration: "Needs setup",
  connected: "Connected",
  error: "Error",
  disabled: "Disabled",
};

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** The designed narrow columns need one compact provider timestamp. */
export function stamp(value: string | null | undefined): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const at = new Date(value);
  if (!Number.isFinite(at.getTime())) return undefined;
  const hours = String(at.getUTCHours()).padStart(2, "0");
  const minutes = String(at.getUTCMinutes()).padStart(2, "0");
  return `${at.getUTCDate()} ${months[at.getUTCMonth()] ?? ""} · ${hours}:${minutes}`;
}

/** The provider account identity; the schema leaves every field nullable. */
export function accountCell(connection: Connection): string {
  return (
    connection.accountEmail ?? connection.displayName ?? "Identity not reported"
  );
}

/**
 * Stored scope names are a request until the provider grant was verified.
 * `grantedScopes === null` means no verification is recorded, so no grant is
 * claimed here even when the connection row reports a scope list.
 */
export function grantedScopeCell(connection: Connection): string {
  const granted = connection.permissions?.grantedScopes ?? null;
  if (!granted) return "Not verified";
  return `${new Set(granted).size} scopes verified`;
}

/** Last completed sync attempt; a scheduled time is reported separately in Core. */
export function refreshCell(connection: Connection): string {
  return stamp(connection.lastSyncAt) ?? "None recorded";
}

export function healthCell(connection: Connection): string {
  return statusNames[connection.status];
}

export const NO_CONNECTIONS_ID = "no-current-connections";

export function connectionRows(
  connections: readonly Connection[],
): ConnectionRow[] {
  return connections.map((connection) => ({
    id: connection.id,
    connection: providerNames[connection.provider],
    account: accountCell(connection),
    scope: grantedScopeCell(connection),
    refresh: refreshCell(connection),
    health: healthCell(connection),
  }));
}

/**
 * Coverage sentences come from Core's mail coverage, resource health and
 * subscription projections. A missing coverage object, a connected status, or an
 * absent reason code must not be presented as complete import coverage.
 */
export function coverageNotice(
  connection: Connection | undefined,
): SettingsNotice {
  if (!connection)
    return {
      title: "Source coverage",
      detail:
        "Select a connection to review the coverage Core reports for it. A connection row alone does not establish import coverage.",
    };
  const coverage = connection.mailCoverage;
  const health = connection.health;
  const reauthorization = (connection.subscriptions?.resources ?? []).filter(
    (resource) => resource.needsReauthorization,
  );
  const parts = [
    coverage
      ? `Mail source ${coverage.sourceStatus}.`
      : "No mail coverage is reported for this connection.",
    coverage?.lastMailSyncAt
      ? `Last mail sync ${stamp(coverage.lastMailSyncAt) ?? "not recorded"}.`
      : coverage
        ? "No mail sync is recorded."
        : "",
    coverage && !coverage.backfillComplete
      ? "The configured backfill is not complete."
      : "",
    coverage?.hasMore ? "More mail remains to import." : "",
    connection.lastError ||
      (coverage?.reason ? `${coverage.reason.replaceAll("_", " ")}.` : ""),
    coverage?.captureRepair === "required"
      ? "Retention repair is still required before coverage is complete."
      : "",
    health?.mail
      ? `Mail refresh reported ${health.mail.outcome}${health.mail.lastCompleteAt ? `, last complete ${stamp(health.mail.lastCompleteAt)}` : ", with no complete run recorded"}.`
      : "",
    health?.calendar
      ? `Calendar refresh reported ${health.calendar.outcome}.`
      : "",
    reauthorization.length
      ? `${reauthorization.length} calendar subscription${reauthorization.length > 1 ? "s" : ""} need reauthorization.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    title: `Source coverage · ${providerNames[connection.provider]}`,
    detail: parts,
    tone:
      coverage?.sourceStatus === "unavailable"
        ? "danger"
        : coverage?.sourceStatus === "degraded" || reauthorization.length
          ? "warning"
          : coverage
            ? "neutral"
            : "warning",
  };
}

export function grantedScopeCard(
  connection: Connection | undefined,
  base: ConnectorAccountsView["grantedScope"],
): ConnectorAccountsView["grantedScope"] {
  if (!connection)
    return {
      title: base.title,
      description:
        "No provider connection is available for the current account, so no scope is reported here.",
      notice: base.notice,
    };
  const provider = providerNames[connection.provider];
  const account = accountCell(connection);
  const permissions = connection.permissions;
  const granted = permissions?.grantedScopes ?? null;
  const requested = permissions?.requestedScopes ?? connection.scopes;
  const requestedSet = new Set(requested);
  const grantedSet = new Set(granted ?? []);
  const missing = [...requestedSet].filter((scope) => !grantedSet.has(scope));
  return {
    title: base.title,
    description: granted
      ? `${provider} · ${account} · ${requestedSet.size - missing.length} of ${requestedSet.size} requested scopes were verified ${stamp(permissions?.lastVerifiedAt) ?? "at an unrecorded time"}.${missing.length ? ` Missing requested scopes: ${missing.join(", ")}.` : ""} A verified grant does not establish runtime availability.`
      : `${provider} · ${account} · the current provider grants have not been verified. Stored scope names can reflect requested permissions, so no grant is claimed here. Verify them in Capiro Integrations before relying on them.`,
    notice: base.notice,
  };
}

/**
 * Revoke impact for the selected account, stated once, truthfully: the mutation
 * and its provider result belong to Capiro Integrations, not to this panel.
 */
export function disconnectTerms(
  connection: Connection | undefined,
  base: ConnectorAccountsView["disconnect"],
): ConnectorAccountsView["disconnect"] {
  if (!connection) return base;
  return {
    description:
      "Disconnecting stops mail and calendar import for the current account. Records already stored are retained but become unavailable in mail views, and reconnecting does not restore access to that earlier history. Capiro Integrations performs the disconnection and reports the provider's own revocation result.",
    confirm: "Review in Capiro Integrations",
  };
}

/**
 * Build the 09.02 view from the owner response. `ownerHref` is the route of the
 * surface that owns connect, reconnect, sync and disconnect, carrying the
 * current client context.
 *
 * Every row gets its own supporting detail; the screen renders the detail of the
 * row the user selected. The view-level copy below is the no-selection fallback,
 * so no row's scope, coverage or revoke terms can be shown for another account.
 */
export function connectionView(
  connections: readonly Connection[],
  ownerHref: string,
  base: ConnectorAccountsView,
): ConnectorAccountsView {
  const rows = connectionRows(connections);
  return {
    heading: base.heading,
    connections: {
      title: base.connections.title,
      description: rows.length
        ? "Your own provider connections for the current account and tenant."
        : "No provider account is connected for the current account. Connect one in Capiro Integrations.",
      rows: rows.length
        ? rows
        : [
            {
              id: NO_CONNECTIONS_ID,
              connection: "No provider account",
              account: "—",
              scope: "—",
              refresh: "—",
              health: "Not connected",
            },
          ],
      initialSelectedId: rows[0]?.id,
    },
    ownerHref,
    coverageHref: ownerHref,
    accounts: connections.map((connection) => ({
      id: connection.id,
      grantedScope: grantedScopeCard(connection, base.grantedScope),
      coverage: coverageNotice(connection),
      disconnect: disconnectTerms(connection, base.disconnect),
    })),
    grantedScope: grantedScopeCard(undefined, base.grantedScope),
    unavailable: coverageNotice(undefined),
    disconnect: disconnectTerms(undefined, base.disconnect),
  };
}
