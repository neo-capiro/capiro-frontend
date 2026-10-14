import { serviceNames, type CapiroService } from "./contracts";
import { readRequestOrigin } from "../request-origin";

export type CapiroConfig = {
  services: Partial<Record<CapiroService, string>>;
  authConfigured: boolean;
  publishableKey?: string;
  issues: string[];
  requestOrigin?: string | null;
};

const serviceVariables: Record<CapiroService, string> = {
  core: "CORE_API_BASE_URL",
  strategy: "STRATEGY_API_BASE_URL",
  workspace: "WORKSPACE_API_BASE_URL",
  intelligence: "INTELLIGENCE_API_BASE_URL",
  onboard: "ONBOARD_API_BASE_URL",
};

function readServiceUrl(
  value: string | undefined,
  key: string,
  issues: string[],
) {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== "https:" && !(loopback && url.protocol === "http:"))
    )
      throw new Error();
    return url.href.replace(/\/+$/, "");
  } catch {
    issues.push(
      `${key} requires an HTTPS URL without credentials, query or fragment. HTTP is supported on loopback only.`,
    );
    return undefined;
  }
}

/** Pure validation; callers supply server environment values deliberately. */
export function readCapiroConfig(
  env: Record<string, string | undefined>,
): CapiroConfig {
  const issues: string[] = [];
  const requestOrigin = readRequestOrigin(env.CAPIRO_REQUEST_ORIGIN, issues);
  const services: CapiroConfig["services"] = {};
  for (const service of serviceNames) {
    const value = readServiceUrl(
      env[serviceVariables[service]],
      serviceVariables[service],
      issues,
    );
    if (value) services[service] = value;
  }
  const publishableKey = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = env.CLERK_SECRET_KEY;
  let authConfigured = Boolean(
    publishableKey?.match(/^pk_(test|live)_[A-Za-z0-9+/=]+$/) &&
    secretKey?.match(/^sk_(test|live)_\S+$/),
  );
  if (!authConfigured)
    issues.push("Configure the designated Clerk application keys.");
  else if (publishableKey?.split("_")[1] !== secretKey?.split("_")[1]) {
    issues.push("Clerk public and secret keys must use the same environment.");
    authConfigured = false;
  }
  return {
    services,
    authConfigured,
    publishableKey: authConfigured ? publishableKey : undefined,
    issues,
    requestOrigin,
  };
}

export type CapiroPublicConfig = {
  publishableKey?: string;
  configured: boolean;
};
export function publicCapiroConfig(config: CapiroConfig): CapiroPublicConfig {
  return {
    publishableKey: config.publishableKey,
    configured: config.authConfigured && Boolean(config.services.core),
  };
}
