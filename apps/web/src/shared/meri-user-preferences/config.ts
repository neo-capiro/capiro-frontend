import { readConfig } from "../portfolio/config/config";

/** Serving prerequisite only; current membership is always checked by Meri. */
export function readUserPreferencesConfig(
  env: Record<string, string | undefined>,
) {
  const config = readConfig(env);
  const baseUrl = config.services.meri;
  return {
    baseUrl,
    /** Configured browser-visible origin; undefined compares against the request URL. */
    requestOrigin: config.requestOrigin,
    enabled:
      env.MERI_USER_PREFERENCES_ENABLED === "true" &&
      config.authConfigured &&
      config.issues.length === 0 &&
      Boolean(baseUrl) &&
      new URL(baseUrl!).pathname === "/",
  };
}
