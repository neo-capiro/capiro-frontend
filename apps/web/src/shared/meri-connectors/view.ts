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

/**
 * Whether the connection list is still being read, could not be read, or is genuinely known.
 * A failed read is never presented as "nothing is connected".
 */
export type ConnectorReadState = "loading" | "unavailable" | "ready";

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
  /** `oauth` rows are ended by revoking authorization; `token`/`none` rows by removal. */
  authType: ConnectorRow["authType"];
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
    authType: row.authType,
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
 * the endpoint SSRF rules and re-checks the catalog feature flag on every add.
 *
 * `requiresFeature` is deliberately NOT re-checked here. Core only returns a flagged entry once the
 * tenant's flag is enabled (and keeps an already-connected entry visible when it is turned off),
 * so metadata alone does not mean "unavailable" — refusing on it blocked entries Core had admitted.
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
  /**
   * The stored row that already carries this entry, when one exists.
   *
   * Re-authorizing or disconnecting MUST use this id: `addFromCatalog` is not idempotent, so going
   * back through the add path for an existing connection creates a second row.
   */
  connectorId: string | undefined;
  /** The stored row's provider status, when a row exists. Never inferred from the card. */
  authorization: ConnectorRow["connectionStatus"] | undefined;
  /** Which inputs the connect step must collect for this entry. */
  inputs: ConnectInputs;
  /** True while this entry has an add whose outcome is unknown (no second add). */
  reconciling: boolean;
  /** Setup prerequisite from the catalog, shown in the drawer. Never a secret. */
  setupNote: string | undefined;
  docsHref: string | undefined;
};

/**
 * The stored row that represents `catalogId` for this caller.
 *
 * A caller can legitimately hold more than one row for the same catalog entry (a personal one and a
 * firm-wide one). A row they manage wins, then their own personal row, then whatever Core returned
 * first — the same row the management table lists first.
 */
export function storedConnectorFor(
  servers: readonly ConnectorRow[],
  catalogId: string,
): ConnectorRow | undefined {
  const rows = servers.filter((row) => row.catalogId === catalogId);
  return (
    rows.find((row) => row.canManage) ??
    rows.find((row) => row.scope === "user") ??
    rows[0]
  );
}

