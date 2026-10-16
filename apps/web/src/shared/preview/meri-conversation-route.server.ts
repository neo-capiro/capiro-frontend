type Environment = Record<string, string | undefined>;

/** Reviewed Meri PR #92 source; a later mounted runtime needs its own reviewed pin. */
export const previewMeriBackendSource =
  "5850e858f9776ec5faa2902a90a1e90ea3903346";
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

/** Preview Meri admission requires a distinct, explicitly configured HTTPS runtime. */
function configuredMeriOrigin(env: Environment, requestUrl: URL): boolean {
  const raw = env.MERI_API_BASE_URL;
  if (!raw || raw.length > 512 || raw.trim() !== raw) return false;
  try {
    const target = new URL(raw);
    if (
      target.protocol !== "https:" ||
      target.origin !== raw ||
      target.pathname !== "/" ||
      target.port ||
      !meriHost.test(target.hostname) ||
      ordinaryHosts.has(target.hostname) ||
      target.origin === requestUrl.origin
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
    env.CAPIRO_PREVIEW_MERI_BACKEND_SOURCE !== previewMeriBackendSource ||
    env.MERI_CONVERSATION_WORKFLOW_ENABLED !== "true"
  )
    return false;
  try {
    const url = new URL(request.url);
    if (url.search || url.hash || !configuredMeriOrigin(env, url)) return false;
    return (
      (request.method === "POST" && postPaths.has(url.pathname)) ||
      (request.method === "GET" && reconnectPath.test(url.pathname))
    );
  } catch {
    return false;
  }
}
