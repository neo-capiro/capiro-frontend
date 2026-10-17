type Environment = Record<string, string | undefined>;

/** Source binding is deployment intent, not proof of a running service's identity. */
export const previewBackendSource = "6542f5b089656b6d255465edd464d06c2a0b408f";
const ordinaryServices = [
  "CORE_API_BASE_URL",
  "STRATEGY_API_BASE_URL",
  "WORKSPACE_API_BASE_URL",
  "INTELLIGENCE_API_BASE_URL",
  "ONBOARD_API_BASE_URL",
  "MERI_API_BASE_URL",
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

/** Validate a separately configured preview API without an ordinary service fallback. */
export function previewApiTarget(
  env: Environment,
  request: Request,
  raw: string | undefined,
): URL | null {
  try {
    if (!raw || raw.trim() !== raw) return null;
    const target = new URL(raw);
    if (
      target.protocol !== "https:" ||
      target.pathname !== "/api" ||
      target.username ||
      target.password ||
      target.search ||
      target.hash ||
      ordinaryHosts.has(host(target)) ||
      sameOrigin(target, new URL(request.url))
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

/** No ordinary Core fallback. Native service qualification remains a release gate. */
export function previewReadTarget(
  env: Environment,
  request: Request,
): URL | null {
  if (
    env.CAPIRO_PREVIEW_READ_ONLY !== "true" ||
    env.CAPIRO_PREVIEW_READ_BACKEND_SOURCE !== previewBackendSource
  )
    return null;
  return previewApiTarget(env, request, env.CAPIRO_PREVIEW_READ_API_BASE_URL);
}
