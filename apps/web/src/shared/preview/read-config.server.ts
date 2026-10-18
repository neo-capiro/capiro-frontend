type Environment = Record<string, string | undefined>;

/** Source binding is deployment intent, not proof of a running service's identity. */
export const previewBackendSource = "6542f5b089656b6d255465edd464d06c2a0b408f";
export const qualifiedCorePreviewBackendSource =
  "784b1c3a91eb6d78f16d92c42e71f05c12c5b5bb";
const firstChatPreviewApi = "https://first-chat-preview.app-dev.capiro.ai/api";
const dnsHost =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const ordinaryServices = [
  "CORE_API_BASE_URL",
  "STRATEGY_API_BASE_URL",
  "WORKSPACE_API_BASE_URL",
  "INTELLIGENCE_API_BASE_URL",
  "ONBOARD_API_BASE_URL",
  "MERI_API_BASE_URL",
  "CAPIRO_REQUEST_ORIGIN",
];
const ordinaryHosts = new Set([
  "capiro.ai",
  "app.capiro.ai",
  "os.capiro.ai",
  "api.capiro.ai",
  "portfolio-preview.app.capiro.ai",
]);
const host = (url: URL) => url.hostname.toLowerCase().replace(/\.$/, "");
const sameOrigin = (a: URL, b: URL) =>
  a.protocol === b.protocol && host(a) === host(b) && a.port === b.port;

function validatedPreviewApiTarget(
  env: Environment,
  raw: string | undefined,
  requestUrl?: string,
): URL | null {
  try {
    if (!raw || raw.trim() !== raw || raw.length > 512) return null;
    const target = new URL(raw);
    if (
      target.protocol !== "https:" ||
      raw !== `${target.origin}/api` ||
      !dnsHost.test(target.hostname) ||
      target.port ||
      target.username ||
      target.password ||
      target.search ||
      target.hash ||
      ordinaryHosts.has(host(target)) ||
      (requestUrl && sameOrigin(target, new URL(requestUrl)))
    )
      return null;
    for (const key of ordinaryServices) {
      const value = env[key];
      if (value?.trim() && sameOrigin(target, new URL(value.trim())))
        return null;
    }
    return target;
  } catch {
    return null;
  }
}

/** Validate a separately configured preview API without an ordinary service fallback. */
export function previewApiTarget(
  env: Environment,
  request: Request,
  raw: string | undefined,
): URL | null {
  return validatedPreviewApiTarget(env, raw, request.url);
}

function legacyReadTarget(env: Environment, requestUrl?: string): URL | null {
  if (
    env.CAPIRO_PREVIEW_READ_ONLY !== "true" ||
    env.CAPIRO_PREVIEW_READ_BACKEND_SOURCE !== previewBackendSource ||
    env.CAPIRO_PREVIEW_READ_API_BASE_URL !== firstChatPreviewApi
  )
    return null;
  return validatedPreviewApiTarget(env, firstChatPreviewApi, requestUrl);
}

function qualifiedClientRosterTarget(
  env: Environment,
  requestUrl?: string,
): URL | null {
  if (
    env.CAPIRO_PREVIEW_CLIENT_ROSTER_BACKEND_SOURCE !==
      qualifiedCorePreviewBackendSource ||
    env.CAPIRO_PREVIEW_CLIENT_ROSTER_API_BASE_URL === firstChatPreviewApi
  )
    return null;
  return validatedPreviewApiTarget(
    env,
    env.CAPIRO_PREVIEW_CLIENT_ROSTER_API_BASE_URL,
    requestUrl,
  );
}

/** UI mode marker only; request validation and Core authorization remain separate gates. */
export function isQualifiedCorePreviewReadEnabled(env: Environment): boolean {
  return Boolean(legacyReadTarget(env) && qualifiedClientRosterTarget(env));
}

/** Preserve Meri's Core reads; only the fixed roster operation uses qualified Core. */
export function previewReadTarget(
  env: Environment,
  request: Request,
): URL | null {
  const legacy = legacyReadTarget(env, request.url);
  if (!legacy) return null;
  return new URL(request.url).pathname === "/api/capiro/clients.list"
    ? qualifiedClientRosterTarget(env, request.url)
    : legacy;
}
