import type { RuntimeConfig, Service } from "../config/config";
import { sameRequestOrigin } from "../../request-origin";
import { portfolioCommandRefusal } from "./portfolio-command-refusals";
import { incomingMailFilesReadRefusal } from "./incoming-mail-files-refusal";
import { coreSessionAuthentication } from "../../preview/core-session-authentication";
import { abortable, readBoundedJson } from "../../capiro/gateway-input";
import {
  authFailureHeaders,
  type AuthFailureClass,
} from "../../session/auth-failure";
const permittedRoots: Record<Service, readonly string[]> = {
  core: [
    "clients",
    "client-account-owners",
    "engagement",
    "me",
    "tenant-members",
    "legiwatch",
    "federal-register",
    "government-forecasts",
    "funding-opportunities",
    "business-development",
    "intelligence",
    "directory",
    "explorer",
    "firm",
    "billing",
  ],
  strategy: ["planner", "strategies"],
  workspace: ["drafts", "documents", "artifacts", "templates"],
  intelligence: ["clients", "legiwatch", "opportunities", "tracker"],
  meri: [],
};
const jsonError = (
  status: number,
  message: string,
  failure?: AuthFailureClass,
) =>
  Response.json(
    { message },
    {
      status,
      headers: failure
        ? authFailureHeaders(failure, { "Cache-Control": "no-store" })
        : { "Cache-Control": "no-store" },
    },
  );

