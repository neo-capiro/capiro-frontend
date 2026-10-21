import { readMeriConnectionConfig } from "../meri-actions/connection-config";

/**
 * Deployment opt-in only. The conversation workflow must already be on, and a separate switch keeps
 * the approval list/decide routes dark until the deployment owner enables them. A browser selection
 * never grants approval authority; Meri resolves the opaque session and current authority.
 */
export function readIntentsConfig(env: Record<string, string | undefined>) {
  const config = readMeriConnectionConfig(env);
  return {
    enabled:
      config.conversationEnabled &&
      env.MERI_INTENT_APPROVALS_WORKFLOW_ENABLED === "true",
    baseUrl: config.baseUrl,
    requestOrigin: config.requestOrigin,
  };
}
