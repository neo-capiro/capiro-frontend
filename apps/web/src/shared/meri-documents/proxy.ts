import { receiveDocumentRequest } from "@capiro/meri-contracts/document-application";
import type { DocumentRoute } from "@capiro/meri-contracts/document-application";
import {
  receiveDocumentRequest as receiveAccessRequest,
  type DocumentAccessRoute,
  receiveDocumentPreviewRequest,
} from "@capiro/meri-client/document-access";
import {
  boundedJsonBytes,
  boundedResponseBytes,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { receivedActionSession } from "../meri-actions/session-header";
import { sameRequestOrigin } from "../request-origin";
import type { readDocumentConfig } from "./config";

const routes = new Set<string>([
  "create",
  "revise",
  "inspect",
  "download",
  "history",
  "list",
  "preview",
  "preview-publish",
]);
const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const unavailable = (status: number) =>
  Response.json(
    { error: { code: "FRONTEND_DOCUMENT_UNAVAILABLE" } },
    { status, headers: jsonHeaders },
  );
const binaryHeaders = [
  "content-type",
  "content-length",
  "content-disposition",
  "cache-control",
  "x-content-type-options",
  "content-encoding",
];

/** Fixed document forwarding only. The remote application owns current authority. */
export async function proxyDocumentRequest(
  request: Request,
  operation: string,
  config: ReturnType<typeof readDocumentConfig>,
  getNativeToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  if (!routes.has(operation)) return unavailable(404);
  if (request.method !== "POST") return unavailable(405);
  const url = new URL(request.url);
  if (
    url.pathname !== `/api/documents/${operation}` ||
    url.search ||
    !sameRequestOrigin(request, config.requestOrigin) ||
    // A browser bearer would shadow the native Clerk cookie; the opaque session has its own header.
    request.headers.has("authorization") ||
    request.headers.has("content-encoding")
  )
    return unavailable(400);
  const route = operation as
    | DocumentRoute
    | DocumentAccessRoute
    | "preview"
    | "preview-publish";
  // Generation needs the bound document family. Preview publication is an explicit derived write
  // with its own current remote permission; readEnabled only enables forwarding, never grants it.
  const write = route === "create" || route === "revise";
  if (!(write ? config.enabled && config.operation : config.readEnabled))
    return unavailable(503);
  try {
    return await withActionDeadline([request.signal], async (signal) => {
      const nativeToken = await getNativeToken();
      signal.throwIfAborted();
      if (!nativeToken) return unavailable(401);
      const session = receivedActionSession(request);
      if (!session) return unavailable(401);
      const body = await boundedJsonBytes(
        new Response(request.body, { headers: request.headers }),
        signal,
        2 * 1024 * 1024,
      );
      const admitted =
        route === "preview" || route === "preview-publish"
          ? receiveDocumentPreviewRequest(
              route === "preview" ? "read" : "publish",
              body,
            )
          : write
            ? receiveDocumentRequest(route as "create" | "revise", body)
            : receiveAccessRequest(route as DocumentAccessRoute, body);
      if (
        "request" in admitted &&
        admitted.request.operation !== config.operation
      )
        return unavailable(400);
      signal.throwIfAborted();
      const response = await fetcher(
        `${config.baseUrl}/api/documents/${route}`,
        {
          method: "POST",
          body,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session}`,
          },
          credentials: "omit",
          redirect: "error",
          cache: "no-store",
          signal,
        },
      );
      try {
        signal.throwIfAborted();
        if (response.redirected)
          throw new Error("Redirected document response");
        const binary =
          (route === "download" || route === "preview") &&
          response.status === 200;
        const bytes = await (binary ? boundedResponseBytes : boundedJsonBytes)(
          response,
          signal,
          route === "preview" ? 8 * 1024 * 1024 : 16 * 1024 * 1024,
        );
        signal.throwIfAborted();
        const headers = new Headers(binary ? undefined : jsonHeaders);
        if (binary)
          for (const name of route === "preview"
            ? [
                ...binaryHeaders,
                "content-security-policy",
                "x-meri-preview-id",
                "x-meri-preview-source-version",
                "x-meri-preview-source-sha256",
                "x-meri-preview-sha256",
                "x-meri-preview-pages",
                "x-meri-preview-record-sha256",
              ]
            : binaryHeaders) {
            const value = response.headers.get(name);
            if (value !== null) headers.set(name, value);
          }
        return new Response(bytes, { status: response.status, headers });
      } finally {
        if (!response.bodyUsed)
          void response.body?.cancel().catch(() => undefined);
      }
    });
  } catch {
    // An interrupted write may have reached Meri; no dispatch outcome is invented.
    return unavailable(502);
  }
}
