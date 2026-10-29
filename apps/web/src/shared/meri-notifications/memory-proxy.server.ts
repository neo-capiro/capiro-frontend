import {
  boundedJsonText,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { readConfig } from "../portfolio/config/config";
import {
  MEMORY_NOTIFICATION_PAGE_LIMIT,
  MEMORY_NOTIFICATION_RESPONSE_BYTES,
  MEMORY_NOTIFICATION_SCHEMA,
  memoryNotificationPaths,
  receiveCoreMemoryNotificationPage,
} from "./memory-contract";

type Environment = Record<string, string | undefined>;
type Token = () => Promise<string | null>;

const headers = {
  "Cache-Control": "private, no-store",
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
};
const cursorPattern = /^[A-Za-z0-9_=.+/-]{1,4096}$/;

const answer = (status: number, code: string) =>
  Response.json({ error: { code } }, { status, headers });

/**
 * The reviewed Core connection used by the existing memory-review owner reads.
 * This read adds no new activation flag and no browser-supplied authority.
 */
export function targetForMemoryNotifications(env: Environment): URL | null {
  if (env.MERI_MEMORY_OWNER_REVIEW_ENABLED !== "true") return null;
  // The read-only preview listener has not admitted this route packet; stay held.
  if (env.CAPIRO_PREVIEW_READ_ONLY === "true") return null;
  if (
    env.CAPIRO_PREVIEW_READ_ONLY !== undefined &&
    env.CAPIRO_PREVIEW_READ_ONLY !== "false"
  )
    return null;
  const config = readConfig(env);
  if (!config.authConfigured || config.issues.length || !config.services.core)
    return null;
  const target = new URL(config.services.core);
  return target.pathname === "/api" ? target : null;
}

/**
 * Exact admission of the one closed browser read: method, path, query and headers.
 * A browser-supplied Authorization header is refused before any token or dispatch.
 */
function admittedQuery(request: Request, url: URL): string | null | false {
  if (url.pathname !== memoryNotificationPaths.list || url.hash) return false;
  for (const key of url.searchParams.keys())
    if (key !== "limit" && key !== "cursor") return false;
  if (
    url.searchParams.getAll("limit").length !== 1 ||
    url.searchParams.get("limit") !== String(MEMORY_NOTIFICATION_PAGE_LIMIT) ||
    url.searchParams.getAll("cursor").length > 1
  )
    return false;
  const raw = url.searchParams.get("cursor");
  if (raw === null) return null;
  if (!raw || !cursorPattern.test(raw)) return false;
  return raw;
}

/** Closed GET adapter over Core's existing participant-scoped notification read. */
export async function proxyMemoryNotifications(
  request: Request,
  env: Environment,
  getToken: Token,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== "GET")
    return answer(405, "MERI_NOTIFICATIONS_METHOD_NOT_ALLOWED");
  const cursor = admittedQuery(request, url);
  if (cursor === false)
    return answer(400, "MERI_NOTIFICATIONS_INVALID_REQUEST");
  if (
    request.headers.has("authorization") ||
    request.headers.has("content-encoding") ||
    request.headers.has("x-internal-service-secret") ||
    request.body !== null
  )
    return answer(400, "MERI_NOTIFICATIONS_INVALID_REQUEST");
  const target = targetForMemoryNotifications(env);
  if (!target) return answer(503, "MERI_NOTIFICATIONS_UNAVAILABLE");

  try {
    return await withActionDeadline(
      [request.signal],
      async (signal) => {
        const token = await getToken();
        signal.throwIfAborted();
        if (!token) return answer(401, "MERI_NOTIFICATIONS_SIGN_IN_REQUIRED");
        try {
          const query = new URLSearchParams({
            limit: String(MEMORY_NOTIFICATION_PAGE_LIMIT),
          });
          if (cursor) query.set("cursor", cursor);
          const response = await fetcher(
            `${target.origin}${target.pathname}/memory/review/notifications?${query.toString()}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
              credentials: "omit",
              redirect: "error",
              cache: "no-store",
              signal,
            },
          );
          try {
            if (response.redirected)
              throw new Error("Redirected memory response");
            if (!response.ok) {
              const status = [400, 401, 403, 404].includes(response.status)
                ? response.status
                : 503;
              return answer(status, "MERI_NOTIFICATIONS_CORE_REFUSED");
            }
            const raw = await boundedJsonText(
              response,
              signal,
              MEMORY_NOTIFICATION_RESPONSE_BYTES,
            );
            const page = receiveCoreMemoryNotificationPage(JSON.parse(raw));
            return Response.json(page, { headers });
          } finally {
            if (!response.bodyUsed)
              void response.body?.cancel().catch(() => undefined);
          }
        } catch {
          // Core transport failure, changed upstream shape or malformed page: never empty.
          return answer(503, "MERI_NOTIFICATIONS_UNAVAILABLE");
        }
      },
      12_000,
    );
  } catch {
    return answer(503, "MERI_NOTIFICATIONS_UNAVAILABLE");
  }
}

export const memoryNotificationSchema = MEMORY_NOTIFICATION_SCHEMA;
