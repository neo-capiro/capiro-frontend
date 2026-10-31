import {
  boundedJsonText,
  withActionDeadline,
} from "../../../shared/meri-actions/bounded-json";
import { targetForOwnerMemoryReview } from "./owner-review-proxy.server";
import {
  ownerHistoryPath,
  receiveOwnerHistory,
  type OwnerMemoryRef,
  type OwnerReadKind,
} from "./owner-history";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
export async function proxyOwnerHistory(
  request: Request,
  ref: OwnerMemoryRef,
  kind: OwnerReadKind,
  env: Record<string, string | undefined>,
  token: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  const answer = (status: number) =>
    Response.json(
      {
        error:
          status === 409 ? "HISTORY_CHANGED" : "MEMORY_HISTORY_UNAVAILABLE",
      },
      { status, headers },
    );
  let path: string;
  try {
    path = ownerHistoryPath(ref, kind);
  } catch {
    return answer(400);
  }
  const url = new URL(request.url);
  if (request.method !== "GET") return answer(405);
  if (
    url.pathname !== path ||
    url.hash ||
    [...url.searchParams.keys()].some(
      (key) => !["limit", "cursor"].includes(key),
    ) ||
    url.searchParams.getAll("limit").length > 1 ||
    url.searchParams.getAll("cursor").length > 1
  )
    return answer(400);
  const limit = url.searchParams.get("limit") ?? "25",
    cursor = url.searchParams.get("cursor");
  if (
    !/^(?:[1-9]|[1-9][0-9]|100)$/.test(limit) ||
    (kind === "evidence" && cursor !== null) ||
    (cursor !== null &&
      (cursor.length > 512 || !/^[A-Za-z0-9_-]+$/.test(cursor)))
  )
    return answer(400);
  const target = targetForOwnerMemoryReview(request, env);
  if (!target) return answer(503);
  try {
    return await withActionDeadline(
      [request.signal],
      async (signal) => {
        const credential = await token();
        signal.throwIfAborted();
        if (!credential) return answer(401);
        const query = new URLSearchParams({ limit });
        if (cursor) query.set("cursor", cursor);
        const response = await fetcher(
          `${target.origin}${target.pathname}${path.slice(4)}?${query}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${credential}`,
              Accept: "application/json",
            },
            cache: "no-store",
            credentials: "omit",
            redirect: "error",
            signal,
          },
        );
        try {
          if (response.redirected) return answer(503);
          if (!response.ok)
            return answer(
              [400, 401, 403, 404, 409].includes(response.status)
                ? response.status
                : 503,
            );
          const raw = await boundedJsonText(response, signal, 1024 * 1024);
          const page = receiveOwnerHistory(JSON.parse(raw), ref, kind);
          return Response.json(
            kind === "evidence"
              ? {
                  schemaVersion: 1,
                  anchor: page.anchor,
                  availability: page.availability,
                  entries: page.sources ?? [],
                  nextCursor: null,
                  ...(page.availability === "unsupported"
                    ? { reason: "source_reader_unbound" }
                    : page.availability === "unavailable"
                      ? { reason: "source_unavailable" }
                      : {}),
                }
              : page,
            { headers },
          );
        } finally {
          if (!response.bodyUsed)
            void response.body?.cancel().catch(() => undefined);
        }
      },
      12000,
    );
  } catch {
    return answer(503);
  }
}
