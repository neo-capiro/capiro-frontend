import type {
  CapiroService,
  OperationDefinition,
  OperationRegistry,
} from "../capiro/contracts";
import {
  appendQuery,
  getRequestInput,
  operationPath,
} from "../capiro/gateway-input";
import { capiroOperations } from "../capiro/registry";

/** Preview backends share the preview API host under their production path prefixes. */
export const previewServicePrefixes = {
  core: "/api",
  strategy: "/strategy-api",
  workspace: "/workspace-api",
  intelligence: "/intel-api",
} as const satisfies Partial<Record<CapiroService, string>>;
type PreviewService = keyof typeof previewServicePrefixes;
const isPreviewService = (service: string): service is PreviewService =>
  Object.hasOwn(previewServicePrefixes, service);
const backendPath = /^\/api\/backend\/([a-z]+)((?:\/[A-Za-z0-9._~-]+)+)$/;
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
  service: PreviewService;
  /** Backend path relative to the service prefix, with its query string. */
  path: string;
  operation?: OperationDefinition;
};

const registry: OperationRegistry = capiroOperations;

/** Every preview-service GET: raw Portfolio paths pass through; registered operations keep their own schemas. */
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
    const backend = backendPath.exec(url.pathname);
    // URL parsing already resolved dot segments; the pattern refuses any escape.
    if (backend) {
      const [, service = "", path = ""] = backend;
      return isPreviewService(service)
        ? { browserPath: url.pathname, service, path: path + url.search }
        : null;
    }
    if (!url.pathname.startsWith("/api/capiro/")) return null;
    const key = url.pathname.slice("/api/capiro/".length);
    const operation = Object.hasOwn(registry, key) ? registry[key] : undefined;
    if (operation?.method !== "GET" || !isPreviewService(operation.service))
      return null;
    const parsed = operation.request.safeParse(getRequestInput(request));
    if (!parsed.success) return null;
    const target = new URL(
      `https://backend.invalid${operationPath(operation, parsed.data)}`,
    );
    appendQuery(target, operation, parsed.data);
    return {
      browserPath: url.pathname,
      service: operation.service,
      path: target.pathname + target.search,
      operation,
    };
  } catch {
    return null;
  }
}
