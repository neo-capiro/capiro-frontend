import {
  parseSaveSiteWorkflow,
  type SiteWorkflowReceipt,
} from "@capiro/shared/site-workflows";
import type { CapiroApi } from "../../../shared/capiro/http";
import type { capiroOperations } from "../../../shared/capiro/registry";
import { settingsRequestHash } from "../security-write-journal";
import type { SettingsWrite } from "../security-write-types";
function originalInput(receipt: SiteWorkflowReceipt) {
  return {
    body: parseSaveSiteWorkflow({
      requestId: receipt.requestId,
      expectedVersion: receipt.configuration.manifest.version - 1,
      manifest: receipt.configuration.manifest,
      enabled: receipt.configuration.enabled,
    }),
  };
}
export function workflowReceiptMatches(
  write: SettingsWrite,
  raw: unknown,
): boolean {
  try {
    const receipt = raw as SiteWorkflowReceipt;
    return (
      JSON.stringify(originalInput(receipt)) ===
      JSON.stringify({ body: parseSaveSiteWorkflow(write.input.body) })
    );
  } catch {
    return false;
  }
}
export async function reconcileSiteWorkflow(
  api: CapiroApi<typeof capiroOperations>,
  write: SettingsWrite,
  signal: AbortSignal,
) {
  if (
    !write.expectedAccount ||
    !write.requestHash ||
    typeof write.input.body?.requestId !== "string"
  )
    return false;
  const account = await api.request("me.read", {}, { signal });
  if (
    account.user.id !== write.expectedAccount.userId ||
    account.tenant.id !== write.expectedAccount.tenantId
  )
    return false;
  const result = await api.request(
    "settings.siteWorkflows.receipt",
    { body: { requestId: write.input.body.requestId } },
    { signal },
  );
  return (
    result.requestId === write.input.body.requestId &&
    !!result.receipt &&
    result.receipt.requestId === write.input.body.requestId &&
    (await settingsRequestHash(originalInput(result.receipt))) ===
      write.requestHash
  );
}
