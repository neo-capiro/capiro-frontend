/**
 * Connected-services library projections — pure, transport-free.
 *
 * The library the user browses is Capiro's own curated catalog
 * (apps/api/src/meri/meri-mcp.catalog.ts). It is not the claude.ai connector directory and cannot
 * be: the Bedrock model credential cannot import a person's Claude subscription connectors, and
 * there is no documented public catalog API to mirror. So every sentence below says what Capiro
 * actually offers — a reviewed set of external services with a real remote MCP endpoint — and
 * links to the provider's own documentation instead of implying full coverage.
 *
 * Nothing here decides access. Scope, ownership, feature flags, credential storage, token refresh
 * and revocation remain Core's; `connected` and `canManage` are comments on server-returned values,
 * never a substitute for them.
 */
import type {
  AddConnectorBody,
  ConnectorLibrary,
  ConnectorRow,
  LibraryConnector,
  McpCatalogEntry,
} from "../capiro/operations/meri-connectors";

/** The Settings callout shape, redeclared here so this shared module imports no feature code. */
export type ConnectorNotice = {
  title: string;
  detail: string;
  tone?: "neutral" | "warning" | "danger";
};

export const CATEGORY_ORDER = [
  "productivity",
  "research",
  "crm",
  "developer",
  "communication",
] as const;

export const CATEGORY_LABELS: Record<(typeof CATEGORY_ORDER)[number], string> =
  {
    productivity: "Documents & knowledge",
    research: "Research & intelligence",
    crm: "CRM, sales & operations",
    developer: "Project & engineering",
    communication: "Communication",
  };

export const CONNECTOR_STATUS_LABELS: Record<
  ConnectorRow["connectionStatus"],
  string
> = {
  pending: "Authorization pending",
  connected: "Connected",
  needs_reauth: "Reconnect required",
  error: "Error",
  disconnected: "Disconnected",
};

/** Provider status only. A connected row is a stored authorization, never a health claim. */
export function statusLabel(status: ConnectorRow["connectionStatus"]): string {
  return CONNECTOR_STATUS_LABELS[status];
}

export type ConnectedServiceRow = {
  id: string;
  service: string;
  scope: string;
  status: string;
  access: string;
  tools: string;
  lastSync: string;
  detail: string | undefined;
  canManage: boolean;
  canAuthorize: boolean;
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

/** Compact UTC timestamp; an unrecorded or unparseable value is reported as such. */
export function stamp(value: string | null | undefined): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const at = new Date(value);
  if (!Number.isFinite(at.getTime())) return undefined;
  const hours = String(at.getUTCHours()).padStart(2, "0");
  const minutes = String(at.getUTCMinutes()).padStart(2, "0");
  return `${at.getUTCDate()} ${months[at.getUTCMonth()] ?? ""} · ${hours}:${minutes}`;
}

/**
 * One stored connector as the management table shows it.
 *
 * `access` states what the row's scope actually means for this caller, and `canAuthorize` is true
 * only for an OAuth row this caller may manage — a firm-wide connector is authorized once by an
 * admin, not re-authorized per member.
 */
export function connectedServiceRow(row: ConnectorRow): ConnectedServiceRow {
  const scope =
    row.scope === "tenant" ? "Firm-wide (admin-managed)" : "Personal to you";
  const access =
    row.scope === "tenant"
      ? row.canManage
        ? "You manage"
        : "Admin-managed"
      : "You own";
  return {
    id: row.id,
    service: row.catalogId ?? row.name,
    scope,
    status: statusLabel(row.connectionStatus),
    access,
    tools: `${row.toolAllowlist.length} allowed tool${row.toolAllowlist.length === 1 ? "" : "s"}`,
    lastSync: stamp(row.lastSyncAt) ?? "None recorded",
    detail: row.lastError ?? undefined,
    canManage: row.canManage,
    canAuthorize: row.canManage && row.authType === "oauth",
  };
}

export function connectedServiceRows(
  rows: readonly ConnectorRow[],
): ConnectedServiceRow[] {
  return rows.map(connectedServiceRow);
}

/** The inputs the connect step must collect before it can be sent. */
export type ConnectInputs = {
  endpoint: boolean;
  oauthClient: boolean;
  apiKey: boolean;
};

export function connectInputs(entry: McpCatalogEntry): ConnectInputs {
  return {
    endpoint:
      entry.transport === "http" &&
      (entry.requiresEndpointInput === true || !entry.endpoint),
    oauthClient:
      entry.authType === "oauth" && entry.oauthClientMode === "manual",
    apiKey: entry.authType === "token",
  };
}

export type ConnectDraft = {
  endpoint?: string | undefined;
  authToken?: string | undefined;
  oauthClientId?: string | undefined;
  oauthClientSecret?: string | undefined;
};

export type ConnectRefusal = { ok: false; reason: string };
export type ConnectAllowed = { ok: true; body: AddConnectorBody };

