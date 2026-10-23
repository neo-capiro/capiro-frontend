import { CapiroApiError } from "../../shared/capiro/http";
import { ordinaryReceipt } from "./ordinary-write-recovery";
import type { SettingsWrite } from "./security-write-types";
import { row } from "./settings-receipt-values";
import { teamReceipt } from "./settings-team-receipts";
import { hqReceipt } from "./settings-hq-receipts";
import { mappingsReceipt } from "./settings-mappings-receipts";
import { analystReceipt } from "./settings-analyst-receipts";
import { providerReceipt } from "./settings-provider-receipts";
export type { SettingsWrite } from "./security-write-types";
export const uncertainSettingsWrite =
  "The result is not confirmed. This write will not be sent again. Check the recorded target before making another change.";

/** Shape validation belongs to the transport; these checks bind a receipt to the reviewed write. */
/** Transport validates shape; each domain binds its receipt to the reviewed write. */
export function assertSettingsReceipt(write: SettingsWrite, value: unknown) {
  const confirmed =
    ordinaryReceipt(write, value) ??
    teamReceipt(write, value) ??
    hqReceipt(write, value) ??
    mappingsReceipt(write, value) ??
    analystReceipt(write, value) ??
    providerReceipt(write, value);
  if (!confirmed) throw new Error(uncertainSettingsWrite);
}

export function isDefiniteSettingsRejection(error: unknown) {
  return (
    error instanceof CapiroApiError &&
    [400, 401, 403, 404, 409, 422].includes(error.status)
  );
}
export function snapshotSettingsWrite(
  operation: string,
  input: unknown,
): SettingsWrite {
  const captured = structuredClone(row(input)) as SettingsWrite["input"];
  if (typeof captured.body?.apiKey === "string") {
    captured.body.keyLast4 = captured.body.apiKey.slice(-4);
    delete captured.body.apiKey; // Never retain a credential in the navigation journal.
  }
  return {
    operation,
    attemptId: crypto.randomUUID(),
    input: captured,
    state: "pending",
    startedAt: new Date().toISOString(),
  };
}
