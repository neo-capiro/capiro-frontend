import type { OperationResponse } from "../../shared/capiro/contracts";
import type { settingsOperations } from "../../shared/capiro/operations/settings";
import type { CapiroApi } from "../../shared/capiro/http";
import type { capiroOperations } from "../../shared/capiro/registry";

export type BrandingSyncReceipt = OperationResponse<
  (typeof settingsOperations)["settings.branding.sync"]
>;
export const brandingSyncMessage: Record<
  BrandingSyncReceipt["clerkSync"],
  string
> = {
  confirmed:
    "Company name saved in Capiro and synced to your sign-in organization.",
  failed: "Company name saved in Capiro. Sign-in organization sync failed.",
  unknown:
    "Company name saved in Capiro. Sign-in organization sync is not confirmed.",
  superseded:
    "A newer company name is saved in Capiro. Retry sync to use the current name.",
  not_requested:
    "Company name saved in Capiro. Sign-in organization sync was not requested.",
  not_linked:
    "Company name saved in Capiro. There is no linked sign-in organization.",
};
export function canRetryBrandingSync(status: BrandingSyncReceipt["clerkSync"]) {
  return status !== "confirmed" && status !== "not_linked";
}
/** Explicit retry has no browser name: the existing Core owner chooses its current saved value. */
export async function retryBrandingSync(
  api: CapiroApi<typeof capiroOperations>,
  signal: AbortSignal,
) {
  const actor = await api.request("me.read", {}, { signal });
  if (!["user_admin", "capiro_admin"].includes(actor.role))
    throw new Error("Administrator access is required.");
  signal.throwIfAborted();
  const receipt = await api.request("settings.branding.sync", {}, { signal });
  signal.throwIfAborted();
  if (receipt.id !== actor.tenant.id)
    throw new Error("Organization sync was not confirmed for this workspace.");
  return receipt;
}
