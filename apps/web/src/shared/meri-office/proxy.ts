import {
  OFFICE_SCHEMA,
  OFFICE_ROUTES,
  OFFICE_ERROR_STATUSES,
  receiveOfficeRequest,
  receiveOfficeResponse,
  type OfficeRoute,
  type OfficeErrorCode,
  type OfficeFailure,
} from "@capiro/meri-contracts/office-application";
import {
  boundedJsonBytes,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { receivedActionSession } from "../meri-actions/session-header";
import { sameRequestOrigin } from "../request-origin";
import type { readOfficeConfig } from "./config";

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
const refused = (
  code: OfficeErrorCode,
  outcome: OfficeFailure["error"]["outcome"] = "NOT_DISPATCHED",
) =>
  Response.json(
    { schema: OFFICE_SCHEMA, error: { code, outcome } },
    { status: OFFICE_ERROR_STATUSES[code], headers },
  );

/** Fixed same-origin forwarding. Native identity is read on each call; Meri's
 * existing opaque session and Core own all current tenant/client permissions. */
export async function proxyOfficeRequest(
  request: Request,
  operation: string,
  config: ReturnType<typeof readOfficeConfig>,
  getNativeToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  let dispatched = false;
  const writing = !["read", "inspect"].includes(operation);
  try {
    if (!OFFICE_ROUTES.includes(operation as OfficeRoute))
      return refused("NOT_FOUND");
    if (request.method !== "POST") return refused("METHOD_NOT_ALLOWED");
    const url = new URL(request.url);
    if (
      url.pathname !== `/api/meri/office/${operation}` ||
      url.search ||
      url.hash ||
      !sameRequestOrigin(request, config.requestOrigin) ||
      request.headers.has("authorization") ||
      request.headers.has("content-encoding")
    )
      return refused("INVALID_REQUEST");
    if (!config.enabled || !config.baseUrl) return refused("UNAVAILABLE");
    const route = operation as OfficeRoute;
    return await withActionDeadline([request.signal], async (signal) => {
      const nativeToken = await getNativeToken();
      signal.throwIfAborted();
      const session = receivedActionSession(request);
      if (!nativeToken || !session) return refused("UNAUTHENTICATED");
      const body = await boundedJsonBytes(
        new Response(request.body, { headers: request.headers }),
        signal,
        8192,
      );
      let selected;
      try {
        selected = receiveOfficeRequest(route, body);
      } catch {
        return refused("INVALID_REQUEST");
      }
      signal.throwIfAborted();
      dispatched = true;
      const response = await fetcher(
        `${config.baseUrl}/api/meri/office/${route}`,
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
        if (response.redirected) throw new Error("Office redirect refused");
        const bytes = await boundedJsonBytes(response, signal, 2 * 1024 * 1024);
        await receiveOfficeResponse(route, response.status, bytes, selected);
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
