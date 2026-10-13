import { readConfig } from "../portfolio/config/config";

/** Deployment choices only; neither a credential nor browser-selected authority. */
export function readMeriConnectionConfig(
  env: Record<string, string | undefined>,
) {
  const config = readConfig(env);
  const available =
    config.authConfigured &&
    config.issues.length === 0 &&
    Boolean(config.services.meri);
  const operation: "create_word" | "create_excel" | null =
    env.MERI_DOCUMENT_OPERATION === "create_word" ||
    env.MERI_DOCUMENT_OPERATION === "create_excel"
      ? env.MERI_DOCUMENT_OPERATION
      : null;
  return {
    baseUrl: config.services.meri,
    actionEnabled: available && env.MERI_ACTION_WORKFLOW_ENABLED === "true",
    documentEnabled:
      available &&
      env.MERI_DOCUMENT_WORKFLOW_ENABLED === "true" &&
      operation !== null,
    documentOperation: operation,
  };
}

export function readOpaqueSessionConfig(
  env: Record<string, string | undefined>,
) {
  const config = readMeriConnectionConfig(env);
  return {
    enabled: config.actionEnabled || config.documentEnabled,
    baseUrl: config.baseUrl,
  };
}
