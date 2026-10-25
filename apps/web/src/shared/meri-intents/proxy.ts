import {
  intentsMetadata,
  receiveIntentsRequest,
} from "@capiro/meri-client/intents";
import {
  boundedJsonText,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { receivedActionSession } from "../meri-actions/session-header";
import { sameRequestOrigin } from "../request-origin";
import type { readIntentsConfig } from "./config";

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
/** Frontend-only refusals; none of them is a Meri answer and none says an effect happened. */
export const frontendIntentsRefusal = "FRONTEND_INTENTS_UNAVAILABLE";
const unavailable = (status: number) =>
  Response.json(
    { error: { code: frontendIntentsRefusal } },
    { status, headers },
  );

/**
 * Fixed same-origin forwarding of the two conversation intent routes. Meri verifies native
 * membership and approval authority; this adapter only validates the request
 * against the versioned public contract and bounds the exchange. A 502 after a decide was
 * forwarded makes no claim about the decision: the caller reconciles by repeating the request.
 */
export async function proxyIntentsRequest(
  request: Request,
  operation: string,
  config: ReturnType<typeof readIntentsConfig>,
  getNativeToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  if (operation !== "list" && operation !== "decide") return unavailable(404);
  if (request.method !== "POST") return unavailable(405);
  const url = new URL(request.url);
  if (
    url.pathname !== intentsMetadata.routes[operation].path ||
    url.search ||
    url.hash ||
    !sameRequestOrigin(request, config.requestOrigin) ||
    request.headers.has("authorization") ||
    request.headers.has("content-encoding")
  )
    return unavailable(400);
  if (!config.enabled || !config.baseUrl) return unavailable(503);
  let forwarded = false;
  try {
    return await withActionDeadline([request.signal], async (signal) => {
      const nativeToken = await getNativeToken();
      signal.throwIfAborted();
      if (!nativeToken) return unavailable(401);
      // Keep the browser's session prerequisite; upstream membership uses the native token.
      const session = receivedActionSession(request);
      if (!session) return unavailable(401);
      let body: string;
      try {
        body = await boundedJsonText(
          new Response(request.body, { headers: request.headers }),
          signal,
          intentsMetadata.limits.requestBytes,
        );
        await receiveIntentsRequest(operation, body);
      } catch {
        signal.throwIfAborted();
        return unavailable(400);
      }
      signal.throwIfAborted();
      forwarded = true;
      const response = await fetcher(
        `${config.baseUrl}${intentsMetadata.routes[operation].path}`,
        {
          method: "POST",
          body,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${nativeToken}`,
          },
          credentials: "omit",
          redirect: "error",
          cache: "no-store",
          signal,
        },
      );
      const text = await boundedJsonText(
        response,
        signal,
        intentsMetadata.limits.responseBytes,
      );
      signal.throwIfAborted();
      if (response.redirected) return unavailable(502);
      return new Response(text, { status: response.status, headers });
    });
  } catch {
    // 503 means nothing was forwarded. 502 means the request may have reached Meri: no outcome is invented.
    return unavailable(forwarded ? 502 : 503);
  }
}
