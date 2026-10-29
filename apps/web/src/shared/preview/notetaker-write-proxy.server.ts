import { boundedJsonText, withActionDeadline } from "../meri-actions/bounded-json";
import { previewReadTarget } from "./read-config.server";
import { previewNotetakerWriteRoute } from "./notetaker-write.server";

const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

function failure(status: number, message = "The preview write is unavailable."): Response {
  return Response.json({ message }, { status, headers });
}

const REQUEST_LIMIT_BYTES = 1_000_000;
const RESPONSE_LIMIT_BYTES = 2_000_000;

async function readBody(request: Request, signal: AbortSignal): Promise<string | undefined> {
  if (request.method === "GET" || request.body === null) return undefined;
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > REQUEST_LIMIT_BYTES))
    throw new Error("Request exceeds the sending limit");
  return boundedJsonText(
    new Response(request.body, {
      headers: { "content-type": request.headers.get("content-type") ?? "application/json" },
    }),
    signal,
    REQUEST_LIMIT_BYTES,
  );
}

/**
 * Preview branch for the note-taker writes admitted by notetaker-write.server.ts.
 *
 * Uses the same preview backend the read proxy is bound to, forwards the signed-in
 * user's OWN Clerk token (Core authorizes the actor, tenant and role), and never
 * sends a tenant/actor override header. Body and response sizes are bounded, and no
 * request is retried: a write with an unknown outcome must be reconciled by the UI.
 */
export async function proxyPreviewNotetakerWrite(
  request: Request,
  env: Record<string, string | undefined>,
  getToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const route = previewNotetakerWriteRoute(request);
  const target = previewReadTarget(env, request);
  if (!route || !target) return failure(503);
  try {
    return await withActionDeadline([request.signal], async (signal) => {
      const body = await readBody(request, signal);
      const token = await getToken();
      signal.throwIfAborted();
      if (!token) return failure(401, "Your session expired. Sign in again.");
      const response = await fetcher(target.origin + target.pathname + route.path, {
        method: request.method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body,
        credentials: "omit",
        redirect: "error",
        cache: "no-store",
        signal,
      });
      if (response.status === 204)
        return new Response(null, { status: 204, headers });
      const text = await boundedJsonText(response, signal, RESPONSE_LIMIT_BYTES).catch(
        () => null,
      );
      signal.throwIfAborted();
      if (text === null)
        return failure(
          response.status >= 400 ? response.status : 502,
          "The backend response was unreadable.",
        );
      return new Response(text, {
        status: response.status,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    });
  } catch {
    return failure(request.signal.aborted ? 408 : 502);
  }
}
