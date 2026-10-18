import { readMeriConnectionConfig } from "../meri-actions/connection-config";

/** Deployment opt-in only. A browser selection never grants task authority. */
export function readTaskCommandConfig(env: Record<string, string | undefined>) {
  const config = readMeriConnectionConfig(env);
  return {
    enabled: config.taskCommandEnabled,
    baseUrl: config.baseUrl,
    requestOrigin: config.requestOrigin,
  };
}
