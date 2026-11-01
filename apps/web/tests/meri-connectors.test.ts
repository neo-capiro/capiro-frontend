/**
 * Connected-services library acceptance — SCRUM-155.
 *
 * These run against the installed operation contracts and the real projection/client modules with
 * only the transport boundary faked, so they prove the decisions this surface actually owns:
 * what the browser refuses before Core sees it, how a stored row is described, what the surface
 * claims about catalog coverage, and the add → authorize sequencing. They do not prove Core's
 * scope, tenant, revocation or provider behavior, and they do not stand in for deployed acceptance.
 */
import { describe, expect, it } from "vitest";
import {
  cardCommand,
  connectGate,
  connectedServiceRow,
  connectionEndAction,
  libraryCards,
  libraryNotice,
  markReconciling,
  noCreateRecovery,
  reconcileCreate,
  reduceRecovery,
  savedOutcome,
  statusLabel,
  storedConnectorFor,
  type ConnectDraft,
  type RecoveryAction,
} from "../src/shared/meri-connectors/view";
import {
  createConnectorClient,
  type ConnectorApi,
} from "../src/shared/meri-connectors/client";
import type {
  ConnectorRow,
  LibraryConnector,
  McpCatalogEntry,
} from "../src/shared/capiro/operations/meri-connectors";
import {
  catalogResponse,
  connectorRow,
} from "../src/shared/capiro/operations/meri-connectors";
import { CapiroApiError } from "../src/shared/capiro/http";

const entryShape = {
  category: "productivity",
  description: "one line",
  longDescription: "a paragraph",
  transport: "http",
  verified: true,
  defaultScope: "user",
  suggestedTools: [{ name: "search", description: "Search", readOnly: true }],
  brand: { color: "#111111", glyph: "folder" },
  connected: false,
} as const;

function oauthEntry(
  overrides: Partial<LibraryConnector> = {},
): LibraryConnector {
  return {
    ...entryShape,
    id: "notion",
    name: "Notion",
    endpoint: "https://mcp.notion.com/mcp",
    authType: "oauth",
    ...overrides,
  } as LibraryConnector;
}

function tokenEntry(
  overrides: Partial<LibraryConnector> = {},
): LibraryConnector {
  return {
    ...entryShape,
    id: "tavily",
    name: "Tavily",
    endpoint: "https://mcp.tavily.com/mcp/",
    authType: "token",
    defaultScope: "tenant",
    ...overrides,
  } as LibraryConnector;
}

function storedRow(overrides: Partial<ConnectorRow> = {}): ConnectorRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "notion",
    transport: "http",
    endpoint: "https://mcp.notion.com/mcp",
    command: null,
    args: [],
    toolAllowlist: ["search", "fetch"],
    readOnlyTools: ["search"],
    enabled: true,
    scope: "user",
    catalogId: "notion",
    authType: "oauth",
    connectionStatus: "connected",
    isOwner: true,
    canManage: true,
    lastSyncAt: "2026-10-29T10:00:00.000Z",
    lastError: null,
    hasAuthToken: false,
    createdAt: "2026-10-29T09:00:00.000Z",
    updatedAt: "2026-10-29T10:00:00.000Z",
    ...overrides,
  } as ConnectorRow;
}

const noDraft: ConnectDraft = {};

