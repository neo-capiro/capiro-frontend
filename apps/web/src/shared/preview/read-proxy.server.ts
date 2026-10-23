import { abortable } from "../capiro/gateway-input";
import {
  boundedJsonText,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { previewHeldResponse } from "./backend-policy.server";
import { previewReadTarget } from "./read-config.server";
import {
  previewReadRoute,
  previewServicePrefixes,
  type PreviewReadRoute,
} from "./read-route.server";

const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
function failure(status: number): Response {
  return Response.json(
    { message: "The preview read is unavailable." },
    { status, headers },
  );
}

async function receive(
  response: Response,
  route: PreviewReadRoute,
  signal: AbortSignal,
) {
  if (!response.ok || response.redirected) {
    void response.body?.cancel().catch(() => undefined);
    return failure(
      [401, 403, 404, 429].includes(response.status) ? response.status : 502,
    );
  }
  const payload: unknown = JSON.parse(
    await boundedJsonText(response, signal, 8_000_000),
  );
  signal.throwIfAborted();
  const parsed = route.operation?.response.safeParse(payload);
  if (parsed && !parsed.success) return failure(502);
  // Portfolio's canonical receivers retain their existing projection validation.
  return Response.json(parsed?.data ?? payload, {
    status: response.status,
    headers,
  });
}

/** An explicit preview branch: it can never dispatch through ordinary service configuration. */
export async function proxyPreviewRead(
  request: Request,
  env: Record<string, string | undefined>,
  expectedBrowserPath: string,
  getToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const target = previewReadTarget(env, request);
  const route = previewReadRoute(request);
  if (!target || !route || route.browserPath !== expectedBrowserPath)
    return previewHeldResponse();
  const url = new URL(
    target.origin + previewServicePrefixes[route.service] + route.path,
  );
  try {
    return await withActionDeadline([request.signal], async (signal) => {
      const token = await abortable(getToken(), signal);
      signal.throwIfAborted();
      if (!token) return failure(401);
      const response = await abortable(
        fetcher(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "X-Capiro-Tenant": "capiro-internal",
          },
          credentials: "omit",
          redirect: "error",
          cache: "no-store",
          signal,
        }).then((value) => {
          if (signal.aborted) void value.body?.cancel().catch(() => undefined);
          return value;
        }),
        signal,
      );
      signal.throwIfAborted();
      return receive(response, route, signal);
    });
  } catch {
    return failure(request.signal.aborted ? 408 : 502);
  }
}