/** Browse cards in catalog order, grouped by category, connected entries first per group. */
export function libraryCards(
  connectors: readonly LibraryConnector[],
  servers: readonly ConnectorRow[] = [],
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
    .map(({ entry }) => {
      const stored = storedConnectorFor(servers, entry.id);
      const connected = entry.connected || stored !== undefined;
      const authType = stored?.authType ?? entry.authType;
      return {
        id: entry.id,
        name: entry.name,
        summary: entry.description,
        detail: entry.longDescription,
        category: CATEGORY_LABELS[entry.category],
        verified: entry.verified,
        connected,
        scope: entry.defaultScope === "tenant" ? "Firm-wide" : "Personal",
        action: connected
          ? authType === "oauth"
            ? "authorize"
            : "manage"
          : "connect",
        connectorId: stored?.id,
        authorization: stored?.connectionStatus,
        inputs: connectInputs(entry),
        reconciling: false,
        setupNote: entry.setupNote,
        docsHref: entry.docsUrl,
      } satisfies LibraryCard;
    });
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
 * What this surface remembers about a catalog add, for as long as it stays mounted.
 *
 * `addFromCatalog` is not idempotent and its response is captured BEFORE tool discovery, so two
 * facts have to survive a refresh:
 *
 * - `unresolvedCatalogId`: an add whose outcome is unknown (transport failure / 5xx). One list
 *   response cannot prove the write did not happen, so that entry stays blocked from a second
 *   ordinary add until a current read actually shows its row.
 * - `knownCreated`: rows this surface did create. Their ids stay usable for an authorization retry
 *   even when the immediate re-read fails and therefore does not list them yet.
 *
 * This is mounted-flow state only: no persistence, no backend contract change, no approval step.
 */
export type CreateRecovery = {
  unresolvedCatalogId: string | undefined;
  knownCreated: readonly ConnectorRow[];
};

export const noCreateRecovery: CreateRecovery = Object.freeze({
  unresolvedCatalogId: undefined,
  knownCreated: Object.freeze([]),
});

/** A row Core actually returned: keep it (by id) for authorization retry. */
function remember(
  recovery: CreateRecovery,
  connector: ConnectorRow,
): CreateRecovery {
  return {
    unresolvedCatalogId:
      recovery.unresolvedCatalogId !== undefined &&
      recovery.unresolvedCatalogId === connector.catalogId
        ? undefined
        : recovery.unresolvedCatalogId,
    knownCreated: [
      ...recovery.knownCreated.filter((row) => row.id !== connector.id),
      connector,
    ],
  };
}

/** The add may or may not have written a row: block this entry from another add. */
function markUnresolved(
  recovery: CreateRecovery,
  catalogId: string,
): CreateRecovery {
  return { ...recovery, unresolvedCatalogId: catalogId };
}

/** Fold one connect outcome into the recovery state the host renders from. */
export function applyConnectOutcome(
  recovery: CreateRecovery,
  catalogId: string,
  result: {
    kind: string;
    connector?: ConnectorRow;
  },
): CreateRecovery {
  if (result.kind === "unknown_create")
    return markUnresolved(recovery, catalogId);
  if (result.connector && result.kind !== "refused")
    return remember(recovery, result.connector);
  return recovery;
}

/**
 * Reconcile recovery with one current read.
 *
 * A successful read that lists the unresolved entry's row is the only thing that releases the
 * block; a failed or still-loading read releases nothing. Rows this surface created are kept while
 * the read does not list them, and dropped once it does (the read is then authoritative).
 */
export function reconcileCreate(
  recovery: CreateRecovery,
  servers: readonly ConnectorRow[],
): { recovery: CreateRecovery; rows: ConnectorRow[] } {
  const listed = new Set(servers.map((row) => row.id));
  const unresolved = recovery.unresolvedCatalogId;
  return {
    recovery: {
      unresolvedCatalogId:
        unresolved !== undefined &&
        servers.some((row) => row.catalogId === unresolved)
          ? undefined
          : unresolved,
      knownCreated: recovery.knownCreated.filter((row) => !listed.has(row.id)),
    },
    rows: [
      ...servers,
      ...recovery.knownCreated.filter((row) => !listed.has(row.id)),
    ],
  };
}

/** One card, marked while its catalog entry has an unresolved add. */
export function markReconciling(
  cards: readonly LibraryCard[],
  catalogId: string | undefined,
): LibraryCard[] {
  if (catalogId === undefined) return [...cards];
  return cards.map((card) =>
    card.id === catalogId ? { ...card, reconciling: true } : card,
  );
}

/**
 * What a stored-but-undiscovered connection may be called.
 *
 * `addFromCatalog` returns `redact(ctx, row)` from the row captured BEFORE `discoverTools(...)` ran
 * (and that call swallows its own failure), so neither `lastError: null` nor an empty allowlist in
 * this response is evidence that discovery succeeded. Only a later current read can say that.
 */
export function savedOutcome(entry: { name: string }): {
  title: string;
  detail: string;
} {
  return {
    title: `${entry.name} saved`,
    detail:
      "Core stored the connection. This response is captured before tool discovery, so it does not establish which tools were found — the connected list below reports what the current read says.",
  };
}

/** A created row whose authorization did not start: retry on this row, never by adding again. */
export function pendingOutcome(
  entry: { name: string },
  reason: string,
): { title: string; detail: string } {
  return {
    title: `${entry.name} created, authorization not started`,
    detail: `${reason} The connection is listed below with its own id; use Reconnect there instead of connecting again.`,
  };
}

/** An add with an unknown outcome: say so, and say what this view will and will not do. */
export function unknownCreateMessage(entry: { name: string }): string {
  return `Core did not confirm whether ${entry.name} was created, and creating a connector is not idempotent. This view will not add it again until the current connection list shows its row; refresh and check the connected list.`;
}

/**
 * What one card's button does, decided once so the screen cannot drift from it.
 *
 * The critical case is the connected OAuth card: it must re-authorize the row that already exists.
 * `MeriMcpService.addFromCatalog` creates a new row on every call (unique name per call), so a
 * connected card that fell through to `connect` would add a second, unreachable connection.
 */
export type CardCommand =
  | { kind: "reauthorize"; connectorId: string }
  | { kind: "connect" }
  | { kind: "open" }
  | { kind: "none" };

export function cardCommand(card: LibraryCard, open: boolean): CardCommand {
  // An unresolved add blocks a second one for this entry until a current read shows its row.
  if (card.reconciling) return { kind: "none" };
  if (card.connected)
    return card.action === "authorize" && card.connectorId
      ? { kind: "reauthorize", connectorId: card.connectorId }
      : { kind: "none" };
  return open ? { kind: "connect" } : { kind: "open" };
}

/**
 * How a stored connection is ended, from the row's own auth type.
 *
 * `oauth/disconnect` only clears OAuth state; a token/none row would keep `enabled` true and its
 * encrypted key, which is exactly what Core's execution guard reads for those rows. Those rows are
 * removed instead.
 */
export function connectionEndAction(
  row: ConnectedServiceRow,
): "revoke" | "remove" {
  return row.authType === "oauth" ? "revoke" : "remove";
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