describe("connectGate", () => {
  it("allows a dynamic OAuth catalog entry with a published endpoint", () => {
    const gate = connectGate(oauthEntry() as McpCatalogEntry, noDraft);
    expect(gate).toEqual({ ok: true, body: { catalogId: "notion" } });
  });

  it("refuses a stdio entry from the browser surface", () => {
    const gate = connectGate(
      oauthEntry({ transport: "stdio", endpoint: null }) as McpCatalogEntry,
      noDraft,
    );
    expect(gate.ok).toBe(false);
    expect(gate.ok === false && gate.reason).toContain("cannot be connected");
  });

  it("does not re-refuse a feature-gated entry that Core admitted", () => {
    // Core only returns a flagged entry once the tenant flag is on (and keeps an already-connected
    // one visible when it is off), so the browser must let the add through and let Core re-check.
    const gate = connectGate(
      tokenEntry({
        requiresFeature: "funding_opportunities_tango_mcp",
      }) as McpCatalogEntry,
      { authToken: "key" },
    );
    expect(gate.ok).toBe(true);
    expect(gate.ok && gate.body).toEqual({
      catalogId: "tavily",
      authToken: "key",
    });
  });

  it("requires an https server URL when the entry has no published endpoint", () => {
    const entry = oauthEntry({
      id: "google-drive",
      name: "Google Drive",
      endpoint: null,
      requiresEndpointInput: true,
      oauthClientMode: "manual",
    }) as McpCatalogEntry;
    const client = { oauthClientId: "id", oauthClientSecret: "secret" };
    expect(connectGate(entry, client)).toEqual({
      ok: false,
      reason: "Google Drive needs its server URL.",
    });
    expect(
      connectGate(entry, {
        ...client,
        endpoint: "http://drivemcp.googleapis.com/mcp/v1",
      }),
    ).toEqual({ ok: false, reason: "The server URL must use https." });
    expect(connectGate(entry, { ...client, endpoint: "not a url" })).toEqual({
      ok: false,
      reason: "Enter a valid server URL.",
    });
    expect(
      connectGate(entry, {
        ...client,
        endpoint: "https://drivemcp.googleapis.com/mcp/v1",
      }),
    ).toEqual({
      ok: true,
      body: {
        catalogId: "google-drive",
        endpoint: "https://drivemcp.googleapis.com/mcp/v1",
        oauthClientId: "id",
        oauthClientSecret: "secret",
      },
    });
  });

  it("requires both halves of a pre-registered OAuth client", () => {
    const entry = oauthEntry({ oauthClientMode: "manual" }) as McpCatalogEntry;
    expect(connectGate(entry, { oauthClientId: "id" }).ok).toBe(false);
    expect(connectGate(entry, { oauthClientSecret: "secret" }).ok).toBe(false);
    expect(
      connectGate(entry, { oauthClientId: "id", oauthClientSecret: "secret" })
        .ok,
    ).toBe(true);
  });

  it("requires a key for a token entry", () => {
    const entry = tokenEntry() as McpCatalogEntry;
    expect(connectGate(entry, {})).toEqual({
      ok: false,
      reason: "Tavily needs an API key.",
    });
    expect(connectGate(entry, { authToken: "   " }).ok).toBe(false);
    expect(connectGate(entry, { authToken: "key" })).toEqual({
      ok: true,
      body: { catalogId: "tavily", authToken: "key" },
    });
  });

  it("never emits transport, command or env fields", () => {
    const gate = connectGate(oauthEntry() as McpCatalogEntry, noDraft);
    expect(gate.ok && Object.keys(gate.body).sort()).toEqual(["catalogId"]);
  });
});

describe("stored connectors", () => {
  it("reports provider status only", () => {
    expect(statusLabel("connected")).toBe("Connected");
    expect(statusLabel("needs_reauth")).toBe("Reconnect required");
    expect(statusLabel("pending")).toBe("Authorization pending");
  });

  it("separates a firm-wide row the caller merely uses from one they manage", () => {
    const member = connectedServiceRow(
      storedRow({ scope: "tenant", canManage: false, isOwner: true }),
    );
    expect(member).toMatchObject({
      scope: "Firm-wide (admin-managed)",
      access: "Admin-managed",
      canManage: false,
      canAuthorize: false,
    });
    const admin = connectedServiceRow(
      storedRow({ scope: "tenant", canManage: true, isOwner: true }),
    );
    expect(admin).toMatchObject({ access: "You manage", canAuthorize: true });
  });

  it("offers authorization only for an OAuth row the caller can manage", () => {
    expect(connectedServiceRow(storedRow()).canAuthorize).toBe(true);
    expect(
      connectedServiceRow(storedRow({ authType: "token" })).canAuthorize,
    ).toBe(false);
    expect(
      connectedServiceRow(storedRow({ canManage: false })).canAuthorize,
    ).toBe(false);
  });

  it("turns Core's stored lastError into what the person can do; the text reaches admins only", () => {
    expect(connectedServiceRow(storedRow()).problem).toBeUndefined();
    const failed = (lastError: string, admin = false) =>
      connectedServiceRow(
        storedRow({ connectionStatus: "error", lastError }),
        "Clio",
        admin,
      ).problem;
    const operator =
      "MCP stdio command is not allowlisted (set CLIO_MCP_STDIO_ALLOWED_COMMANDS — operator action)";
    expect(failed(operator)).toEqual({
      summary:
        "This connector isn't available yet. An administrator needs to enable it.",
    });
    expect(failed(operator, true)).toEqual({
      summary:
        "This connector isn't available yet. An administrator needs to enable it.",
      technical: operator,
    });
    for (const unreachable of [
      "The app could not be reached. Please try again.",
      "The app could not finish connecting. Please try again.",
      "Tool discovery failed.",
    ])
      expect(failed(unreachable)).toEqual({
        summary: "Couldn't reach Clio; try again later.",
      });
    expect(failed("HTTP 500")).toEqual({
      summary: "Capiro could not connect to Clio.",
    });
    expect(failed("HTTP 500", true)).toEqual({
      summary: "Capiro could not connect to Clio.",
      technical: "HTTP 500",
    });
  });

  it("names the row by its library entry, falling back to the stored name", () => {
    expect(connectedServiceRow(storedRow(), "Notion").service).toBe("Notion");
    expect(connectedServiceRow(storedRow({ name: "notion-mcp" })).service).toBe(
      "notion-mcp",
    );
  });
});

