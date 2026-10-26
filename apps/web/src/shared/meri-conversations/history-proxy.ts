import {
  conversationHistoryMetadata as protocol,
  receiveConversationHistoryRequest,
  receiveConversationHistoryResponse,
} from "@capiro/meri-contracts/conversation-history";
import {
  boundedJsonBytes,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { sameRequestOrigin } from "../request-origin";
import type { ConversationProxyConfig } from "./proxy";
import type { HistoryRoute } from "./history-client";
import { trustedConversationFrontendOrigin } from "./frontend-origin";
import type { CurrentReadOperation } from "./current-reads";
export { conversationCurrentReadOperation } from "./current-reads";

const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
const unavailable = (status: number, uncertain = false) =>
  Response.json(
    {
      error: {
        code:
          status === 400
            ? "INVALID_REQUEST"
            : status === 401
              ? "UNAUTHENTICATED"
              : status === 405
                ? "METHOD_NOT_ALLOWED"
                : status === 503
                  ? "CONVERSATION_UNAVAILABLE"
                  : "PRODUCT_UNAVAILABLE",
        ...(uncertain ? { outcome: "UNKNOWN" } : {}),
      },
    },
    { status, headers },
  );

/** Discovery and conversation cursors have their own fixed native-auth routes. */
export function conversationHistoryRoute(
  path: string,
): HistoryRoute | undefined {
  return (Object.keys(protocol.routes) as HistoryRoute[]).find(
    (key) => protocol.routes[key].path === `/api/conversations/${path}`,
  );
}

function validRequest(
  request: Request,
  operation: Pick<CurrentReadOperation<unknown>, "path" | "requestBytes">,
  config: ConversationProxyConfig,
) {
  const url = new URL(request.url);
  const declared = request.headers.get("content-length");
  return (
    url.pathname === operation.path &&
    !url.search &&
    !url.hash &&
    sameRequestOrigin(request, config.requestOrigin) &&
    request.headers.get("sec-fetch-site") !== "cross-site" &&
    ![
      "authorization",
      "content-encoding",
      "last-event-id",
      "x-meri-resume-sequence",
    ].some((key) => request.headers.has(key)) &&
    /^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
      request.headers.get("content-type") ?? "",
    ) &&
    (declared === null ||
      (/^(0|[1-9]\d*)$/.test(declared) &&
        Number.isSafeInteger(Number(declared)) &&
        Number(declared) <= operation.requestBytes))
  );
}

function configuredOrigin(config: ConversationProxyConfig) {
  if (!config.enabled || !config.baseUrl) return undefined;
  try {
    const url = new URL(config.baseUrl);
    if (url.protocol === "https:" && url.origin === config.baseUrl)
      return url.origin;
  } catch {
    /* Missing or invalid configuration is unavailable. */
  }
  return undefined;
}

/** Same-origin UI adapter only; trusted membership/retention/write admission stay with Meri. */
export async function proxyConversationHistory(
  request: Request,
  route: HistoryRoute,
  config: ConversationProxyConfig,
  getNativeToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  return proxyConversationNativeRead(
    request,
    {
      path: protocol.routes[route].path,
      requestBytes: protocol.limits.requestBytes,
      responseBytes: protocol.limits.responseBytes,
      async admit(bytes) {
        const admitted = await receiveConversationHistoryRequest(route, bytes);
        return (status, body) =>
          receiveConversationHistoryResponse(route, status, body, admitted);
      },
    },
    config,
    getNativeToken,
    fetcher,
    route === "nextTurn" || route === "manage",
  );
}

/** Native conversation operations reuse one HTTP/authentication owner and their public receivers. */
export async function proxyConversationNativeRead(
  request: Request,
  operation: CurrentReadOperation<unknown>,
  config: ConversationProxyConfig,
  getNativeToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
  mutation = false,
) {
  if (request.method !== "POST") return unavailable(405);
  if (!validRequest(request, operation, config)) return unavailable(400);
  const origin = configuredOrigin(config);
  const frontendOrigin = trustedConversationFrontendOrigin(
    request,
    config.frontendOrigin,
    config.requestOrigin,
  );
  if (!origin || !frontendOrigin) return unavailable(503);
  let dispatched = false;
  try {
    return await withActionDeadline([request.signal], async (signal) => {
      const token = await getNativeToken();
      signal.throwIfAborted();
      if (!token) return unavailable(401);
      let bytes: Uint8Array<ArrayBuffer>;
      let receive: Awaited<ReturnType<CurrentReadOperation<unknown>["admit"]>>;
      try {
        bytes = await boundedJsonBytes(
          new Response(request.body, { headers: request.headers }),
          signal,
          operation.requestBytes,
        );
        receive = await operation.admit(bytes);
      } catch {
        signal.throwIfAborted();
        return unavailable(400);
      }
      signal.throwIfAborted();
      dispatched = true;
      const response = await fetcher(`${origin}${operation.path}`, {
        method: "POST",
        body: bytes,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Origin: frontendOrigin,
        },
        credentials: "omit",
        redirect: "error",
        cache: "no-store",
        signal,
      });
      if (response.redirected || response.headers.has("content-encoding")) {
        void response.body?.cancel().catch(() => undefined);
        throw new Error("Unexpected native history response");
      }
      const body = await boundedJsonBytes(
        response,
        signal,
        operation.responseBytes,
      );
      await receive(response.status, body);
      signal.throwIfAborted();
      return new Response(body, {
        status: response.status,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    });
  } catch {
    return unavailable(502, dispatched && mutation);
  }
}
