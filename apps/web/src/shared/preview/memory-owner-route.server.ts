import { portfolioPreviewFrontendOrigin } from "../meri-conversations/frontend-origin";
import { readRequestOrigin } from "../request-origin";
import { previewApiTarget } from "./read-config.server";

type Environment = Record<string, string | undefined>;

// Core's memory branch is source-reviewed, but its preview listener has not
// admitted the owner route packet. Bind the compatible successor here only
// after that listener and target have been qualified together.
export const previewMemoryCoreBackendSource: string | null = null;

const uuid = "[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}";
const status = new RegExp(`^/api/memory/owner/candidates/${uuid}/status$`);
const decision = new RegExp(
  `^/api/memory/owner/candidates/${uuid}/(?:decision|version-decision)$`,
);
const correction = new RegExp(`^/api/memory/owner/items/${uuid}/corrections$`);
const ownerItemUuid =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const ownerRead = new RegExp(
  `^/api/memory/owner/items/${ownerItemUuid}/(versions|evidence)$`,
);

function ownerReadPage(query: URLSearchParams, kind: string): boolean {
  if (
    [...query.keys()].some((key) => key !== "limit" && key !== "cursor") ||
    query.getAll("limit").length > 1 ||
    query.getAll("cursor").length > 1
  )
    return false;
  const limit = query.get("limit");
  if (limit !== null && !/^(?:[1-9]|[1-9][0-9]|100)$/.test(limit)) return false;
  const cursor = query.get("cursor");
  return (
    cursor === null ||
    (kind === "versions" &&
      cursor.length <= 512 &&
      /^[A-Za-z0-9_-]+$/.test(cursor))
  );
}

function candidatePage(query: URLSearchParams): boolean {
  if ([...query.keys()].some((key) => key !== "limit" && key !== "cursor"))
    return false;
  if (query.getAll("limit").length > 1 || query.getAll("cursor").length > 1)
    return false;
  const limit = query.get("limit");
  if (limit !== null && (!/^[1-9]\d{0,2}$/.test(limit) || Number(limit) > 100))
    return false;
  const cursor = query.get("cursor");
  return (
    cursor === null ||
    (cursor.length > 0 &&
      cursor.length <= 4_096 &&
      !/[\u0000-\u001f\u007f]/.test(cursor))
  );
}

function itemPage(query: URLSearchParams): boolean {
  if ([...query.keys()].some((key) => key !== "limit" && key !== "cursor"))
    return false;
  if (
    query.getAll("limit").length !== 1 ||
    query.get("limit") !== "25" ||
    query.getAll("cursor").length > 1
  )
    return false;
  const cursor = query.get("cursor");
  return (
    cursor === null ||
    (cursor.length > 0 &&
      cursor.length <= 512 &&
      /^[A-Za-z0-9_-]+$/.test(cursor))
  );
}

/** Browser routes and methods admitted by the exact Core owner-review packet. */
export function previewMemoryOwnerRoute(request: Request): boolean {
  const url = new URL(request.url);
  if (url.hash) return false;
  if (request.method === "GET") {
    const read = ownerRead.exec(url.pathname);
    if (read) return ownerReadPage(url.searchParams, read[1]!);
    if (url.pathname === "/api/memory/owner/candidates")
      return candidatePage(url.searchParams);
    if (url.pathname === "/api/memory/owner/items")
      return itemPage(url.searchParams);
    return !url.search && status.test(url.pathname);
  }
  return (
    request.method === "POST" &&
    !url.search &&
    (decision.test(url.pathname) || correction.test(url.pathname))
  );
}

/** Source and target are deployment assertions, never browser authority. */
export function previewMemoryOwnerTarget(
  env: Environment,
  request: Request,
): URL | null {
  if (
    env.CAPIRO_PREVIEW_READ_ONLY !== "true" ||
    env.MERI_MEMORY_OWNER_REVIEW_ENABLED !== "true" ||
    env.CAPIRO_PREVIEW_MEMORY_OWNER_ROUTES_ENABLED !== "true" ||
    !previewMemoryCoreBackendSource ||
    env.CAPIRO_PREVIEW_MEMORY_CORE_BACKEND_SOURCE !==
      previewMemoryCoreBackendSource ||
    !previewMemoryOwnerRoute(request)
  )
    return null;
  const publicOrigin = readRequestOrigin(env.CAPIRO_REQUEST_ORIGIN, []);
  if (
    publicOrigin !== portfolioPreviewFrontendOrigin ||
    env.CAPIRO_EXISTING_APP_URL !== publicOrigin
  )
    return null;
  return previewApiTarget(
    env,
    request,
    env.CAPIRO_PREVIEW_MEMORY_CORE_API_BASE_URL,
  );
}
