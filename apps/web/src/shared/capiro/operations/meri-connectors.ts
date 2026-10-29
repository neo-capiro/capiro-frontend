import { z } from "zod";
import { defineOperation } from "../contracts";

/**
 * Connected-services (external MCP connector) operations — the existing Core owner.
 *
 * Every route below already exists in canonical Core behind `@Roles('standard_user')`
 * (`@Controller('clio')` + `mcp-catalog` / `mcp-servers`):
 * apps/api/src/meri/meri.controller.ts:975-1034, implemented by MeriMcpService and
 * MeriMcpOAuthService over the curated library in apps/api/src/meri/meri-mcp.catalog.ts.
 *
 * This leaf only declares the reviewed wire contract for the browse/connect surface. It adds no
 * catalog, no OAuth flow, no token store and no authority of its own: Core still resolves the
 * caller's tenant/member scope (firm-wide connectors stay admin-managed, personal ones stay owned
 * by the caller), encrypts and refreshes credentials at the existing protected path, and enforces
 * `enabled`/`connectionStatus` before any provider call. Both reads and the resulting tool use
 * already exist in the Meri runtime's `connected-apps` read family, so nothing here widens what a
 * turn may do.
 *
 * Scope note: this leaf deliberately exposes NO custom/stdio connector creation. The operator gate
 * for stdio commands (`CLIO_MCP_STDIO_ALLOWED_COMMANDS`) and the tenant-supplied endpoint path
 * (`POST /clio/mcp-servers`) stay unreachable from the browser surface, so the UI can only add an
 * entry that already exists in the reviewed Capiro catalog.
 *
 * The shared registry (shared/capiro/registry.ts) is the gateway allowlist and is composed by the
 * parent — this leaf is not spread in by this change.
 */
const source =
  "capiro-backend apps/api/src/meri/meri.controller.ts:975-1034 (@Roles('standard_user'), @Controller('clio') /mcp-catalog and /mcp-servers) + meri-mcp.service.ts + meri-mcp-oauth.service.ts + meri-mcp.catalog.ts";

const canonicalUuid = z
  .uuid()
  .refine((value) => value === value.toLowerCase(), "Use a canonical UUID.");

const serverParams = z.object({ id: canonicalUuid }).strict();

const catalogTool = z.looseObject({
  name: z.string().min(1),
  description: z.string(),
  readOnly: z.boolean().optional(),
});

/**
 * One curated entry, exactly as `meri-mcp.catalog.ts` declares it.
 *
 * Loose rather than strict on purpose: the catalog is code, and an additive display field must not
 * make the whole library unrenderable through the gateway. Every field the surface reads and every
 * field that changes what a click does (transport, authType, oauthClientMode, endpoint, tokenHeader,
 * requiresFeature) is required or explicitly optional here, so a malformed entry is still rejected
 * rather than defaulted into a connect attempt.
 */
