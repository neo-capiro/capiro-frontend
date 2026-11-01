import { conversationApplicationMetadata as protocol } from "@capiro/meri-contracts/conversation-application";
import { conversationInitialInputMetadata as initial } from "@capiro/meri-contracts/conversation-initial-input";
import {
  boundedJsonBytes,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { receivedActionSession } from "../meri-actions/session-header";
import {
  conversationBody,
  conversationRoute,
  validConversationRequest,
} from "./input";
import { boundedConversationStream } from "./stream";
import { trustedConversationFrontendOrigin } from "./frontend-origin";
import {
  beginHistoryTransportDiagnostic,
  historyTraceHeader,
} from "./history-diagnostics";

const responseHeaders = [
  "content-type",
  "content-length",
  "cache-control",
  "x-content-type-options",
  "x-vercel-ai-ui-message-stream",
  "x-accel-buffering",
  "retry-after",
];
/**
 * Meri closes each observation window cleanly within 30 s of its own start, which precedes its response headers. Measured
 * from the headers, this bound therefore only catches a stream that outlives Meri's window; it never races a healthy close.
 */
const STREAM_BOUND_MS = 35_000;
const unavailable = (status: number) =>
  Response.json(
    {
      error: {
        code:
          status === 404
            ? "NOT_FOUND"
            : status === 405
              ? "METHOD_NOT_ALLOWED"
              : status === 401
                ? "SESSION_REFUSED"
                : status === 400
                  ? "INVALID_REQUEST"
                  : "CONVERSATION_UNAVAILABLE",
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
export type ConversationProxyConfig = {
  enabled: boolean;
  baseUrl?: string;
  frontendOrigin?: string;
  /** Configured browser-visible origin; undefined compares against the request URL. */
  requestOrigin?: string | null;
};

function configuredOrigin(config: ConversationProxyConfig) {
  if (!config.enabled || !config.baseUrl) return undefined;
  try {
    const value = new URL(config.baseUrl);
    if (value.protocol === "https:" && value.origin === config.baseUrl)
      return value.origin;
  } catch {
    /* Invalid configuration remains unavailable. */
  }
  return undefined;
}

async function receivedConversation(
  response: Response,
  route: NonNullable<ReturnType<typeof conversationRoute>>,
  signal: AbortSignal,
  transport: AbortController,
  requestSignal: AbortSignal,
) {
  signal.throwIfAborted();
  if (response.redirected || response.headers.has("content-encoding"))
    throw new Error("Unexpected conversation response");
  const headers = new Headers();
  for (const name of responseHeaders) {
    const value = response.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  // Authenticated conversation content must remain uncacheable even if an owner omits a header.
  if (!/(^|,)\s*no-store\s*(,|$)/i.test(headers.get("cache-control") ?? ""))
    headers.set("Cache-Control", "no-store");
  if (!headers.has("x-content-type-options"))
    headers.set("X-Content-Type-Options", "nosniff");
  if (route === "reconnect" && response.status === 204) {
    if (response.body) throw new Error("Unexpected reconnect body");
    return new Response(null, { status: response.status, headers });
  }
  if (
    (route === "events" || route === "reconnect") &&
    response.status === 200
  ) {
    if (
      !/^text\/event-stream(?:;\s*charset=utf-8)?$/i.test(
        response.headers.get("content-type") ?? "",
      )
    )
      throw new Error("Unexpected conversation stream");
    const body = boundedConversationStream(
      response,
      AbortSignal.any([requestSignal, transport.signal]),
      () => transport.abort(),
      STREAM_BOUND_MS,
    );
    return new Response(body, { status: response.status, headers });
  }
  const body = await boundedJsonBytes(
    response,
    signal,
    route === "inputAllocate"
      ? initial.limits.responseBytes
      : protocol.limits.responseBytes,
  );
  signal.throwIfAborted();
  return new Response(body, { status: response.status, headers });
}

function upstreamHeaders(
  request: Request,
  route: NonNullable<ReturnType<typeof conversationRoute>>,
  bearer: string,
  frontendOrigin: string,
  hasBody: boolean,
) {
  const headers = new Headers({
    Authorization: bearer,
    Origin: frontendOrigin,
  });
  if (hasBody) headers.set("Content-Type", "application/json");
  if (route === "reconnect")
    headers.set(
      protocol.routes.reconnect.cursorHeader,
      request.headers.get(protocol.routes.reconnect.cursorHeader) ?? "0",
    );
  return headers;
}

/** Fixed same-origin public adapter. Meri owns current-session/run authority. */
export async function proxyConversationRequest(
  request: Request,
  path: string,
  config: ConversationProxyConfig,
  getNativeToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
  beginHistoryDiagnostic = beginHistoryTransportDiagnostic,
) {
  const route = conversationRoute(path);
  if (!route) return unavailable(404);
  const diagnostic = route === "history" ? beginHistoryDiagnostic() : undefined;
  const localResponse = (status: number) => {
    diagnostic?.finish(status, "response");
    return unavailable(status);
  };
  if (request.method !== (route === "reconnect" ? "GET" : "POST"))
    return localResponse(405);
  if (!validConversationRequest(request, path, route, config.requestOrigin))
    return localResponse(400);
  diagnostic?.stage("configuration");
  const origin = configuredOrigin(config);
  const frontendOrigin = trustedConversationFrontendOrigin(
    request,
    config.frontendOrigin,
    config.requestOrigin,
  );
  if (!origin || !frontendOrigin) return localResponse(502);
  diagnostic?.stage("session");
  const transport = new AbortController();
  const abort = () => transport.abort();
  request.signal.addEventListener("abort", abort, { once: true });
  if (request.signal.aborted) abort();
  try {
    const result = await withActionDeadline(
      [request.signal, transport.signal],
      async (signal) => {
        const token = await getNativeToken();
        signal.throwIfAborted();
        const session = receivedActionSession(request);
        if (!token || !session) return unavailable(401);
        diagnostic?.stage("request");
        let body: Uint8Array<ArrayBuffer> | undefined;
        if (route !== "reconnect") {
          try {
            body = await conversationBody(request, route, signal);
          } catch {
            signal.throwIfAborted();
            return unavailable(400);
          }
        }
        // Meri's control service reads the opaque session as a bearer.
        const headers = upstreamHeaders(
          request,
          route,
          `Bearer ${session}`,
          frontendOrigin,
          Boolean(body),
        );
        if (diagnostic) headers.set(historyTraceHeader, diagnostic.trace);
        signal.throwIfAborted();
        diagnostic?.stage("fetch");
        const response = await fetcher(`${origin}/api/conversations/${path}`, {
          method: request.method,
          ...(body ? { body } : {}),
          headers,
          credentials: "omit",
          redirect: "error",
          cache: "no-store",
          signal,
        });
        diagnostic?.stage("receive");
        diagnostic?.received(response.status);
        try {
          return await receivedConversation(
            response,
            route,
            signal,
            transport,
            request.signal,
          );
        } finally {
          if (!response.bodyUsed)
            void response.body?.cancel().catch(() => undefined);
        }
      },
      route === "inputAllocate" ? initial.limits.maxRequestMs : undefined,
    );
    diagnostic?.finish(result.status, "response");
    return result;
  } catch {
    transport.abort();
    // A dispatched write may have reached Meri; no outcome or automatic retry is invented.
    diagnostic?.finish(502, "failure");
    return unavailable(502);
  } finally {
    request.signal.removeEventListener("abort", abort);
  }
}