describe("library cards", () => {
  it("uses the stored scope and never offers a member authorization on an admin-managed connection", () => {
    const row = storedRow({
      scope: "tenant",
      canManage: false,
      isOwner: false,
    });
    const [card] = libraryCards([oauthEntry({ defaultScope: "user" })], [row]);
    expect(card).toMatchObject({
      scope: "Firm-wide",
      action: "manage",
      connectorId: row.id,
    });
    expect(cardCommand(card!, true)).toEqual({ kind: "none" });
  });

  it("orders by category and puts a connected entry first inside its category", () => {
    const cards = libraryCards([
      oauthEntry({ id: "notion", name: "Notion", connected: false }),
      tokenEntry({ id: "tavily", name: "Tavily", connected: false }),
      oauthEntry({ id: "box", name: "Box", connected: true }),
    ]);
    expect(cards.map((card) => card.id)).toEqual(["box", "notion", "tavily"]);
  });

  it("labels the action from the connection state and the auth type", () => {
    const [connectedOauth, connectedToken, fresh] = libraryCards([
      oauthEntry({ id: "notion", connected: true }),
      tokenEntry({ id: "tavily", connected: true }),
      oauthEntry({ id: "box", connected: false }),
    ]);
    expect(connectedOauth?.action).toBe("authorize");
    expect(connectedToken?.action).toBe("manage");
    expect(fresh?.action).toBe("connect");
  });

  it("binds a connected card to the stored row so it can re-authorize that row", () => {
    const row = storedRow({ id: "22222222-2222-4222-8222-222222222222" });
    const [card] = libraryCards([oauthEntry({ connected: true })], [row]);
    expect(card).toMatchObject({
      id: "notion",
      connected: true,
      connectorId: row.id,
      authorization: "connected",
      action: "authorize",
    });
  });

  it("prefers the row the caller manages when the same entry has several", () => {
    const firm = storedRow({
      id: "33333333-3333-4333-8333-333333333333",
      scope: "tenant",
      canManage: false,
    });
    const mine = storedRow({
      id: "44444444-4444-4444-8444-444444444444",
      canManage: true,
    });
    expect(storedConnectorFor([firm, mine], "notion")?.id).toBe(mine.id);
    expect(storedConnectorFor([firm], "notion")?.id).toBe(firm.id);
    expect(storedConnectorFor([], "notion")).toBeUndefined();
  });
});

