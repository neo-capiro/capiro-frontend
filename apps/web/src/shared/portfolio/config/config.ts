import { readRequestOrigin } from "../../request-origin";

export const serviceKeys = [
  "core",
  "strategy",
  "workspace",
  "intelligence",
  "meri",
] as const;
export type Service = (typeof serviceKeys)[number];
export type TrackerBackend = "core" | "intelligence";
export type Destinations = {
  meri?: string;
  modules?: string;
  workspace?: string;
  existingApp?: string;
  /**
   * A separate application that serves `/program-elements` and
   * `/intelligence/opportunities`. Set only when `existingApp` is genuinely a
   * different destination; when it points at this app's own root those routes
   * do not exist here and linking to them produces a 404.
   */
  externalApp?: string;
};
export type RuntimeConfig = {
  services: Partial<Record<Service, string>>;
  destinations: Destinations;
  authConfigured: boolean;
  publishableKey?: string;
  trackerBackend?: TrackerBackend;
  recordedActivityVersion?: 1;
  trackerMetricsVersion?: 1;
  issues: string[];
  requestOrigin?: string | null;
};
const variables: Record<Service, string> = {
  core: "CORE_API_BASE_URL",
  strategy: "STRATEGY_API_BASE_URL",
  workspace: "WORKSPACE_API_BASE_URL",
  intelligence: "INTELLIGENCE_API_BASE_URL",
  meri: "MERI_API_BASE_URL",
};

function validatedUrl(
  value: string | undefined,
  key: string,
  issues: string[],
): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== "https:" && !(local && url.protocol === "http:"))
    )
      throw new Error();
    return url.href.replace(/\/+$/, "");
  } catch {
    issues.push(
      `${key} must be an HTTPS URL (HTTP is allowed only on loopback), without credentials, query or fragment.`,
    );
  }
}

// Pure validation: importing this module never reads secrets or opens a connection.
export function readConfig(
  env: Record<string, string | undefined>,
): RuntimeConfig {
  const issues: string[] = [];
  const requestOrigin = readRequestOrigin(env.CAPIRO_REQUEST_ORIGIN, issues);
  const trackerBackend = env.TRACKER_BACKEND?.trim() || undefined;
  if (
    trackerBackend &&
    trackerBackend !== "core" &&
    trackerBackend !== "intelligence"
  )
    issues.push("TRACKER_BACKEND must be core or intelligence.");
  const services: RuntimeConfig["services"] = {};
  for (const key of serviceKeys) {
    const value = validatedUrl(env[variables[key]], variables[key], issues);
    if (value) services[key] = value;
  }
  const destinations: Destinations = {};
  for (const key of ["meri", "modules", "workspace"] as const) {
    const value = validatedUrl(
      env[`CAPIRO_${key.toUpperCase()}_URL`],
      `CAPIRO_${key.toUpperCase()}_URL`,
      issues,
    );
    if (value) destinations[key] = value;
  }
  const publicKey = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const existingApp = validatedUrl(
    env.CAPIRO_EXISTING_APP_URL,
    "CAPIRO_EXISTING_APP_URL",
    issues,
  );
  destinations.existingApp = existingApp;
  const sameAppRoot = (() => {
    if (!existingApp || !requestOrigin) return false;
    try {
      const app = new URL(existingApp);
      const here = new URL(requestOrigin);
      return (
        app.origin === here.origin &&
        (app.pathname === "" || app.pathname === "/")
      );
    } catch {
      return false;
    }
  })();
  if (existingApp && !sameAppRoot) destinations.externalApp = existingApp;
  const secret = env.CLERK_SECRET_KEY;
  const authConfigured = Boolean(
    publicKey?.match(/^pk_(test|live)_[A-Za-z0-9+/=]+$/) &&
    secret?.match(/^sk_(test|live)_\S+$/),
  );
  if (!authConfigured)
    issues.push("Configure the designated Clerk application keys.");
  else if (publicKey?.split("_")[1] !== secret?.split("_")[1])
    issues.push("Clerk public and secret keys must use the same environment.");
  if (!services.core)
    issues.push("CORE_API_BASE_URL is required for Portfolio.");
  return {
    services,
    trackerMetricsVersion:
      env.CAPIRO_TRACKER_METRICS_VERSION === "1" ? 1 : undefined,
    recordedActivityVersion:
      env.CAPIRO_RECORDED_ACTIVITY_VERSION === "1" ? 1 : undefined,
    trackerBackend:
      trackerBackend === "core" || trackerBackend === "intelligence"
        ? trackerBackend
        : undefined,
    destinations,
    publishableKey: authConfigured ? publicKey : undefined,
    authConfigured:
      authConfigured && !issues.some((i) => i.startsWith("Clerk public")),
    issues,
    requestOrigin,
  };
}
