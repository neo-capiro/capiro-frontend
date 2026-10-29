import type { CapiroApi } from "../../../shared/capiro/http";
import type { capiroOperations } from "../../../shared/capiro/registry";
import type { SettingsWrite } from "../security-write-types";
import { settingsRequestHash } from "../security-write-journal";
import type { MemoryGrant } from "../../../shared/capiro/operations/memory-grants";

export function grantStatus(grant: MemoryGrant, now = Date.now()) {
  if (grant.status !== "active") return grant.status;
  if (grant.revokedAt) return "revoked";
  return grant.expiresAt && Date.parse(grant.expiresAt) <= now
    ? "expired"
    : "active";
}

/** Verify the original persisted identifier, never resend an unconfirmed mutation. */
export async function reconcileMemoryGrant(
  api: CapiroApi<typeof capiroOperations>,
  write: SettingsWrite,
  signal: AbortSignal,
) {
  if (!write.expectedAccount) return false;
  const account = await api.request("me.read", {}, { signal });
  if (
    account.user.id !== write.expectedAccount.userId ||
    account.tenant.id !== write.expectedAccount.tenantId
  )
    return false;
  const clientId = String(write.input.params?.clientId);
  const { grants } = await api.request(
    "settings.memory.grants.list",
    { params: { clientId } },
    { signal },
  );
  if (write.operation === "settings.memory.grants.revoke") {
    return !grants.some(
      (grant) =>
        grant.userId === write.input.params?.userId &&
        grant.status === "active" &&
        !grant.revokedAt,
    );
  }
  const grant = grants.find((row) => row.id === write.input.body?.id);
  if (
    !grant ||
    grant.clientId !== clientId ||
    grant.grantedByUserId !== account.user.id ||
    !write.requestHash
  )
    return false;
  return (
    (await settingsRequestHash({
      params: { clientId },
      body: {
        id: grant.id,
        userId: grant.userId,
        permissions: [...grant.permissions].sort(),
        reason: grant.reason,
        expiresAt: grant.expiresAt,
      },
    })) === write.requestHash
  );
}
