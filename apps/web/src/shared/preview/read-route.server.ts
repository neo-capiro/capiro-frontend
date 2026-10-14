import type { OperationDefinition } from "../capiro/contracts";
import { getRequestInput } from "../capiro/gateway-input";
import { settingsOperations } from "../capiro/operations/settings";

const clientId =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const corePath = new RegExp(
  `^/api/backend/core/(me|clients|clients/${clientId})$`,
);
const forbiddenHeaders = [
  "x-http-method-override",
  "x-method-override",
  "x-http-method",
  "x-capiro-tenant",
  "x-capiro-impersonate-tenant",
  "x-tenant-id",
  "x-client-id",
  "x-user-id",
];
export type PreviewReadRoute = {
  browserPath: string;
  path: string;
  query: Record<string, string | boolean | undefined>;
  operation?: OperationDefinition;
};

function coreQuery(url: URL, path: string): PreviewReadRoute["query"] | null {
  if (path !== "/clients") return url.search ? null : {};
  const query: Record<string, string | boolean> = Object.create(null);
  for (const [key, value] of url.searchParams) {
    if (Object.hasOwn(query, key)) return null;
    if (key === "includeArchived") {
      if (value !== "true" && value !== "false") return null;
      query[key] = value === "true";
    } else query[key] = value;
  }
  const parsed = settingsOperations["clients.list"].request.safeParse({
    query,
  });
  return parsed.success ? (parsed.data.query ?? {}) : null;
}

/** Browser paths map to three backend GETs; existing fixed-operation schemas own DTOs. */
export function previewReadRoute(request: Request): PreviewReadRoute | null {
  if (
    request.method !== "GET" ||
    request.body ||
    forbiddenHeaders.some((header) => request.headers.has(header))
  )
    return null;
  try {
    const url = new URL(request.url);
    if (url.search.length > 16_000) return null;
    const core = corePath.exec(url.pathname);
    if (core) {
      const path = `/${core[1]}`;
      const query = coreQuery(url, path);
      return query ? { browserPath: url.pathname, path, query } : null;
    }
    const key =
      url.pathname === "/api/capiro/me.read"
        ? "me.read"
        : url.pathname === "/api/capiro/clients.list"
          ? "clients.list"
          : null;
    if (!key) return null;
    const operation = settingsOperations[key];
    const parsed = operation.request.safeParse(getRequestInput(request));
    if (
      !parsed.success ||
      operation.method !== "GET" ||
      operation.service !== "core" ||
      operation.path !== (key === "me.read" ? "/me" : "/clients")
    )
      return null;
    return {
      browserPath: url.pathname,
      path: operation.path,
      query: "query" in parsed.data ? (parsed.data.query ?? {}) : {},
      operation,
    };
  } catch {
    return null;
  }
}
