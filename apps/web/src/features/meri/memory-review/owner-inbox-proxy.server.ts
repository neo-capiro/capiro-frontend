import {
  boundedJsonText,
  withActionDeadline,
} from "../../../shared/meri-actions/bounded-json";
import {
  ownerReviewPaths,
  receiveOwnerCandidatePage,
  receiveOwnerCandidateStatus,
} from "./owner-review";
import { targetForOwnerMemoryReview } from "./owner-review-proxy.server";

type Environment = Record<string, string | undefined>;
type Operation = { kind: "page" } | { kind: "status"; id: string };
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const headers = {
  "Cache-Control": "private, no-store",
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
};

function answer(status: number, code: string): Response {
  return Response.json({ error: { code } }, { status, headers });
}

function targetPath(request: Request, operation: Operation): string | null {
  const url = new URL(request.url);
  if (url.hash || request.method !== "GET") return null;
  if (operation.kind === "status") {
    if (
      !uuid.test(operation.id) ||
      url.pathname !== ownerReviewPaths.status(operation.id) ||
      url.search
    )
      return null;
    return `/memory/candidates/mine/${operation.id}/status`;
  }
  if (url.pathname !== ownerReviewPaths.list) return null;
  const params = url.searchParams;
  if (
    [...params.keys()].some((key) => key !== "limit" && key !== "cursor") ||
    params.getAll("limit").length > 1 ||
    params.getAll("cursor").length > 1
  )
    return null;
  const rawLimit = params.get("limit") ?? "50";
  const limit = Number(rawLimit);
  const cursor = params.get("cursor");
  if (
    !/^[1-9]\d{0,2}$/.test(rawLimit) ||
    limit > 100 ||
    (cursor !== null &&
      (!cursor ||
        cursor.length > 4_096 ||
        /[\u0000-\u001f\u007f]/.test(cursor)))
  )
    return null;
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor !== null) query.set("cursor", cursor);
  return `/memory/candidates/mine?${query.toString()}`;
}

/** Core alone owns candidate selection and status; this boundary only validates transport. */
export async function proxyOwnerMemoryInbox(
  request: Request,
  operation: Operation,
  env: Environment,
  getToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const path = targetPath(request, operation);
  if (!path) return answer(400, "MEMORY_REVIEW_INVALID_REQUEST");
  const target = targetForOwnerMemoryReview(request, env);
  if (!target) return answer(503, "MEMORY_REVIEW_UNAVAILABLE");
  try {
    return await withActionDeadline(
      [request.signal],
      async (signal) => {
        const token = await getToken();
        signal.throwIfAborted();
        if (!token) return answer(401, "MEMORY_REVIEW_SIGN_IN_REQUIRED");
        const response = await fetcher(
          `${target.origin}${target.pathname}${path}`,
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
            return answer(status, "MEMORY_REVIEW_CORE_REFUSED");
          }
          const raw = await boundedJsonText(response, signal, 2_000_000);
          const value: unknown = JSON.parse(raw);
          return Response.json(
            operation.kind === "page"
              ? receiveOwnerCandidatePage(value)
              : receiveOwnerCandidateStatus(value, operation.id),
            { headers },
          );
        } finally {
          if (!response.bodyUsed)
            void response.body?.cancel().catch(() => undefined);
        }
      },
      12_000,
    );
  } catch {
    return answer(503, "MEMORY_REVIEW_UNAVAILABLE");
  }
}
