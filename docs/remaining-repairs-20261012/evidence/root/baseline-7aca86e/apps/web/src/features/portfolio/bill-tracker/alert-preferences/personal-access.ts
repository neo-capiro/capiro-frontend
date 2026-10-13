"use client";
import { useMemo } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import type { TrackerBackend } from "@/shared/portfolio/config/config";
import {
  assertProfileActor,
  currentProfileActor,
  profileActorKey,
  useProfileActor,
  type ProfileActor,
} from "@/features/portfolio/client-profile/read-public";
import { assertAlertActor, currentAlertActor, useAlertActor } from "./access";

export type PreferenceActor =
  | { backend: "core"; actor: ProfileActor }
  | { backend: "intelligence"; actor: ProfileActor & { clerkUserId: string } };

export function currentPreferenceActor(
  cache: QueryClient,
  backend: TrackerBackend,
): PreferenceActor | undefined {
  const actor = currentProfileActor(cache);
  if (!actor) return;
  if (backend === "core") return { backend, actor };
  const intel = currentAlertActor(cache);
  if (intel)
    return { backend, actor: { ...actor, clerkUserId: intel.clerkUserId } };
}
export const preferenceActorKey = (owner: PreferenceActor) =>
  JSON.stringify([
    owner.backend,
    profileActorKey(owner.actor),
    owner.backend === "intelligence" ? owner.actor.clerkUserId : null,
  ]);

export function assertPreferenceActor(
  cache: QueryClient,
  owner: PreferenceActor,
) {
  assertProfileActor(cache, owner.actor);
  if (owner.backend === "intelligence") assertAlertActor(cache, owner.actor);
  const current = currentPreferenceActor(cache, owner.backend);
  if (!current || preferenceActorKey(current) !== preferenceActorKey(owner))
    throw new ApiError(
      403,
      "Your current account cannot change these personal bill alerts.",
    );
}

export function usePreferenceActor(backend: TrackerBackend) {
  const actor = useProfileActor();
  const intel = useAlertActor();
  return useMemo<PreferenceActor | undefined>(() => {
    if (!actor) return;
    if (backend === "core") return { backend, actor };
    if (intel)
      return { backend, actor: { ...actor, clerkUserId: intel.clerkUserId } };
  }, [backend, actor, intel]);
}