describe("card commands", () => {
  it("re-authorizes the existing row for a connected OAuth card and never adds", () => {
    const row = storedRow();
    const [card] = libraryCards([oauthEntry({ connected: true })], [row]);
    expect(cardCommand(card!, false)).toEqual({
      kind: "reauthorize",
      connectorId: row.id,
    });
  });

  it("offers no add for a connected card whose row is not visible in the current read", () => {
    const [card] = libraryCards([oauthEntry({ connected: true })], []);
    expect(cardCommand(card!, true)).toEqual({ kind: "none" });
  });

  it("opens setup first, then connects on the second click", () => {
    const [card] = libraryCards([oauthEntry({ connected: false })], []);
    expect(cardCommand(card!, false)).toEqual({ kind: "open" });
    expect(cardCommand(card!, true)).toEqual({ kind: "connect" });
  });

  it("leaves a connected key-based card to the connection table", () => {
    const row = storedRow({
      id: "55555555-5555-4555-8555-555555555555",
      authType: "token",
      catalogId: "tavily",
      hasAuthToken: true,
    });
    const [card] = libraryCards([tokenEntry({ connected: true })], [row]);
    expect(card?.action).toBe("manage");
    expect(cardCommand(card!, true)).toEqual({ kind: "none" });
  });

  it("ends an OAuth connection by revocation and a key-based one by removal", () => {
    expect(connectionEndAction(connectedServiceRow(storedRow()))).toBe(
      "revoke",
    );
    expect(
      connectionEndAction(
        connectedServiceRow(storedRow({ authType: "token" })),
      ),
    ).toBe("remove");
    expect(
      connectionEndAction(connectedServiceRow(storedRow({ authType: "none" }))),
    ).toBe("remove");
  });
});

describe("library notice", () => {
  it("says the surface is unavailable rather than empty when the read failed", () => {
    expect(libraryNotice(undefined).tone).toBe("warning");
  });

  it("names the missing callback configuration instead of offering OAuth", () => {
    const notice = libraryNotice({
      oauthConfigured: false,
      oauthRedirectUri: null,
      connectors: [],
    });
    expect(notice.tone).toBe("warning");
    expect(notice.detail).toContain("callback");
  });

  it("claims a curated Capiro catalog, not the Claude directory or an account import", () => {
    const notice = libraryNotice({
      oauthConfigured: true,
      oauthRedirectUri: "https://app.capiro.ai/api/clio/mcp-oauth/callback",
      connectors: [],
    });
    expect(notice.detail).toContain("not the claude.ai connector directory");
    expect(notice.detail).toContain(
      "no Claude account connectors are imported",
    );
  });
});

type Recorded = { key: string; input: unknown };

function fakeApi(answer: (key: string, input: unknown) => unknown) {
  const recorded: Recorded[] = [];
  const api = {
    async request(key: string, input: unknown) {
      recorded.push({ key, input });
      return answer(key, input);
    },
  } as unknown as ConnectorApi;
  return { api, recorded };
}

