import { readMeriConnectionConfig } from "./connection-config";

/** Deployment opt-in remains closed until the native composition is qualified. */
export function readActionConfig(env: Record<string, string | undefined>) {
  const config = readMeriConnectionConfig(env);
  return {
    enabled: config.actionEnabled,
    baseUrl: config.baseUrl,
    requestOrigin: config.requestOrigin,
  };
}