function isIdentityPreview(service: Service, method: string, path: string[]) {
  if (service !== "core" || method !== "POST") return false;
  const route = path.map((segment) => segment.toLowerCase());
  return (
    (route.length === 3 &&
      route[0] === "clients" &&
      route[1] === "profile-build" &&
      route[2] === "identity-preview") ||
    (route.length === 5 &&
      route[0] === "clients" &&
      route[2] === "profile-build" &&
      route[3] === "identity" &&
      route[4] === "preview") ||
    (route.length === 6 &&
      route[0] === "business-development" &&
      route[1] === "prospects" &&
      route[3] === "profile-build" &&
      route[4] === "identity" &&
      route[5] === "preview")
  );
}
export async function proxyRequest(
  request: Request,
  service: string,
  path: string[],
  config: RuntimeConfig,
  getToken: (authentication?: "clerk-session") => Promise<string | null>,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  if (!Object.hasOwn(permittedRoots, service))
    return jsonError(404, "Unknown service.");
  const selected = service as Service;
  // Stored connection metadata only; connection actions and tool discovery
  // are not part of this proxy's surface.
  const managedAppsRead =
    selected === "core" &&
    request.method === "GET" &&
    path.length === 3 &&
    path[0] === "clio" &&
    path[1] === "v3" &&
    path[2] === "apps";
  // OpenStates uses an opaque ocd-person/<UUID> as one route parameter. Accept
  // that exact identity shape only at the verified state-legislator detail path.
  const statePersonId =
    selected === "core" &&
    path.length === 3 &&
    path[0] === "explorer" &&
    path[1] === "state-legislators" &&
    /^ocd-person\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      path[2] ?? "",
    );
  if (
    !path.length ||
    (!permittedRoots[selected].includes(path[0] ?? "") && !managedAppsRead) ||
    path.some(
      (segment, index) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        /[\\%?#\x00-\x1f]/.test(segment) ||
        (segment.includes("/") && !(index === 2 && statePersonId)),
    )
  ) {
    return jsonError(400, "Invalid service path.");
  }
  if (selected === "core" && path[0] === "government-forecasts") {
    if (path.length !== 1 && !(path.length === 3 && path[2] === "history"))
      return jsonError(400, "Invalid forecast read path.");
    if (request.method !== "GET")
      return jsonError(405, "Forecast source access is read-only.");
  }
  // The recorded index was retired from the client profile. Keep its legacy
  // endpoint outside this proxy's surface, before credentials or upstream reads.
  // Static segments match the backend's case-insensitive router; IDs stay exact.
  if (
    selected === "core" &&
    request.method === "GET" &&
    path.length === 4 &&
    path[0] === "intelligence" &&
    path[1]?.toLowerCase() === "clients" &&
    path[3]?.toLowerCase() === "health-score"
  )
    return jsonError(404, "This profile metric is no longer available.");
  // Match backend-equivalent static spellings without changing roots or IDs.
  const trackerMetricRead =
    request.method === "GET" &&
    ((selected === "core" &&
      path.length === 5 &&
      path[0] === "intelligence" &&
      path[1]?.toLowerCase() === "clients" &&
      path[3]?.toLowerCase() === "tracker" &&
      path[4]?.toLowerCase() === "material-changes") ||
      (selected === "intelligence" &&
        path.length === 4 &&
        path[0] === "clients" &&
        path[2]?.toLowerCase() === "tracker" &&
        path[3]?.toLowerCase() === "material-changes"));
  const trackerCoverageRead =
    selected === "core" &&
    request.method === "GET" &&
    path.length === 5 &&
    path[0] === "legiwatch" &&
    path[1]?.toLowerCase() === "live-hearings" &&
    path[2]?.toLowerCase() === "clients" &&
    path[4]?.toLowerCase() === "coverage";
  if (trackerMetricRead || trackerCoverageRead) {
    if (config.trackerMetricsVersion !== 1 || !config.trackerBackend)
      return jsonError(503, "Bill Tracker metrics are unavailable.");
    const query = new URL(request.url).searchParams;
    if (
      trackerMetricRead &&
      (selected !== config.trackerBackend || query.size !== 0)
    )
      return jsonError(400, "Invalid Tracker metric owner or query.");
    if (
      trackerCoverageRead &&
      (query.size !== 1 ||
        query.get("trackerBackend") !== config.trackerBackend)
    )
      return jsonError(400, "Invalid Tracker coverage owner or query.");
  }
  if (selected === "workspace" && path[0] === "templates") {
    // Portfolio reads the existing tenant-visible library and a single preview.
    // Template authoring and other catalog operations remain in Workspace.
    if (path.length !== 2)
      return jsonError(400, "Invalid template catalog path.");
    if (request.method !== "GET")
      return jsonError(405, "Template catalog access is read-only.");
  }
  if (selected === "core" && path[0] === "firm") {
    const methods: Readonly<Record<string, readonly string[]>> = {
      "lda-registrants": ["GET"],
      registrant: ["GET", "PUT"],
      "import-candidates": ["GET"],
      import: ["POST"],
    };
    const allowed = path.length === 2 ? methods[path[1] ?? ""] : undefined;
    if (!allowed) return jsonError(400, "Invalid firm intake path.");
    if (!allowed.includes(request.method))
      return jsonError(405, "Method not allowed for firm intake.");
  }
  if (selected === "core" && path[0] === "billing") {
    // Core owns these two read contracts. Payment mutations belong to
    // Onboard and require a separately reviewed service configuration.
    if (path.length !== 2 || !["state", "summary"].includes(path[1] ?? ""))
      return jsonError(400, "Invalid billing read path.");
    if (request.method !== "GET")
      return jsonError(405, "Billing access is read-only.");
  }
  const base = config.services[selected];
  if (!base || !config.authConfigured || config.issues.length)
    return jsonError(503, "Portfolio service configuration is incomplete.");
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(request.method))
    return jsonError(405, "Method not allowed.");
  if (
    request.method !== "GET" &&
    !sameRequestOrigin(request, config.requestOrigin)
  )
    return jsonError(403, "Request origin is not allowed.");
  if (request.signal.aborted)
    return jsonError(408, "The request was cancelled.");
  let token: string | null;
  try {
    token = await getToken(
      coreSessionAuthentication(
        selected,
        base,
        request.method,
        `/${path.map(encodeURIComponent).join("/")}`,
      ),
    );
  } catch {
    return jsonError(
      401,
      "Your session could not be verified. Sign in again.",
      "credential-unverified",
    );
  }
  if (request.signal.aborted)
    return jsonError(408, "The request was cancelled.");
  if (!token) return jsonError(401, "Sign in to continue.", "no-session");
  const url = new URL(`${base}/${path.map(encodeURIComponent).join("/")}`);
  url.search = new URL(request.url).search;
  const identityPreview = isIdentityPreview(selected, request.method, path);
  const signal = AbortSignal.any([
    request.signal,
    // Core bounds the whole identity preview at 240s. Leave 10s for delivery;
    // all other Portfolio operations retain their existing 30s deadline.
    AbortSignal.timeout(identityPreview ? 250_000 : 30_000),
  ]);
  try {
    const body =
      request.method === "GET"
        ? undefined
        : await abortable(request.text(), signal);
    signal.throwIfAborted();
    if (body && new TextEncoder().encode(body).length > 2_000_000)
      return jsonError(413, "Request is too large.");
    const response = await abortable(
      fetcher(url, {
        method: request.method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body,
        redirect: "error",
        cache: "no-store",
        signal,
      }).then((response) => {
        if (signal.aborted) void response.body?.cancel().catch(() => undefined);
        return response;
      }),
      signal,
    );
    signal.throwIfAborted();
    // Forward no cookies, redirects, server diagnostics or provider headers.
    if (!response.ok) {
      const payload: unknown = await (
        identityPreview
          ? abortable(readBoundedJson(response.body, 8_000_000, signal), signal)
          : response.json()
      ).catch(() => null);
      signal.throwIfAborted();
      const refusal = portfolioCommandRefusal(
        selected,
        request.method,
        path,
        body,
        response.status,
        payload,
      );
      if (refusal)
        return Response.json(refusal, {
          status: response.status,
          headers: { "Cache-Control": "no-store" },
        });
      let message =
        incomingMailFilesReadRefusal(
          selected,
          request.method,
          path,
          response.status,
          payload,
        ) ??
        (response.status === 404
          ? "The requested action or record is unavailable from the current service."
          : identityPreview && response.status === 504
            ? "The service request timed out. Please retry."
            : response.status >= 500
              ? "The service is unavailable. Please retry."
              : "The operation was rejected.");
      if (
        response.status < 500 &&
        response.status !== 404 &&
        payload &&
        typeof payload === "object" &&
        "message" in payload
      ) {
        const detail = payload.message;
        if (typeof detail === "string") message = detail.slice(0, 1000);
        else if (
          Array.isArray(detail) &&
          detail.every((v) => typeof v === "string")
        )
          message = detail.join(" ").slice(0, 1000);
      }
      return jsonError(
        response.status,
        message,
        response.status === 401 ? "upstream-rejected" : undefined,
      );
    }
    let responseBody: BodyInit | null =
      response.status === 204 ? null : response.body;
    if (identityPreview && response.status !== 204) {
      try {
        responseBody = JSON.stringify(
          await abortable(
            readBoundedJson(response.body, 8_000_000, signal),
            signal,
          ),
        );
      } catch {
        signal.throwIfAborted();
        return jsonError(502, "The service returned an unexpected response.");
      }
      signal.throwIfAborted();
    }
    return new Response(responseBody, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    if (signal.aborted)
      return jsonError(
        request.signal.aborted ? 408 : 504,
        request.signal.aborted
          ? "The request was cancelled."
          : "The service request timed out. Please retry.",
      );
    return jsonError(502, "The service could not be reached. Please retry.");
  }
}