describe("connector client", () => {
  it("finishes an OAuth connect by returning Core's authorization URL", async () => {
    const added = {
      ...storedRow({ connectionStatus: "pending" }),
      oauthRequired: true,
    };
    const { api, recorded } = fakeApi((key) =>
      key === "meri.connectors.add"
        ? added
        : {
            authUrl: "https://provider.example/authorize?state=abc",
            alreadyConnected: false,
          },
    );
    const outcome = await createConnectorClient(api).connect(
      oauthEntry() as McpCatalogEntry,
      noDraft,
    );
    expect(outcome).toEqual({
      kind: "authorization_required",
      connector: added,
      authUrl: "https://provider.example/authorize?state=abc",
    });
    expect(recorded.map((call) => call.key)).toEqual([
      "meri.connectors.add",
      "meri.connectors.oauthStart",
    ]);
    expect(recorded[1]?.input).toEqual({ params: { id: added.id } });
  });

  it("stops at the add for a key-based connector", async () => {
    const stored = {
      ...storedRow({ authType: "token" }),
      oauthRequired: false,
    };
    const { api, recorded } = fakeApi(() => stored);
    const outcome = await createConnectorClient(api).connect(
      tokenEntry() as McpCatalogEntry,
      { authToken: "key" },
    );
    expect(outcome).toEqual({ kind: "saved", connector: stored });
    expect(recorded.map((call) => call.key)).toEqual(["meri.connectors.add"]);
  });

  it("does not call Core when the browser pre-check already refuses", async () => {
    const { api, recorded } = fakeApi(() => {
      throw new Error("should not be called");
    });
    const outcome = await createConnectorClient(api).connect(
      oauthEntry({ oauthClientMode: "manual" }) as McpCatalogEntry,
      noDraft,
    );
    expect(outcome.kind).toBe("refused");
    expect(recorded).toHaveLength(0);
  });

  it("reports an already-authorized connector instead of a URL", async () => {
    const added = { ...storedRow(), oauthRequired: true };
    const { api } = fakeApi((key) =>
      key === "meri.connectors.add"
        ? added
        : { authUrl: null, alreadyConnected: true },
    );
    const outcome = await createConnectorClient(api).connect(
      oauthEntry() as McpCatalogEntry,
      noDraft,
    );
    expect(outcome).toEqual({ kind: "already_connected", connector: added });
  });

  it("keeps the created row when authorization cannot start", async () => {
    const added = {
      ...storedRow({ connectionStatus: "pending" }),
      oauthRequired: true,
    };
    const { api, recorded } = fakeApi((key) => {
      if (key === "meri.connectors.add") return added;
      throw new Error("OAuth is not configured for this deployment.");
    });
    const outcome = await createConnectorClient(api).connect(
      oauthEntry() as McpCatalogEntry,
      noDraft,
    );
    expect(outcome.kind).toBe("authorization_pending");
    expect(
      outcome.kind === "authorization_pending" && outcome.connector.id,
    ).toBe(added.id);
    expect(
      outcome.kind === "authorization_pending" && outcome.reason,
    ).toContain("OAuth is not configured");
    // The add ran exactly once: retrying must reuse this row, not create another.
    expect(
      recorded.filter((call) => call.key === "meri.connectors.add"),
    ).toHaveLength(1);
  });

  it("reports a missing authorization URL as pending on the created row", async () => {
    const added = {
      ...storedRow({ connectionStatus: "pending" }),
      oauthRequired: true,
    };
    const { api } = fakeApi((key) =>
      key === "meri.connectors.add" ? added : { authUrl: null },
    );
    const outcome = await createConnectorClient(api).connect(
      oauthEntry() as McpCatalogEntry,
      noDraft,
    );
    expect(outcome.kind).toBe("authorization_pending");
    expect(
      outcome.kind === "authorization_pending" && outcome.reason,
    ).toContain("authorization page");
    expect(
      outcome.kind === "authorization_pending" && outcome.connector.id,
    ).toBe(added.id);
  });

  it("reports Core's refusal without pretending a row exists", async () => {
    const { api } = fakeApi(() => {
      throw new CapiroApiError(400, "Unknown catalog connector");
    });
    const outcome = await createConnectorClient(api).connect(
      oauthEntry() as McpCatalogEntry,
      noDraft,
    );
    expect(outcome).toEqual({
      kind: "refused",
      reason: "Unknown catalog connector",
    });
  });

  it("reports an ambiguous add as unknown instead of inviting a duplicate retry", async () => {
    const { api, recorded } = fakeApi(() => {
      throw new CapiroApiError(
        502,
        "The service returned an unexpected response.",
      );
    });
    const outcome = await createConnectorClient(api).connect(
      oauthEntry() as McpCatalogEntry,
      noDraft,
    );
    expect(outcome.kind).toBe("unknown_create");
    expect(recorded.map((call) => call.key)).toEqual(["meri.connectors.add"]);
  });

  it("revokes an OAuth connection through the OAuth owner", async () => {
    const { api, recorded } = fakeApi(() => ({ disconnected: true }));
    const outcome = await createConnectorClient(api).disconnect({
      id: storedRow().id,
      authType: "oauth",
    });
    expect(outcome).toEqual({ kind: "authorization_revoked" });
    expect(recorded).toEqual([
      {
        key: "meri.connectors.oauthDisconnect",
        input: { params: { id: storedRow().id } },
      },
    ]);
  });

  it("removes a key-based connection instead of only clearing OAuth state", async () => {
    const id = "66666666-6666-4666-8666-666666666666";
    const { api, recorded } = fakeApi(() => ({ deleted: true }));
    const client = createConnectorClient(api);
    expect(await client.disconnect({ id, authType: "token" })).toEqual({
      kind: "connection_removed",
    });
    expect(await client.disconnect({ id, authType: "none" })).toEqual({
      kind: "connection_removed",
    });
    expect(recorded).toEqual([
      { key: "meri.connectors.remove", input: { params: { id } } },
      { key: "meri.connectors.remove", input: { params: { id } } },
    ]);
  });
});

