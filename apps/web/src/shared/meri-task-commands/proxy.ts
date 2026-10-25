import {
  receiveTaskCommandRequest,
  taskCommandMetadata,
} from "@capiro/meri-contracts/task-command-application";
import {
  boundedJsonText,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { receivedActionSession } from "../meri-actions/session-header";
import { sameRequestOrigin } from "../request-origin";
import type { readTaskCommandConfig } from "./config";

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const unavailable = (status: number) =>
  Response.json(
    { error: { code: "FRONTEND_TASK_COMMAND_UNAVAILABLE" } },
    { status, headers },
  );

/** Fixed forwarding. Meri resolves the opaque session and current authority. */
export async function proxyTaskCommandRequest(
  request: Request,
  operation: string,
  config: ReturnType<typeof readTaskCommandConfig>,
  getNativeToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  if (operation !== "prepare" && operation !== "execute")
    return unavailable(404);
  if (request.method !== "POST") return unavailable(405);
  const url = new URL(request.url);
  if (
    url.pathname !== taskCommandMetadata.routes[operation].path ||
    url.search ||
    !sameRequestOrigin(request, config.requestOrigin) ||
    request.headers.has("authorization") ||
    request.headers.has("content-encoding")
  )
    return unavailable(400);
  if (!config.enabled || !config.baseUrl) return unavailable(503);
  try {
    return await withActionDeadline([request.signal], async (signal) => {
      const nativeToken = await getNativeToken();
      signal.throwIfAborted();
      if (!nativeToken) return unavailable(401);
      // The opaque session arrives in its own header; Meri reads it as the bearer.
      const session = receivedActionSession(request);
      if (!session) return unavailable(401);
      const body = await boundedJsonText(
        new Response(request.body, { headers: request.headers }),
        signal,
        taskCommandMetadata.limits.requestBytes,
      );
      await receiveTaskCommandRequest(operation, body);
      signal.throwIfAborted();
      const response = await fetcher(
        `${config.baseUrl}${taskCommandMetadata.routes[operation].path}`,
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
      const text = await boundedJsonText(
        response,
        signal,
        taskCommandMetadata.limits.responseBytes,
      );
      signal.throwIfAborted();
      if (response.redirected) return unavailable(502);
      return new Response(text, { status: response.status, headers });
    });
  } catch {
    // A write may have reached Meri; this response invents no dispatch outcome.
    return unavailable(502);
  }
}
