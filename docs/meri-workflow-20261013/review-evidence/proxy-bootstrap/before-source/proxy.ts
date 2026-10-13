import { boundedJsonText, withActionDeadline } from "./bounded-json";
import { actionSessionHints } from "./session-bootstrap";
import type { readActionConfig } from "./config";

const routes = new Set(["session", "query", "draft", "prepare", "execute"]);
const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const unavailable = (status: number) =>
  Response.json(
    { error: { code: "FRONTEND_ACTION_UNAVAILABLE" } },
    { status, headers },
  );

/** A fixed same-origin adapter. The Meri host still owns every authority check. */
export async function proxyActionRequest(
  request: Request,
  route: string,
  config: ReturnType<typeof readActionConfig>,
  getNativeToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  if (!routes.has(route)) return unavailable(404);
  if (request.method !== "POST") return unavailable(405);
  const url = new URL(request.url);
  if (
    url.search ||
    request.headers.get("origin") !== url.origin ||
    request.headers.has("content-encoding")
  )
    return unavailable(400);
  if (!config.enabled || !config.baseUrl) return unavailable(503);
  try {
    return await withActionDeadline([request.signal], async (signal) => {
      const nativeToken = await getNativeToken();
      signal.throwIfAborted();
      if (!nativeToken) return unavailable(401);
      const bearer =
        route === "session"
          ? `Bearer ${nativeToken}`
          : request.headers.get("authorization");
      if (
        !bearer ||
        (route !== "session" &&
          !/^Bearer action_session_[A-Za-z0-9_-]{43}$/.test(bearer))
      )
        return unavailable(401);
      const body = await boundedJsonText(
        new Response(request.body, { headers: request.headers }),
        signal,
        route === "session" ? 4096 : 16 * 1024 * 1024,
      );
      if (route === "session") actionSessionHints.parse(JSON.parse(body));
      signal.throwIfAborted();
      const response = await fetcher(
        `${config.baseUrl}/api/action-followthrough/${route}`,
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
      const text = await boundedJsonText(
        response,
        signal,
        route === "session" ? 4096 : 16 * 1024 * 1024,
      );
      signal.throwIfAborted();
      return new Response(text, { status: response.status, headers });
    });
  } catch {
    // No dispatch disposition is invented: a request may already have reached Meri.
    return unavailable(502);
  }
}