/**
 * The host's mounted-state transitions, driven through the real client with a recording transport
 * and then through the exact reducer `ConnectorLibraryHost` commits with.
 *
 * `hostState()` mirrors the host's own binding: every change goes through
 * `setRecovery((previous) => reduceRecovery(previous, action))`, including the authoritative
 * successful-read commit the host performs inside its current-read function. The sequences below are
 * the multi-step ones from the mounted-state review, so a missing commit or an overwritten unknown
 * fails here instead of being hidden by a helper's return value.
 */
describe("create recovery", () => {
  const emptyRead: ConnectorRow[] = [];

  /** The host's state binding: sequential commits through the same reducer. */
  function hostState() {
    let state = noCreateRecovery;
    return {
      commit(action: RecoveryAction) {
        state = reduceRecovery(state, action);
        return state;
      },
      read(servers: readonly ConnectorRow[]) {
        return this.commit({ type: "read", servers });
      },
      get recovery() {
        return state;
      },
    };
  }

  it("a saved response with lastError null cannot claim discovery success", async () => {
    const added = {
      ...storedRow({
        authType: "token",
        catalogId: "tavily",
        lastError: null,
        lastSyncAt: null,
        toolAllowlist: [],
        readOnlyTools: [],
      }),
      oauthRequired: false,
    };
    const { api } = fakeApi(() => added);
    const outcome = await createConnectorClient(api).connect(
      tokenEntry() as McpCatalogEntry,
      { authToken: "key" },
    );
    expect(outcome.kind).toBe("saved");
    // The add response is pre-discovery: these fields prove nothing about tool discovery.
    const saved = outcome.kind === "saved" ? outcome.connector : undefined;
    expect(saved?.lastSyncAt).toBeNull();
    expect(saved?.toolAllowlist).toEqual([]);
    const wording = `${savedOutcome({ name: "Tavily" }).title} ${savedOutcome({ name: "Tavily" }).detail}`;
    expect(wording).not.toMatch(/accepted its first tool discovery/i);
    expect(wording).not.toMatch(/can use the tools/i);
    expect(wording).not.toMatch(/discovery succeeded/i);
    expect(wording).toContain("saved");
    expect(wording).toContain("Refresh to check available tools");
  });

  it("an unknown add stays blocked across empty reads and clears only when a read lists it", async () => {
    const { api } = fakeApi(() => {
      throw new CapiroApiError(
        502,
        "The service returned an unexpected response.",
      );
    });
    const outcome = await createConnectorClient(api).connect(
      oauthEntry() as McpCatalogEntry,
      noDraft,
    );
    expect(outcome.kind).toBe("unknown_create");

    const host = hostState();
    host.commit({ type: "connect", catalogId: "notion", result: outcome });
    expect(host.recovery.unresolvedCatalogIds).toEqual(["notion"]);
    expect(host.recovery.knownCreated).toEqual([]);

    // The host dispatches no `read` action while the read is failed or in flight, so nothing here
    // can release the block; an empty successful read commits and still keeps it.
    const empty = reconcileCreate(host.recovery, emptyRead);
    expect(
      cardCommand(
        markReconciling(
          libraryCards([oauthEntry()], empty.rows),
          empty.recovery.unresolvedCatalogIds,
        )[0]!,
        true,
      ),
    ).toEqual({ kind: "none" });
    host.read(emptyRead);
    expect(host.recovery.unresolvedCatalogIds).toEqual(["notion"]);

    // A current read that lists the row settles it, and a later empty read must not revert that.
    const row = storedRow({
      id: "88888888-8888-4888-8888-888888888888",
      connectionStatus: "pending",
    });
    host.read([row]);
    expect(host.recovery.unresolvedCatalogIds).toEqual([]);
    const settled = reconcileCreate(host.recovery, [row]);
    expect(
      cardCommand(
        markReconciling(
          libraryCards([oauthEntry()], settled.rows),
          settled.recovery.unresolvedCatalogIds,
        )[0]!,
        false,
      ),
    ).toEqual({ kind: "reauthorize", connectorId: row.id });

    host.read(emptyRead);
    expect(host.recovery.unresolvedCatalogIds).toEqual([]);
  });

  it("unknown A then unknown B keeps both blocked and never re-enables A", () => {
    const host = hostState();
    host.commit({
      type: "connect",
      catalogId: "notion",
      result: { kind: "unknown_create" },
    });
    host.commit({
      type: "connect",
      catalogId: "tavily",
      result: { kind: "unknown_create" },
    });
    expect(host.recovery.unresolvedCatalogIds).toEqual(["notion", "tavily"]);

    const blocked = markReconciling(
      libraryCards([oauthEntry(), tokenEntry()], []),
      host.recovery.unresolvedCatalogIds,
    );
    expect(
      cardCommand(blocked.find((card) => card.id === "notion")!, true),
    ).toEqual({ kind: "none" });
    expect(
      cardCommand(blocked.find((card) => card.id === "tavily")!, true),
    ).toEqual({ kind: "none" });

    // Management of an already-known connection is still available while anything is unresolved.
    const known = storedRow({
      id: "77777777-7777-4777-8777-777777777777",
      catalogId: "box",
      connectionStatus: "needs_reauth",
    });
    host.commit({
      type: "connect",
      catalogId: "box",
      result: { kind: "authorization_pending", connector: known },
    });
    const withKnown = reconcileCreate(host.recovery, []);
    const managed = markReconciling(
      libraryCards(
        [oauthEntry(), tokenEntry(), oauthEntry({ id: "box" })],
        withKnown.rows,
      ),
      withKnown.recovery.unresolvedCatalogIds,
    );
    expect(
      cardCommand(managed.find((card) => card.id === "box")!, false),
    ).toEqual({
      kind: "reauthorize",
      connectorId: known.id,
    });

    // Resolving B's own row releases B only; A stays blocked.
    host.read([
      storedRow({
        id: "66666666-6666-4666-8666-666666666666",
        catalogId: "tavily",
        authType: "token",
      }),
    ]);
    expect(host.recovery.unresolvedCatalogIds).toEqual(["notion"]);
    expect(
      cardCommand(
        markReconciling(
          libraryCards([oauthEntry()], []),
          host.recovery.unresolvedCatalogIds,
        )[0]!,
        true,
      ),
    ).toEqual({ kind: "none" });
  });

  it("a known row is retired by the read, so a later acknowledged removal cannot resurrect it", () => {
    const added = {
      ...storedRow({
        id: "99999999-9999-4999-8999-999999999999",
        connectionStatus: "pending",
      }),
      oauthRequired: true,
    };
    const host = hostState();
    host.commit({
      type: "connect",
      catalogId: "notion",
      result: {
        kind: "authorization_pending",
        connector: added,
      },
    });
    expect(host.recovery.knownCreated.map((row) => row.id)).toEqual([added.id]);

    // The authoritative read lists the row, and the host commits that read.
    host.read([added]);
    expect(host.recovery.knownCreated).toEqual([]);

    // Acknowledged removal, then a successful empty read: the row must not come back.
    host.commit({ type: "removal", rowId: added.id });
    host.read([]);
    expect(reconcileCreate(host.recovery, []).rows).toEqual([]);
    expect(host.recovery.knownCreated).toEqual([]);
  });

  it("a known created row survives a failed refresh and stays retryable", () => {
    const added = {
      ...storedRow({
        id: "99999999-9999-4999-8999-999999999998",
        connectionStatus: "pending",
      }),
      oauthRequired: true,
    };
    const host = hostState();
    host.commit({
      type: "connect",
      catalogId: "notion",
      result: {
        kind: "authorization_pending",
        connector: added,
      },
    });

    // A failed read dispatches no `read` action: the created row must not disappear.
    const rows = reconcileCreate(host.recovery, []).rows;
    expect(rows.map((row) => row.id)).toEqual([added.id]);
    const cards = markReconciling(
      libraryCards([oauthEntry()], rows),
      host.recovery.unresolvedCatalogIds,
    );
    expect(cardCommand(cards[0]!, false)).toEqual({
      kind: "reauthorize",
      connectorId: added.id,
    });
  });
});

