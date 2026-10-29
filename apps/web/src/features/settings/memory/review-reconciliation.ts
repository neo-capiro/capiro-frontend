import type { CapiroApi } from "../../../shared/capiro/http";
import type { capiroOperations } from "../../../shared/capiro/registry";
import type { SettingsWrite } from "../security-writes";
export async function reconcileMemoryReview(
  api: CapiroApi<typeof capiroOperations>,
  write: SettingsWrite,
  signal: AbortSignal,
) {
  if (
    !write.expectedAccount ||
    typeof write.input.params?.requestId !== "string"
  )
    return false;
  const account = await api.request("me.read", {}, { signal });
  if (
    account.user.id !== write.expectedAccount.userId ||
    account.tenant.id !== write.expectedAccount.tenantId
  )
    return false;
  const review = await api.request(
    "memory.review.request",
    { params: { id: write.input.params.requestId } },
    { signal },
  );
  return (
    review.reviewRequestId === write.input.params.requestId &&
    review.candidateId === write.input.params.id &&
    review.decidedBy?.userId === account.user.id &&
    review.status ===
      (write.operation.endsWith(".approve") ? "approved" : "rejected")
  );
}
