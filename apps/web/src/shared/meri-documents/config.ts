import { readMeriConnectionConfig } from "../meri-actions/connection-config";

/** A trusted deployment binds this application to exactly one document family. */
export function readDocumentConfig(env: Record<string, string | undefined>) {
  const config = readMeriConnectionConfig(env);
  return {
    enabled: config.documentEnabled,
    baseUrl: config.baseUrl,
    requestOrigin: config.requestOrigin,
    operation: config.documentOperation,
    /**
     * Version-bound reads (inspect, download, signed links) of artifacts in the session's own
     * conversation. Either opt-in serves them; writes still require the document family.
     */
    readEnabled: config.documentEnabled || config.conversationEnabled,
  };
}
