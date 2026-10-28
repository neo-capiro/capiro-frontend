import { readMeriConnectionConfig } from "../meri-actions/connection-config";

/**
 * Deployment choice only, and no new key: attachments travel with the conversation family, because
 * the canonical conversation input is what carries their ids and the composer's attachment control
 * only exists on that surface. Enabling the conversation workflow already authorizes this family,
 * and the remote application still owns current authority for every call the proxy forwards.
 */
export function readUploadConfig(env: Record<string, string | undefined>) {
  const config = readMeriConnectionConfig(env);
  return {
    enabled: config.conversationEnabled,
    baseUrl: config.baseUrl,
    /** The browser-visible origin (CAPIRO_REQUEST_ORIGIN); undefined means the request URL. */
    requestOrigin: config.requestOrigin,
  };
}
