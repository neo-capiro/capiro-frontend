"use client";
import { useSyncExternalStore } from "react";
import {
  useQuery,
  useQueryClient,
  notifyManager,
  type QueryClient,
} from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import { useApi } from "@/shared/portfolio/api/provider";
import {
  assertProfileSource,
  currentProfileSource,
  profileClientSchema,
  profileReadKey,
  type ProfileSource,
} from "@/features/portfolio/client-profile/read-public";
import { assertPreferenceActor, type PreferenceActor } from "./personal-access";
import {
  personalPreferencesPath,
  personalPreferencesSchema,
  personalSignature,
  type PersonalPreferences,
} from "./personal-contracts";
import { alertPreferencesKey } from "./queries";

export const personalPreferencesKey = (
  clientId: string,
  owner: PreferenceActor,
) =>
  owner.backend === "intelligence"
    ? alertPreferencesKey(clientId, owner.actor)
    : ([
        "bill-alert-preferences",
        "core",
        owner.actor.tenantId,
        owner.actor.userId,
        clientId,
      ] as const);

export function assertPreferenceClient(
  cache: QueryClient,
  clientId: string,
  owner: PreferenceActor,
) {
  assertPreferenceActor(cache, owner);
  const key = profileReadKey(clientId, "saved-client", owner.actor);
  const source = currentProfileSource(cache, key);
  if (
    !source ||
    !profileClientSchema(clientId, owner.actor.tenantId).safeParse(
      cache.getQueryData(key),
    ).success
  )
    throw new ApiError(
      409,
      "Reload the current client before changing bill alerts.",
    );
  return source;
}
export function usePersonalPreferences(
  clientId: string,
  owner: PreferenceActor,
  enabled: boolean,
) {
  const api = useApi();
  const cache = useQueryClient();
  const source = useQuery({
    queryKey: personalPreferencesKey(clientId, owner),
    enabled,
    queryFn: async ({ signal }) => {
      const parent = assertPreferenceClient(cache, clientId, owner);
      const record = await api.request(
        owner.backend,
        personalPreferencesPath(clientId, owner),
        personalPreferencesSchema(clientId, owner),
        { signal },
      );
      signal.throwIfAborted();
      assertPreferenceActor(cache, owner);
      assertProfileSource(cache, parent);
      return record;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: false,
  });
  const current = useSyncExternalStore(
    (notify) =>
      cache.getQueryCache().subscribe(
        notifyManager.batchCalls((event) => {
          if (
            ["identity", "client-profile", "bill-alert-preferences"].includes(
              String(event.query.queryKey[0]),
            )
          )
            notify();
        }),
      ),
    () => {
      try {
        assertPreferenceClient(cache, clientId, owner);
        return Boolean(
          currentProfileSource(cache, personalPreferencesKey(clientId, owner)),
        );
      } catch {
        return false;
      }
    },
    () => false,
  );
  return { ...source, current };
}
export type PersonalPreferencesSource = ReturnType<
  typeof usePersonalPreferences
>;
export type PreferenceReview = { parent: ProfileSource; revision: number };
export function capturePreferenceReview(
  cache: QueryClient,
  clientId: string,
  owner: PreferenceActor,
  baseline: PersonalPreferences,
): PreferenceReview {
  const parent = assertPreferenceClient(cache, clientId, owner);
  const state = cache.getQueryState(personalPreferencesKey(clientId, owner));
  const record = personalPreferencesSchema(clientId, owner).safeParse(
    state?.data,
  );
  if (
    state?.status !== "success" ||
    state.error ||
    state.isInvalidated ||
    state.fetchStatus !== "idle" ||
    !record.success ||
    personalSignature(record.data, owner) !== personalSignature(baseline, owner)
  )
    throw new ApiError(
      409,
      "Reload saved preferences before changing these settings.",
    );
  return { parent, revision: state.dataUpdateCount };
}
export function assertPreferenceReview(
  cache: QueryClient,
  clientId: string,
  owner: PreferenceActor,
  review: PreferenceReview,
  allowInvalidated = false,
) {
  assertPreferenceActor(cache, owner);
  assertProfileSource(cache, review.parent);
  const state = cache.getQueryState(personalPreferencesKey(clientId, owner));
  if (
    state?.status !== "success" ||
    state.error ||
    state.fetchStatus !== "idle" ||
    state.dataUpdateCount !== review.revision ||
    (!allowInvalidated && state.isInvalidated)
  )
    throw new ApiError(
      409,
      "Saved preferences changed or are unavailable. Reload to review the current settings.",
    );
}
