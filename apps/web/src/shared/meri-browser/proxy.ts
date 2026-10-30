import {
  BROWSER_VIEWER_SCHEMA,
  BROWSER_VIEWER_ROUTES,
  BROWSER_VIEWER_LIMITS,
  BROWSER_VIEWER_ERRORS,
  receiveBrowserViewerRequest,
  type BrowserViewerRoute,
  type BrowserViewerFailure,
} from "@capiro/meri-contracts/browser-viewer";
import {
  boundedJsonBytes,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { receivedActionSession } from "../meri-actions/session-header";
import { sameRequestOrigin } from "../request-origin";
import { readMeriConnectionConfig } from "../meri-actions/connection-config";

export const readBrowserViewerConfig = (
  env: Record<string, string | undefined>,
) => {
  const config = readMeriConnectionConfig(env);
  return {
    enabled: config.conversationEnabled,
    baseUrl: config.baseUrl,
    requestOrigin: config.requestOrigin,
  };
};
const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
const refused = (
  code: keyof typeof BROWSER_VIEWER_ERRORS,
  outcome: BrowserViewerFailure["error"]["outcome"] = "NOT_DISPATCHED",
) =>
  Response.json(
    { schema: BROWSER_VIEWER_SCHEMA, error: { code, outcome } },
    { status: BROWSER_VIEWER_ERRORS[code], headers },
  );

/** Fixed forwarding only. Core and Meri authenticate each operation; the browser
 * receiver binds the reply to its admitted native conversation context. */
export async function proxyBrowserViewerRequest(
  request: Request,
  operation: string,
  config: ReturnType<typeof readBrowserViewerConfig>,
  getNativeToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  let dispatched = false;
  const writing = !["read", "frame"].includes(operation);
  try {
    if (!BROWSER_VIEWER_ROUTES.includes(operation as BrowserViewerRoute))
      return refused("NOT_FOUND");
    if (request.method !== "POST") return refused("METHOD_NOT_ALLOWED");
    const url = new URL(request.url);
    if (
      url.pathname !== `/api/meri/browser/${operation}` ||
      url.search ||
      url.hash ||
      !sameRequestOrigin(request, config.requestOrigin) ||
      request.headers.has("authorization") ||
      request.headers.has("content-encoding")
    )
      return refused("INVALID_REQUEST");
    if (!config.enabled || !config.baseUrl) return refused("UNAVAILABLE");
    const base = new URL(config.baseUrl);
    if (base.protocol !== "https:" || base.origin !== config.baseUrl)
      return refused("UNAVAILABLE");
    return await withActionDeadline([request.signal], async (signal) => {
      const nativeToken = await getNativeToken(),
        session = receivedActionSession(request);
      signal.throwIfAborted();
      if (!nativeToken || !session) return refused("UNAUTHENTICATED");
      const body = await boundedJsonBytes(
        new Response(request.body, { headers: request.headers }),
        signal,
        BROWSER_VIEWER_LIMITS.requestBytes,
      );
      try {
        receiveBrowserViewerRequest(operation as BrowserViewerRoute, body);
      } catch {
        return refused("INVALID_REQUEST");
      }
      signal.throwIfAborted();
      dispatched = true;
      const response = await fetcher(
        `${base.origin}/api/meri/browser/${operation}`,
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
        if (
          response.redirected ||
          response.headers.has("content-encoding") ||
          ![200, ...Object.values(BROWSER_VIEWER_ERRORS)].includes(
            response.status,
          )
        )
          throw new Error("Viewer response refused");
        const bytes = await boundedJsonBytes(
          response,
          signal,
          BROWSER_VIEWER_LIMITS.responseBytes,
        );
        signal.throwIfAborted();
        return new Response(bytes, { status: response.status, headers });
      } finally {
        void response.body?.cancel().catch(() => undefined);
      }
    });
  } catch {
    return refused(
      "REFUSED",
      dispatched
        ? writing
          ? "UNKNOWN"
          : "READ_UNAVAILABLE"
        : "NOT_DISPATCHED",
    );
  } finally {
    if (!request.bodyUsed) void request.body?.cancel().catch(() => undefined);
  }
}
