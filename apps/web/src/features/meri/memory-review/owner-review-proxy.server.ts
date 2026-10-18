import {
  boundedJsonText,
  withActionDeadline,
} from "../../../shared/meri-actions/bounded-json";
import { readConfig } from "../../../shared/portfolio/config/config";
import { previewApiTarget } from "../../../shared/preview/read-config.server";
import { sameRequestOrigin } from "../../../shared/request-origin";
import { ownerReviewPaths, receiveOwnerCandidates } from "./owner-review";

type Environment = Record<string, string | undefined>;
type Token = () => Promise<string | null>;
type Operation =
  | { kind: "list" }
  | { kind: "decision" | "version-decision"; id: string };
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const headers = {
  "Cache-Control": "private, no-store",
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
};
const answer = (status: number, code: string, outcome?: string) =>
  Response.json(
    { error: { code, ...(outcome ? { outcome } : {}) } },
    { status, headers },
  );

/**
 * Source connection is opt-in. Shared preview policy still holds these routes;
 * its owner must bind a reviewed Core source pin and qualified target before
 * admitting them. This URL validation alone is not preview qualification.
 */
function targetFor(request: Request, env: Environment): URL | null {
  if (env.MERI_MEMORY_OWNER_REVIEW_ENABLED !== "true") return null;
  if (env.CAPIRO_PREVIEW_READ_ONLY === "true")
    return previewApiTarget(
      env,
      request,
      env.CAPIRO_PREVIEW_MEMORY_CORE_API_BASE_URL,
    );
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

function expectedPath(operation: Operation): string {
  if (operation.kind === "list") return ownerReviewPaths.list;
  return operation.kind === "decision"
    ? ownerReviewPaths.decision(operation.id)
    : ownerReviewPaths.versionDecision(operation.id);
}

function corePath(
  operation: Operation,
  decision?: "approve" | "reject",
): string {
  if (operation.kind === "list") return "/memory/candidates/mine";
  return operation.kind === "decision"
    ? `/memory/candidates/${operation.id}/owner-decision`
    : `/memory/version-candidates/${operation.id}/${decision}`;
}

/** One closed Core route pair; the browser never supplies tenant, owner or token. */
export async function proxyOwnerMemoryReview(
  request: Request,
  operation: Operation,
  env: Environment,
  getToken: Token,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const url = new URL(request.url);
  if (
    url.pathname !== expectedPath(operation) ||
    url.search ||
    url.hash ||
    (operation.kind !== "list" && !uuid.test(operation.id))
  )
    return answer(400, "MEMORY_REVIEW_INVALID_REQUEST");
  if (request.method !== (operation.kind === "list" ? "GET" : "POST"))
    return answer(405, "MEMORY_REVIEW_METHOD_NOT_ALLOWED");
  if (
    operation.kind !== "list" &&
    (!sameRequestOrigin(request, readConfig(env).requestOrigin) ||
      request.headers.has("content-encoding"))
  )
    return answer(403, "MEMORY_REVIEW_ORIGIN_REFUSED");

  let body: string | undefined;
  let decision: "approve" | "reject" | undefined;
  if (operation.kind !== "list") {
    try {
      const raw = await boundedJsonText(
        new Response(request.body, { headers: request.headers }),
        request.signal,
        operation.kind === "version-decision" ? 1_200 : 64,
      );
      const parsed: unknown = JSON.parse(raw);
      if (
        !parsed ||
        typeof parsed !== "object" ||
        Object.keys(parsed).length !==
          (operation.kind === "version-decision" &&
          "decision" in parsed &&
          parsed.decision === "reject"
            ? 2
            : 1) ||
        !("decision" in parsed) ||
        (parsed.decision !== "approve" && parsed.decision !== "reject")
      )
        throw new Error("Invalid decision");
      decision = parsed.decision;
      if (operation.kind === "version-decision") {
        if (decision === "reject") {
          if (
            !("reason" in parsed) ||
            typeof parsed.reason !== "string" ||
            !parsed.reason.trim() ||
            parsed.reason.trim().length > 1_000
          )
            throw new Error("Invalid rejection reason");
          body = JSON.stringify({ reason: parsed.reason.trim() });
        }
      } else {
        body = JSON.stringify({ decision });
      }
    } catch {
      return answer(400, "MEMORY_REVIEW_INVALID_DECISION");
    }
  }
  const target = targetFor(request, env);
  if (!target)
    return answer(503, "MEMORY_REVIEW_UNAVAILABLE", "NOT_DISPATCHED");

  let dispatched = false;
  try {
    return await withActionDeadline(
      [request.signal],
      async (signal) => {
        const token = await getToken();
        signal.throwIfAborted();
        if (!token) return answer(401, "MEMORY_REVIEW_SIGN_IN_REQUIRED");
        dispatched = true;
        const response = await fetcher(
          `${target.origin}${target.pathname}${corePath(operation, decision)}`,
          {
            method: request.method,
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              ...(body ? { "Content-Type": "application/json" } : {}),
            },
            body,
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
            if (operation.kind !== "list" && response.status >= 500)
              return answer(503, "MEMORY_DECISION_UNCERTAIN", "UNKNOWN");
            const status = [400, 401, 403, 404, 409].includes(response.status)
              ? response.status
              : 503;
            return answer(status, "MEMORY_REVIEW_CORE_REFUSED");
          }
          const raw = await boundedJsonText(response, signal, 2_000_000);
          const value: unknown = JSON.parse(raw);
          if (operation.kind === "list")
            return Response.json(
              { candidates: receiveOwnerCandidates(value) },
              { headers },
            );
          if (operation.kind === "version-decision") {
            if (
              !value ||
              typeof value !== "object" ||
              !("ok" in value) ||
              value.ok !== true ||
              !("candidateId" in value) ||
              value.candidateId !== operation.id ||
              !("outcome" in value) ||
              (decision === "reject"
                ? value.outcome !== "rejected"
                : !["activated", "duplicate", "conflict"].includes(
                    String(value.outcome),
                  ))
            )
              throw new Error("Invalid version decision result");
            return Response.json({ status: value.outcome }, { headers });
          }
          if (
            !value ||
            typeof value !== "object" ||
            !("status" in value) ||
            (value.status !== "approved" && value.status !== "rejected")
          )
            throw new Error("Invalid decision result");
          return Response.json({ status: value.status }, { headers });
        } finally {
          if (!response.bodyUsed)
            void response.body?.cancel().catch(() => undefined);
        }
      },
      12_000,
    );
  } catch {
    return operation.kind !== "list" && dispatched
      ? answer(503, "MEMORY_DECISION_UNCERTAIN", "UNKNOWN")
      : answer(503, "MEMORY_REVIEW_UNAVAILABLE", "NOT_DISPATCHED");
  }
}
