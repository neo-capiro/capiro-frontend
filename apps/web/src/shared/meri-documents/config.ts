import { readMeriConnectionConfig } from "../meri-actions/connection-config";

/** A trusted deployment binds this application to exactly one document family. */
export function readDocumentConfig(env: Record<string, string | undefined>) {
  const config = readMeriConnectionConfig(env);
  return {
    enabled: config.documentEnabled,
    baseUrl: config.baseUrl,
    operation: config.documentOperation,
  };
}
