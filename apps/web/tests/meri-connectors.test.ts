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
  connectGate,
  connectedServiceRow,
  libraryCards,
  libraryNotice,
  statusLabel,
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

  it("refuses an entry this workspace has not been given", () => {
    const gate = connectGate(
      tokenEntry({
        requiresFeature: "funding_opportunities_tango_mcp",
      }) as McpCatalogEntry,
      { authToken: "key" },
    );
    expect(gate.ok).toBe(false);
    expect(gate.ok === false && gate.reason).toContain(
      "not available for this workspace",
    );
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
      authUrl: "https://provider.example/authorize?state=abc",
    });
    expect(recorded.map((call) => call.key)).toEqual([
      "meri.connectors.add",
      "meri.connectors.oauthStart",
    ]);
    expect(recorded[1]?.input).toEqual({ params: { id: added.id } });
  });

  it("stops at the add for a key-based connector", async () => {
    const { api, recorded } = fakeApi(() => ({
      ...storedRow({ authType: "token" }),
      oauthRequired: false,
    }));
    const outcome = await createConnectorClient(api).connect(
      tokenEntry() as McpCatalogEntry,
      { authToken: "key" },
    );
    expect(outcome.kind).toBe("connected");
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
    expect(outcome).toEqual({ kind: "already_connected" });
  });

  it("reports a missing authorization URL honestly rather than pretending success", async () => {
    const added = { ...storedRow(), oauthRequired: true };
    const { api } = fakeApi((key) =>
      key === "meri.connectors.add" ? added : { authUrl: null },
    );
    const outcome = await createConnectorClient(api).connect(
      oauthEntry() as McpCatalogEntry,
      noDraft,
    );
    expect(outcome.kind).toBe("refused");
    expect(outcome.kind === "refused" && outcome.reason).toContain(
      "authorization page",
    );
  });

  it("revokes and removes through the existing Core routes", async () => {
    const { api, recorded } = fakeApi((key) =>
      key === "meri.connectors.oauthDisconnect"
        ? { disconnected: true }
        : { deleted: true },
    );
    const client = createConnectorClient(api);
    const id = storedRow().id;
    await client.disconnect(id);
    await client.remove(id);
    expect(recorded).toEqual([
      { key: "meri.connectors.oauthDisconnect", input: { params: { id } } },
      { key: "meri.connectors.remove", input: { params: { id } } },
    ]);
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
