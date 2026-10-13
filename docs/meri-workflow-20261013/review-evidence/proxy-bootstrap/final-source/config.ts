import { readConfig } from "../portfolio/config/config";

/** Deployment opt-in remains closed until the native composition is qualified. */
export function readActionConfig(env: Record<string, string | undefined>) {
  const config = readConfig(env);
  return {
    enabled:
      env.MERI_ACTION_WORKFLOW_ENABLED === "true" &&
      config.authConfigured &&
      config.issues.length === 0 &&
      Boolean(config.services.meri),
    baseUrl: config.services.meri,
  };
}
