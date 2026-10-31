import type { RuntimeConfig, Service } from "../config/config";
import { sameRequestOrigin } from "../../request-origin";
import { portfolioCommandRefusal } from "./portfolio-command-refusals";
import { incomingMailFilesReadRefusal } from "./incoming-mail-files-refusal";
import { coreSessionAuthentication } from "../../preview/core-session-authentication";
const permittedRoots: Record<Service, readonly string[]> = {
  core: [
    "clients",
    "client-account-owners",
    "engagement",
    "me",
    "tenant-members",
    "legiwatch",
    "federal-register",
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
const jsonError = (status: number, message: string) =>
  Response.json(
    { message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
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
  // This URL also exists on legacy Core. Reject before credentials or upstream
  // reads until Release qualifies the versioned, actor-scoped producer.
  // Static segments match the backend's case-insensitive router; IDs stay exact.
  if (
    selected === "core" &&
    request.method === "GET" &&
    path.length === 4 &&
    path[0] === "intelligence" &&
    path[1]?.toLowerCase() === "clients" &&
    path[3]?.toLowerCase() === "health-score" &&
    config.recordedActivityVersion !== 1
  )
    return jsonError(503, "Recorded activity is unavailable.");
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
    return jsonError(401, "Your session could not be verified. Sign in again.");
  }
  if (!token) return jsonError(401, "Sign in to continue.");
  const url = new URL(`${base}/${path.map(encodeURIComponent).join("/")}`);
  url.search = new URL(request.url).search;
  try {
    const body = request.method === "GET" ? undefined : await request.text();
    if (body && new TextEncoder().encode(body).length > 2_000_000)
      return jsonError(413, "Request is too large.");
    const response = await fetcher(url, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]),
    });
    // Forward no cookies, redirects, server diagnostics or provider headers.
    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
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
      return jsonError(response.status, message);
    }
    return new Response(response.status === 204 ? null : response.body, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return jsonError(502, "The service could not be reached. Please retry.");
  }
}
