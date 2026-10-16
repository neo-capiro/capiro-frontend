import { receiveDocumentRequest } from "@capiro/meri-contracts/document-application";
import type { DocumentRoute } from "@capiro/meri-contracts/document-application";
import {
  boundedJsonBytes,
  boundedResponseBytes,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import type { readDocumentConfig } from "./config";

const routes = new Set<string>(["create", "revise", "inspect", "download"]);
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
    request.headers.get("origin") !== url.origin ||
    request.headers.has("content-encoding")
  )
    return unavailable(400);
  const route = operation as DocumentRoute;
  // Writes need the bound document family; version reads also serve conversation artifacts.
  const write = route === "create" || route === "revise";
  if (!(write ? config.enabled && config.operation : config.readEnabled))
    return unavailable(503);
  try {
    return await withActionDeadline([request.signal], async (signal) => {
      const nativeToken = await getNativeToken();
      signal.throwIfAborted();
      if (!nativeToken) return unavailable(401);
      const bearer = request.headers.get("authorization");
      if (!bearer || !/^Bearer action_session_[A-Za-z0-9_-]{43}$/.test(bearer))
        return unavailable(401);
      const body = await boundedJsonBytes(
        new Response(request.body, { headers: request.headers }),
        signal,
        2 * 1024 * 1024,
      );
      const admitted = receiveDocumentRequest(route, body);
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
            Authorization: bearer,
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
        const binary = route === "download" && response.status === 200;
        const bytes = await (binary ? boundedResponseBytes : boundedJsonBytes)(
          response,
          signal,
          16 * 1024 * 1024,
        );
        signal.throwIfAborted();
        const headers = new Headers(binary ? undefined : jsonHeaders);
        if (binary)
          for (const name of binaryHeaders) {
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