/**
 * Drift guard against the real owner. These fixtures are copied from the shapes Core emits today —
 * `MeriMcpService.catalog()`/`redact()` and the entries in `meri-mcp.catalog.ts` — so an owner change
 * that breaks the wire contract fails here instead of rendering an empty library in production.
 */
describe("Core wire contract", () => {
  it("accepts the catalog read as Core emits it, including a feature-gated token entry", () => {
    const parsed = catalogResponse.safeParse({
      oauthConfigured: true,
      oauthRedirectUri: "https://app.capiro.ai/api/clio/mcp-oauth/callback",
      connectors: [
        {
          id: "makegov-tango",
          name: "MakeGov / Tango (research)",
          category: "research",
          description: "Exploratory federal procurement research.",
          longDescription: "RESEARCH ONLY.",
          transport: "http",
          endpoint: "https://govcon.dev/mcp",
          authType: "token",
          tokenHeader: "X-Tango-API-Key",
          requiresFeature: "funding_opportunities_tango_mcp",
          verified: true,
          defaultScope: "tenant",
          docsUrl: "https://govcon.dev/docs",
          setupNote: "Paste a MakeGov/Tango API key.",
          suggestedTools: [
            {
              name: "search",
              description: "Search the provider corpus",
              readOnly: true,
            },
          ],
          brand: { color: "#0b6e4f", glyph: "search" },
          connected: false,
        },
        {
          id: "google-drive",
          name: "Google Drive",
          category: "productivity",
          description: "Search, read, and reference files across your Drive.",
          longDescription: "Ground research in your firm's own files.",
          transport: "http",
          endpoint: null,
          authType: "oauth",
          oauthClientMode: "manual",
          requiresEndpointInput: true,
          verified: true,
          defaultScope: "user",
          oauthScopes: ["https://www.googleapis.com/auth/drive.readonly"],
          suggestedTools: [
            {
              name: "search_files",
              description: "Search Drive",
              readOnly: true,
            },
          ],
          brand: { color: "#1a73e8", glyph: "folder" },
          connected: true,
        },
      ],
    });
    expect(parsed.success).toBe(true);
    const connectors = parsed.success ? parsed.data.connectors : [];
    expect(libraryCards(connectors).map((card) => card.inputs)).toEqual([
      { endpoint: true, oauthClient: true, apiKey: false },
      { endpoint: false, oauthClient: false, apiKey: true },
    ]);
  });

  it("accepts a stored connector row exactly as redact() emits it", () => {
    const parsed = connectorRow.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      name: "notion",
      transport: "http",
      endpoint: "https://mcp.notion.com/mcp",
      command: null,
      args: [],
      toolAllowlist: ["search", "fetch"],
      readOnlyTools: ["search"],
      enabled: true,
      scope: "tenant",
      catalogId: "notion",
      authType: "oauth",
      connectionStatus: "connected",
      isOwner: true,
      canManage: false,
      lastSyncAt: "2026-10-29T10:00:00.000Z",
      lastError: null,
      hasAuthToken: false,
      createdAt: "2026-10-29T09:00:00.000Z",
      updatedAt: "2026-10-29T10:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a row that carries a secret field or an unknown status", () => {
    const base = {
      id: "11111111-1111-4111-8111-111111111111",
      name: "notion",
      transport: "http",
      endpoint: "https://mcp.notion.com/mcp",
      command: null,
      args: [],
      toolAllowlist: [],
      readOnlyTools: [],
      enabled: true,
      scope: "user",
      catalogId: "notion",
      authType: "oauth",
      connectionStatus: "connected",
      isOwner: true,
      canManage: true,
      lastSyncAt: null,
      lastError: null,
      hasAuthToken: false,
      createdAt: "2026-10-29T09:00:00.000Z",
      updatedAt: "2026-10-29T10:00:00.000Z",
    };
    // A row is loose for additive display fields but can never carry a credential.
    expect(
      connectorRow.safeParse({ ...base, authTokenCiphertext: "x" }).success,
    ).toBe(false);
    expect(
      connectorRow.safeParse({ ...base, connectionStatus: "authorized" })
        .success,
    ).toBe(false);
  });
});
