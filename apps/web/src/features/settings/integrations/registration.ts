import type { z } from "zod";
import type { settingsOperations } from "../../../shared/capiro/operations/settings";

type RegistrationOperation =
  (typeof settingsOperations)["settings.integrations.create"];
type Registration = z.infer<RegistrationOperation["request"]>["body"];
type Receipt = z.infer<RegistrationOperation["response"]>;

/** Match Core's registration normalization before allowing form success effects. */
export function assertRegistrationReceipt(
  submitted: Registration,
  receipt: Receipt,
) {
  if (
    receipt.provider !== submitted.provider ||
    receipt.accountEmail !==
      (submitted.accountEmail?.trim().toLowerCase() || null) ||
    receipt.displayName !== (submitted.displayName?.trim() || null) ||
    receipt.status !== "needs_configuration"
  )
    throw new Error(
      "The registration response did not match this account. Your draft is unchanged; reload integrations to confirm the result before trying again.",
    );
}