/**
 * The browser-side pre-check before a connect is offered.
 *
 * It exists so the drawer cannot post an add that is certain to be refused (a manual-OAuth entry
 * with no client, a self-hosted entry with no URL). It is NOT an authority check: Core re-validates
 * every field, resolves the tenant/member scope, refuses a firm-wide add by a non-admin, applies
 * the endpoint SSRF rules and gates catalog entries behind their feature flag.
 */
export function connectGate(
  entry: McpCatalogEntry,
  draft: ConnectDraft,
): ConnectAllowed | ConnectRefusal {
  if (entry.transport !== "http")
    return {
      ok: false,
      reason: "This entry cannot be connected from Meri.",
    };
  if (entry.requiresFeature)
    return {
      ok: false,
      reason: "This service is not available for this workspace.",
    };
  const body: AddConnectorBody = { catalogId: entry.id };
  if (connectInputs(entry).endpoint) {
    const endpoint = draft.endpoint?.trim() ?? "";
    if (!endpoint)
      return { ok: false, reason: `${entry.name} needs its server URL.` };
    let url: URL;
    try {
      url = new URL(endpoint);
    } catch {
      return { ok: false, reason: "Enter a valid server URL." };
    }
    if (url.protocol !== "https:")
      return { ok: false, reason: "The server URL must use https." };
    body.endpoint = endpoint;
  }
  if (entry.authType === "token") {
    const token = draft.authToken?.trim() ?? "";
    if (!token) return { ok: false, reason: `${entry.name} needs an API key.` };
    body.authToken = token;
  }
  if (connectInputs(entry).oauthClient) {
    const clientId = draft.oauthClientId?.trim() ?? "";
    const clientSecret = draft.oauthClientSecret?.trim() ?? "";
    if (!clientId || !clientSecret)
      return {
        ok: false,
        reason: `${entry.name} needs a pre-registered OAuth Client ID and Client Secret.`,
      };
    body.oauthClientId = clientId;
    body.oauthClientSecret = clientSecret;
  }
  return { ok: true, body };
}

export type LibraryCard = {
  id: string;
  name: string;
  summary: string;
  detail: string;
  category: string;
  verified: boolean;
  connected: boolean;
  scope: string;
  action: "manage" | "authorize" | "connect";
  /** Which inputs the connect step must collect for this entry. */
  inputs: ConnectInputs;
  /** Setup prerequisite from the catalog, shown in the drawer. Never a secret. */
  setupNote: string | undefined;
  docsHref: string | undefined;
};

/** Browse cards in catalog order, grouped by category, connected entries last per group. */
export function libraryCards(
  connectors: readonly LibraryConnector[],
): LibraryCard[] {
  return connectors
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const left = CATEGORY_ORDER.indexOf(a.entry.category);
      const right = CATEGORY_ORDER.indexOf(b.entry.category);
      if (left !== right) return left - right;
      if (a.entry.connected !== b.entry.connected)
        return a.entry.connected ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ entry }) => ({
      id: entry.id,
      name: entry.name,
      summary: entry.description,
      detail: entry.longDescription,
      category: CATEGORY_LABELS[entry.category],
      verified: entry.verified,
      connected: entry.connected,
      scope: entry.defaultScope === "tenant" ? "Firm-wide" : "Personal",
      action: entry.connected
        ? entry.authType === "oauth"
          ? "authorize"
          : "manage"
        : "connect",
      inputs: connectInputs(entry),
      setupNote: entry.setupNote,
      docsHref: entry.docsUrl,
    }));
}

export function groupedCards(
  cards: readonly LibraryCard[],
): ReadonlyArray<{ category: string; cards: LibraryCard[] }> {
  const groups = new Map<string, LibraryCard[]>();
  for (const card of cards) {
    const bucket = groups.get(card.category);
    if (bucket) bucket.push(card);
    else groups.set(card.category, [card]);
  }
  return [...groups].map(([category, items]) => ({ category, cards: items }));
}

/**
 * What this surface is — stated once, truthfully, above the library.
 *
 * Three claims it must never make: that the whole Claude connector directory is imported, that a
 * Claude account's connectors can be brought over, or that a listed entry is reachable before its
 * provider authorizes it.
 */
export function libraryNotice(
  library: ConnectorLibrary | undefined,
): ConnectorNotice {
  if (!library)
    return {
      title: "Connected services",
      detail:
        "The connected-services library could not be read, so no entry or connection is shown here.",
      tone: "warning",
    };
  if (!library.oauthConfigured)
    return {
      title: "Connected services",
      detail:
        "OAuth connectors are unavailable until this deployment has its connector callback configured, so only key-based entries can be connected right now.",
      tone: "warning",
    };
  return {
    title: "Capiro's reviewed connector library",
    detail:
      "These are external services Capiro has reviewed and can reach over a remote MCP endpoint. This is our curated list, not the claude.ai connector directory, and no Claude account connectors are imported. Connecting one authorizes it for the scope named on its card; Meri can only use the tools Core allows on that connection.",
  };
}
