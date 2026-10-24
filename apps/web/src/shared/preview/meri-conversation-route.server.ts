import { readRequestOrigin } from "../request-origin";
import { portfolioPreviewFrontendOrigin } from "../meri-conversations/frontend-origin";

type Environment = Record<string, string | undefined>;

/** The app's pinned @capiro/meri-contracts distribution. */
export const previewMeriContractsPackageVersion = "0.1.12";
const sourceCommit = /^[0-9a-f]{40}$/;
const imageDigest = /^sha256:[0-9a-f]{64}$/;
const meriHost =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const ordinaryHosts = new Set([
  "capiro.ai",
  "app.capiro.ai",
  "os.capiro.ai",
  "api.capiro.ai",
  "portfolio-preview.app.capiro.ai",
]);
const otherServices = [
  "CORE_API_BASE_URL",
  "STRATEGY_API_BASE_URL",
  "WORKSPACE_API_BASE_URL",
  "INTELLIGENCE_API_BASE_URL",
  "ONBOARD_API_BASE_URL",
  "CAPIRO_PREVIEW_READ_API_BASE_URL",
  "CAPIRO_PREVIEW_FIRST_CHAT_API_BASE_URL",
  "CAPIRO_PREVIEW_MEMORY_CORE_API_BASE_URL",
];
const postPaths = new Set([
  "/api/action-followthrough/session",
  "/api/conversations/submit",
  "/api/conversations/history",
  "/api/conversations/cancel",
  "/api/conversations/events",
  "/api/conversations/list",
  "/api/conversations/transcript",
  "/api/conversations/next-turn",
  "/api/conversations/input/allocate",
  "/api/conversations/input/admit",
]);
const reconnectPath =
  /^\/api\/conversations\/events\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\/stream$/;

/** Deployment coordinates are explicit inputs; they do not attest the running service. */
function configuredRuntimeBinding(env: Environment): boolean {
  const source = env.CAPIRO_PREVIEW_MERI_RUNTIME_SOURCE ?? "";
  const image = env.CAPIRO_PREVIEW_MERI_RUNTIME_IMAGE_DIGEST ?? "";
  return (
    sourceCommit.test(source) &&
    !/^0+$/.test(source) &&
    imageDigest.test(image) &&
    !/^sha256:0+$/.test(image) &&
    env.CAPIRO_PREVIEW_MERI_CONTRACT_PACKAGE_VERSION ===
      previewMeriContractsPackageVersion
  );
}

/** Preview Meri admission requires a distinct, explicitly configured HTTPS runtime. */
function configuredMeriOrigin(env: Environment, request: Request): boolean {
  const raw = env.MERI_API_BASE_URL;
  const requestUrl = new URL(request.url);
  // Preview admission needs a fixed browser-visible origin. A missing value must
  // never fall back to Next's internal bind address or client-supplied headers.
  const publicOrigin = readRequestOrigin(env.CAPIRO_REQUEST_ORIGIN, []);
  if (
    !raw ||
    raw.length > 512 ||
    raw.trim() !== raw ||
    !publicOrigin ||
    publicOrigin !== portfolioPreviewFrontendOrigin ||
    env.CAPIRO_EXISTING_APP_URL !== publicOrigin ||
    env.CAPIRO_PREVIEW_MERI_RUNTIME_ORIGIN !== raw
  )
    return false;
  try {
    const target = new URL(raw);
    if (
      target.protocol !== "https:" ||
      target.origin !== raw ||
      target.pathname !== "/" ||
      target.port ||
      !meriHost.test(target.hostname) ||
      ordinaryHosts.has(target.hostname) ||
      target.origin === requestUrl.origin ||
      target.origin === publicOrigin
    )
      return false;
    for (const key of otherServices) {
      const service = env[key];
      if (service && new URL(service).origin === target.origin) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** The preview exception is limited to the existing public conversation route family. */
export function previewMeriConversationRoute(
  env: Environment,
  request: Request,
): boolean {
  if (
    env.CAPIRO_PREVIEW_READ_ONLY !== "true" ||
    env.CAPIRO_PREVIEW_MERI_CONVERSATION_ROUTES_ENABLED !== "true" ||
    env.MERI_CONVERSATION_WORKFLOW_ENABLED !== "true" ||
    !configuredRuntimeBinding(env)
  )
    return false;
  try {
    const url = new URL(request.url);
    if (url.search || url.hash || !configuredMeriOrigin(env, request))
      return false;
    return (
      (request.method === "POST" && postPaths.has(url.pathname)) ||
      (request.method === "GET" && reconnectPath.test(url.pathname))
    );
  } catch {
    return false;
  }
}
