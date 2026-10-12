"use client";
import { useLayoutEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { useDispatchGuard } from "../access/public";
import { ArtifactMutationError, changeMeetingArtifact } from "./api";
import type {
  ArtifactActor,
  ArtifactChange,
  ArtifactKind,
  ArtifactMeeting,
} from "./contracts";

type Attempt = {
  status: "idle" | "pending" | "uncertain" | "refused";
  change?: ArtifactChange;
  error?: Error;
};
const idle: Attempt = { status: "idle" };

/** A session-scoped fence survives tab unmounts; it is never an idempotency claim. */
export function useArtifactMutation(
  meeting: ArtifactMeeting,
  kind: ArtifactKind,
  actor: ArtifactActor,
) {
  const api = useApi();
  const cache = useQueryClient();
  const guard = useDispatchGuard(actor.userId, actor.tenantId);
  const key = [
    "meeting-artifact-attempt",
    actor.tenantId,
    actor.userId,
    meeting.id,
    meeting.client?.id ?? null,
    kind,
  ];
  const attempt = useQuery<Attempt>({
    queryKey: key,
    queryFn: () => idle,
    enabled: false,
    initialData: idle,
    gcTime: Infinity,
  }).data;
  const lifetime = useRef<AbortController | null>(null);
  useLayoutEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, [actor.userId, actor.tenantId, meeting.id, meeting.client?.id, kind]);

  const mutate = (change: ArtifactChange, onSaved: () => void) => {
    const previous = cache.getQueryData<Attempt>(key);
    if (previous?.status === "pending" || previous?.status === "uncertain")
      return;
    const controller = lifetime.current;
    if (!controller || controller.signal.aborted) return;
    const assertCurrent = () => {
      controller.signal.throwIfAborted();
      guard();
    };
    // setQueryData is synchronous: two submit events in the same render cannot
    // dispatch two non-idempotent creates.
    cache.setQueryData<Attempt>(key, { status: "pending", change });
    void changeMeetingArtifact(
      api,
      meeting,
      kind,
      actor,
      change,
      assertCurrent,
      controller.signal,
    ).then(
      () => {
        cache.setQueryData<Attempt>(key, idle);
        void cache.invalidateQueries({ queryKey: ["meeting", meeting.id] });
        void cache.invalidateQueries({ queryKey: ["calendar", "meetings"] });
        onSaved();
      },
      (error: unknown) => {
        // Never repopulate a cleared session cache after expiration.
        if (!cache.getQueryData<Attempt>(key)) return;
        cache.setQueryData<Attempt>(key, {
          status:
            error instanceof ArtifactMutationError && error.uncertain
              ? "uncertain"
              : "refused",
          change,
          error:
            error instanceof Error
              ? error
              : new Error("The artifact could not be changed."),
        });
      },
    );
  };
  return {
    mutate,
    attempt,
    isPending: attempt.status === "pending",
    uncertain: attempt.status === "uncertain",
    error: attempt.error,
  };
}
