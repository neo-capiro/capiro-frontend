import type { CapiroApi } from "../../../shared/capiro/http";
import type { capiroOperations } from "../../../shared/capiro/registry";
import type { SettingsWrite } from "../security-writes";

export async function reconcileMemoryGovernance(
  api: CapiroApi<typeof capiroOperations>,
  write: SettingsWrite,
  signal: AbortSignal,
) {
  if (
    !write.expectedAccount ||
    typeof write.input.body?.expectedVersion !== "string"
  )
    return false;
  const account = await api.request("me.read", {}, { signal });
  if (
    account.user.id !== write.expectedAccount.userId ||
    account.tenant.id !== write.expectedAccount.tenantId
  )
    return false;
  const params = { id: String(write.input.params?.id) };
  if (write.operation.endsWith(".retry")) {
    const result = await api.request(
      "settings.memory.governance.job",
      { params },
      { signal },
    );
    return (
      !!result.enabled &&
      !!result.job &&
      result.job.id === params.id &&
      result.job.version !== write.input.body?.expectedVersion &&
      ["pending", "running", "completed"].includes(result.job.status)
    );
  }
  const result = await api.request(
    "settings.memory.governance.item",
    { params },
    { signal },
  );
  const item = result.item;
  if (
    !result.enabled ||
    !item ||
    item.id !== params.id ||
    item.version === write.input.body?.expectedVersion
  )
    return false;
  if (write.operation.endsWith(".secondApprove"))
    return item.secondApprovedByUserId === account.user.id;
  const expected: Record<string, string> = {
    approve: "active",
    confirm: "active",
    markStale: "stale",
    revoke: "revoked",
  };
  return (
    item.governedStatus === expected[write.operation.split(".").at(-1) ?? ""]
  );
}

/** A receipt binds the server outcome to the selected item or job. */
export function governanceReceiptMatches(
  write: SettingsWrite,
  receipt: Record<string, unknown>,
) {
  const action = write.operation.split(".").at(-1) ?? "";
  const outcomes: Record<string, string[]> = {
    approve: ["approved"],
    confirm: ["confirmed"],
    markStale: ["marked_stale", "already_stale"],
    revoke: ["revoked"],
    secondApprove: ["second_approved", "already_second_approved"],
    retry: ["projection_retry_queued", "already_retryable"],
  };
  return (
    receipt.ok === true &&
    receipt[action === "retry" ? "jobId" : "itemId"] ===
      write.input.params?.id &&
    typeof receipt.outcome === "string" &&
    outcomes[action]?.includes(receipt.outcome) === true
  );
}