export const mcpCatalogEntry = z.looseObject({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  category: z.enum([
    "productivity",
    "research",
    "crm",
    "developer",
    "communication",
  ]),
  description: z.string(),
  longDescription: z.string(),
  transport: z.enum(["http", "stdio"]),
  endpoint: z.string().nullable(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  authType: z.enum(["none", "token", "oauth"]),
  oauthClientMode: z.enum(["dynamic", "manual"]).optional(),
  verified: z.boolean(),
  defaultScope: z.enum(["tenant", "user"]),
  suggestedTools: z.array(catalogTool),
  oauthScopes: z.array(z.string()).optional(),
  docsUrl: z.string().optional(),
  requiresEndpointInput: z.boolean().optional(),
  setupNote: z.string().optional(),
  tokenHeader: z.enum(["Authorization", "X-Tango-API-Key"]).optional(),
  requiresFeature: z.string().optional(),
  brand: z.looseObject({ color: z.string(), glyph: z.string() }),
});

export type McpCatalogEntry = z.infer<typeof mcpCatalogEntry>;

export const catalogResponse = z.strictObject({
  /** Whether OAuth (redirect URI + state secret + token key) is configured for this deployment. */
  oauthConfigured: z.boolean(),
  /** The absolute callback URL an admin registers in a manual OAuth app; null when unconfigured. */
  oauthRedirectUri: z.string().nullable(),
  connectors: z.array(
    z.looseObject({
      ...mcpCatalogEntry.shape,
      connected: z.boolean(),
    }),
  ),
});

export type ConnectorLibrary = z.infer<typeof catalogResponse>;
export type LibraryConnector = ConnectorLibrary["connectors"][number];

/**
 * One stored connector row, exactly as `MeriMcpService.redact()` emits it. Secrets are never part
 * of this shape — `hasAuthToken` is a boolean derived by Core, and the encrypted columns, OAuth
 * client material and refreshed tokens never leave the API. Strict rather than loose: an additive
 * row field must be reviewed here before a browser can receive it, so an unexpected column (a
 * ciphertext, a token envelope) fails the read instead of passing through.
 */
export const connectorRow = z.strictObject({
  id: canonicalUuid,
  name: z.string().min(1),
  transport: z.enum(["http", "stdio"]),
  endpoint: z.string().nullable(),
  command: z.string().nullable(),
  args: z.array(z.string()),
  toolAllowlist: z.array(z.string()),
  readOnlyTools: z.array(z.string()),
  enabled: z.boolean(),
  scope: z.enum(["tenant", "user"]),
  catalogId: z.string().nullable(),
  authType: z.enum(["none", "token", "oauth"]),
  connectionStatus: z.enum([
    "pending",
    "connected",
    "needs_reauth",
    "error",
    "disconnected",
  ]),
  isOwner: z.boolean(),
  canManage: z.boolean(),
  lastSyncAt: z.string().nullable(),
  lastError: z.string().nullable(),
  hasAuthToken: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ConnectorRow = z.infer<typeof connectorRow>;

/**
 * The one-click add body. Only the fields a catalog entry can legitimately need: the id it came
 * from, an optional scope override (Core refuses a firm-wide add for a non-admin), the endpoint an
 * entry marked `requiresEndpointInput` demands, a static key for `authType: 'token'`, and the
 * pre-registered OAuth client for `oauthClientMode: 'manual'` entries. `transport`, `command`,
 * `args` and `env` are intentionally absent — a browser cannot name a stdio command here.
 */
export const addConnectorBody = z
  .object({
    catalogId: z.string().min(1).max(64),
    scope: z.enum(["tenant", "user"]).optional(),
    endpoint: z.string().min(1).max(2048).optional(),
    authToken: z.string().min(1).max(4096).optional(),
    oauthClientId: z.string().min(1).max(512).optional(),
    oauthClientSecret: z.string().min(1).max(4096).optional(),
  })
  .strict();

export type AddConnectorBody = z.infer<typeof addConnectorBody>;

const addedConnector = z.looseObject({
  ...connectorRow.shape,
  /** True when the entry uses OAuth: the surface must continue into `oauth/start`. */
  oauthRequired: z.boolean(),
});

export const deletedConnector = z.strictObject({ deleted: z.literal(true) });

export const refreshedConnectors = z.strictObject({
  tools: z.array(z.string()),
  refreshedAt: z.string(),
});

/** `MeriMcpOAuthService.start()`: the authorization URL to navigate to, or an existing link. */
export const connectorOAuthStart = z.strictObject({
  authUrl: z.string().nullable(),
  alreadyConnected: z.boolean().optional(),
});

export const connectorOAuthDisconnect = z.strictObject({
  disconnected: z.literal(true),
});

export const meriConnectorOperations = {
  "meri.connectors.catalog": defineOperation({
    service: "core",
    method: "GET",
    path: "/clio/mcp-catalog",

    request: z.object({}).strict(),
    response: catalogResponse,
    source,
  }),
  "meri.connectors.servers": defineOperation({
    service: "core",
    method: "GET",
    path: "/clio/mcp-servers",

    request: z.object({}).strict(),
    response: z.array(connectorRow),
    source,
  }),
  "meri.connectors.add": defineOperation({
    service: "core",
    method: "POST",
    path: "/clio/mcp-servers/from-catalog",

    request: z.object({ body: addConnectorBody }).strict(),
    response: addedConnector,
    source,
    requestLimitBytes: 16384,
  }),
  "meri.connectors.remove": defineOperation({
    service: "core",
    method: "DELETE",
    path: "/clio/mcp-servers/:id",

    request: z.object({ params: serverParams }).strict(),
    response: deletedConnector,
    source,
  }),
  "meri.connectors.refresh": defineOperation({
    service: "core",
    method: "POST",
    path: "/clio/mcp-servers/refresh",

    request: z.object({}).strict(),
    response: refreshedConnectors,
    source,
  }),
  "meri.connectors.oauthStart": defineOperation({
    service: "core",
    method: "POST",
    path: "/clio/mcp-servers/:id/oauth/start",

    request: z.object({ params: serverParams }).strict(),
    response: connectorOAuthStart,
    source,
  }),
  "meri.connectors.oauthDisconnect": defineOperation({
    service: "core",
    method: "POST",
    path: "/clio/mcp-servers/:id/oauth/disconnect",

    request: z.object({ params: serverParams }).strict(),
    response: connectorOAuthDisconnect,
    source,
  }),
} as const;

export const meriConnectorOperationKeys = Object.keys(
  meriConnectorOperations,
) as ReadonlyArray<keyof typeof meriConnectorOperations>;
