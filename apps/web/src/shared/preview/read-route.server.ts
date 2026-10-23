import type {
  OperationDefinition,
  OperationRegistry,
} from "../capiro/contracts";
import {
  appendQuery,
  getRequestInput,
  operationPath,
} from "../capiro/gateway-input";
import { capiroOperations } from "../capiro/registry";

const corePath = /^\/api\/backend\/core((?:\/[A-Za-z0-9._~-]+)+)$/;
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
  /** Backend path relative to the preview API target, with its query string. */
  path: string;
  operation?: OperationDefinition;
};

const registry: OperationRegistry = capiroOperations;
function coreRead(key: string): OperationDefinition | null {
  const operation = Object.hasOwn(registry, key) ? registry[key]! : null;
  return operation?.method === "GET" && operation.service === "core"
    ? operation
    : null;
}

/** Every Core GET: raw Portfolio paths pass through; registered operations keep their own schemas. */
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
    // URL parsing already resolved dot segments; the pattern refuses any escape.
    if (core) return { browserPath: url.pathname, path: core[1] + url.search };
    if (!url.pathname.startsWith("/api/capiro/")) return null;
    const operation = coreRead(url.pathname.slice("/api/capiro/".length));
    if (!operation) return null;
    const parsed = operation.request.safeParse(getRequestInput(request));
    if (!parsed.success) return null;
    const backend = new URL(
      `https://backend.invalid${operationPath(operation, parsed.data)}`,
    );
    appendQuery(backend, operation, parsed.data);
    return {
      browserPath: url.pathname,
      path: backend.pathname + backend.search,
      operation,
    };
  } catch {
    return null;
  }
}
