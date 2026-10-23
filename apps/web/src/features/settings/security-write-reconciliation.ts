import type { CapiroApi } from "../../shared/capiro/http";
import type { capiroOperations } from "../../shared/capiro/registry";
import type { SettingsWrite } from "./security-write-types";
type Api = CapiroApi<typeof capiroOperations>;
import { reconcileOrdinaryWrite } from "./ordinary-write-recovery";
import { reconcileTeam } from "./settings-team-receipts";
import { reconcileHq } from "./settings-hq-receipts";
import { reconcileMappings } from "./settings-mappings-receipts";
import { reconcileAnalyst } from "./settings-analyst-receipts";
import { reconcileProvider } from "./settings-provider-receipts";

/** Read-only observation can settle only an already delivered exact receipt. */
export async function reconcileSettingsWrite(
  api: Api,
  write: SettingsWrite,
  signal: AbortSignal,
): Promise<boolean> {
  signal.throwIfAborted();
  // Current state alone cannot attribute a lost command, even if another actor
  // happened to produce exactly the requested result.
  if (!write.receiptConfirmed) return false;
  return (
    (await reconcileOrdinaryWrite(api, write, signal)) ??
    (await reconcileTeam(api, write, signal)) ??
    (await reconcileHq(api, write, signal)) ??
    (await reconcileMappings(api, write, signal)) ??
    (await reconcileAnalyst(api, write, signal)) ??
    (await reconcileProvider(api, write, signal)) ??
    false
  );
}

export const settingsWriteNeedsReadback = (operation: string) =>
  [
    "me.emailSignature.update",
    "settings.team.remove",
    "settings.team.resend",
    "settings.analyst.personCandidates.decide",
    "settings.analyst.personnelMerge.decide",
    "settings.analyst.quarantine.discard",
    "settings.analyst.quarantine.reprocess",
    "settings.hq.ai.removeCredential",
    "settings.hq.customers.comp",
  ].includes(operation);
