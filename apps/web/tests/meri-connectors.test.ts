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
  applyConnectOutcome,
  cardCommand,
  connectGate,
  connectedServiceRow,
  connectionEndAction,
  libraryCards,
  libraryNotice,
  markReconciling,
  noCreateRecovery,
  reconcileCreate,
  savedOutcome,
  statusLabel,
  storedConnectorFor,
  type ConnectDraft,
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

  it("surfaces Core's stored lastError without inventing health", () => {
    expect(connectedServiceRow(storedRow()).detail).toBeUndefined();
    expect(
      connectedServiceRow(
        storedRow({
          connectionStatus: "error",
          lastError: "Tool discovery failed.",
        }),
      ).detail,
    ).toBe("Tool discovery failed.");
  });
});

describe("library cards", () => {
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
 * The host's own create-recovery transitions, driven through the real client with a recording
 * transport and then through the exact functions `ConnectorLibraryHost` calls to render.
 *
 * These are the F1/F2 residuals: a saved response carries no discovery evidence, and an unknown
 * create must not be reconciled away by a single empty read so that a second (non-idempotent) add
 * becomes clickable again.
 */
describe("create recovery", () => {
  const emptyRead: ConnectorRow[] = [];

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
    expect(wording).toContain("before tool discovery");
    expect(wording).toContain("current read");
  });

  it("an unknown first add stays blocked against an empty or failed read", async () => {
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
    const recovery = applyConnectOutcome(noCreateRecovery, "notion", outcome);
    expect(recovery.unresolvedCatalogId).toBe("notion");
    expect(recovery.knownCreated).toEqual([]);

    // Empty rows from a ready read, a failed read or an in-flight read are all the same here:
    // none of them proves the write did not happen, so the entry stays blocked.
    const reconciled = reconcileCreate(recovery, emptyRead);
    expect(reconciled.recovery.unresolvedCatalogId).toBe("notion");
    const cards = markReconciling(
      libraryCards([oauthEntry()], reconciled.rows),
      reconciled.recovery.unresolvedCatalogId,
    );
    expect(cardCommand(cards[0]!, false)).toEqual({ kind: "none" });
    expect(cardCommand(cards[0]!, true)).toEqual({ kind: "none" });
  });

  it("an observed row releases the block and is re-authorized by its own id", async () => {
    const row = storedRow({
      id: "88888888-8888-4888-8888-888888888888",
      connectionStatus: "pending",
    });
    const blocked = applyConnectOutcome(noCreateRecovery, "notion", {
      kind: "unknown_create",
    });
    const reconciled = reconcileCreate(blocked, [row]);
    expect(reconciled.recovery.unresolvedCatalogId).toBeUndefined();
    const cards = markReconciling(
      libraryCards([oauthEntry()], reconciled.rows),
      reconciled.recovery.unresolvedCatalogId,
    );
    expect(cardCommand(cards[0]!, false)).toEqual({
      kind: "reauthorize",
      connectorId: row.id,
    });
  });

  it("a known created row survives a failed refresh and stays retryable", async () => {
    const added = {
      ...storedRow({
        id: "99999999-9999-4999-8999-999999999999",
        connectionStatus: "pending",
      }),
      oauthRequired: true,
    };
    const { api } = fakeApi((key) => {
      if (key === "meri.connectors.add") return added;
      throw new Error("OAuth is not configured for this deployment.");
    });
    const outcome = await createConnectorClient(api).connect(
      oauthEntry() as McpCatalogEntry,
      noDraft,
    );
    expect(outcome.kind).toBe("authorization_pending");
    const recovery = applyConnectOutcome(noCreateRecovery, "notion", outcome);
    expect(recovery.knownCreated.map((row) => row.id)).toEqual([added.id]);
    expect(recovery.unresolvedCatalogId).toBeUndefined();

    // The immediate re-read fails (or is still empty): the created row must not disappear.
    const failed = reconcileCreate(recovery, []);
    expect(failed.rows.map((row) => row.id)).toEqual([added.id]);
    const cards = markReconciling(
      libraryCards([oauthEntry()], failed.rows),
      failed.recovery.unresolvedCatalogId,
    );
    expect(cardCommand(cards[0]!, false)).toEqual({
      kind: "reauthorize",
      connectorId: added.id,
    });

    // Once the read lists it, the row appears exactly once and is no longer recovery state.
    const listed = reconcileCreate(recovery, [added]);
    expect(listed.rows.map((row) => row.id)).toEqual([added.id]);
    expect(listed.recovery.knownCreated).toEqual([]);
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
