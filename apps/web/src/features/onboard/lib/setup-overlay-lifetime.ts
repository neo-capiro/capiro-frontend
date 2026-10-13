import type { QueryClient } from "@tanstack/react-query";
import type { SetupState } from "@/shared/capiro/onboard-contracts";
import { createOnboardAttempt } from "./attempt-journal";

export const SETUP_STATE_KEY = ["setup", "state"] as const;
export type SetupOverlayKind = "import" | "ai" | "invites";

/** Existing UI prerequisites only; native services still authorize every effect. */
export function setupOverlayEligible(
  state: SetupState,
  kind: SetupOverlayKind,
) {
  if (state.legacyTenant) return false;
  if (kind === "import") return state.importMode === "self";
  if (kind === "invites")
    return (
      ["done", "skipped"].includes(state.tasks.it_email) &&
      state.tasks.import === "done" &&
      state.tasks.invites !== "done"
    );
  return true;
}

/** One explicit opening. Once revoked, current data cannot revive this editor. */
export function createSetupOverlayLifetime(
  cache: QueryClient,
  kind: SetupOverlayKind,
) {
  let revoked = false;
  const current = () => {
    const query = cache.getQueryState<SetupState>(SETUP_STATE_KEY);
    if (
      !query ||
      query.status !== "success" ||
      query.error ||
      !query.data ||
      !setupOverlayEligible(query.data, kind)
    )
      revoked = true;
    return !revoked;
  };
  return {
    kind,
    current,
    close: () => {
      revoked = true;
    },
    subscribe: (notify: () => void) =>
      cache.getQueryCache().subscribe(() => {
        if (!current()) notify();
      }),
    // Keep existing unknown records/receipts across reopening. Disposing a local
    // editor does not prove that its already-dispatched native effect failed.
    attempt: (name: string) => createOnboardAttempt(cache, name, current),
  };
}
