import { readMeriConnectionConfig } from "../meri-actions/connection-config";

/** Server deployment opt-in; the canonical runtime still owns actual activation. */
export function readOfficeConfig(env: Record<string, string | undefined>) {
  const connection = readMeriConnectionConfig(env);
  return {
    enabled:
      connection.conversationEnabled &&
      env.MERI_OFFICE_WORKFLOW_ENABLED === "true",
    baseUrl: connection.baseUrl,
    requestOrigin: connection.requestOrigin,
  };
}
