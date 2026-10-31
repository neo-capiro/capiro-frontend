import type { QueryClient } from "@tanstack/react-query";
import {
  assertProfileSource,
  type ProfileSource,
} from "@/features/portfolio/client-profile/read-public";
import { assertPreferenceActor, type PreferenceActor } from "./personal-access";
import {
  assertPreferenceReview,
  personalPreferencesKey,
  type PreferenceReview,
} from "./personal-queries";

export type PreferenceInputAttempt = {
  controller: AbortController;
  parent: ProfileSource;
  review?: PreferenceReview;
  ownInvalidation: boolean;
};

/** Latch interrupted saved inputs synchronously; React rendering may be batched. */
export function watchPreferenceInputs(
  cache: QueryClient,
  clientId: string,
  owner: PreferenceActor,
  current: () => PreferenceInputAttempt | null,
  onActorLost: () => void,
) {
  const targetKey = JSON.stringify(personalPreferencesKey(clientId, owner));
  return cache.getQueryCache().subscribe((event) => {
    const root = event.query.queryKey[0];
    if (
      root !== "identity" &&
      root !== "client-profile" &&
      root !== "portfolio" &&
      root !== "bill-alert-preferences"
    )
      return;
    try {
      assertPreferenceActor(cache, owner);
    } catch {
      current()?.controller.abort();
      onActorLost();
      return;
    }
    const attempt = current();
    if (!attempt || attempt.controller.signal.aborted) return;
    try {
      assertProfileSource(cache, attempt.parent);
      if (attempt.review) {
        assertPreferenceReview(cache, clientId, owner, attempt.review, true);
        if (
          JSON.stringify(event.query.queryKey) === targetKey &&
          event.type === "updated" &&
          event.action.type === "invalidate" &&
          !attempt.ownInvalidation
        )
          throw new Error("The saved preference read was interrupted.");
      }
    } catch {
      attempt.controller.abort();
    }
  });
}
