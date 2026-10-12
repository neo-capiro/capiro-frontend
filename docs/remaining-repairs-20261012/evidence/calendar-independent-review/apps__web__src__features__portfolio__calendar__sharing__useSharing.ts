"use client";
import { useLayoutEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { canAdminister } from "@/shared/portfolio/auth/identity";
import { useReviewActor } from "../review/useReviewActor";
import type { ReviewMeeting } from "../review/contracts";
import { ArtifactMutationError } from "../artifacts/api";
import { readSharing, changeSharing } from "./api";
import { sharingAttemptKey, idleSharing, type SharingAttempt } from "./fence";
import type { ShareAction } from "./contracts";
import type { SharingTarget } from "./targets";

export function useSharing(meeting: ReviewMeeting) {
  const api = useApi();
  const cache = useQueryClient();
  const access = useReviewActor();
  const admin = canAdminister(access.identity.data?.role);
  const key = sharingAttemptKey(meeting, access.actor ?? {});
  const attempt = useQuery<SharingAttempt>({
    queryKey: key,
    queryFn: () => idleSharing,
    initialData: idleSharing,
    enabled: false,
    gcTime: Infinity,
  }).data;
  const controller = useRef<AbortController | null>(null);
  useLayoutEffect(() => {
    const life = new AbortController();
    controller.current = life;
    return () => life.abort();
  }, [
    meeting.id,
    meeting.client?.id,
    access.actor?.userId,
    access.actor?.tenantId,
  ]);
  const query = useQuery({
    queryKey: ["calendar", "sharing", ...key.slice(1)],
    enabled: access.allowed && Boolean(access.actor),
    staleTime: 0,
    queryFn: async ({ signal }) => {
      access.guard();
      const current = await readSharing(
        api,
        meeting,
        access.actor!,
        admin,
        signal,
      );
      access.guard();
      return current;
    },
  });
  function submit(
    action: ShareAction,
    selected: SharingTarget[],
    done: () => void,
  ) {
    const previous = cache.getQueryData<SharingAttempt>(key);
    const actor = access.actor;
    if (
      !actor ||
      !access.allowed ||
      !query.isSuccess ||
      query.isFetching ||
      query.error ||
      !controller.current ||
      previous?.status === "pending" ||
      previous?.status === "uncertain"
    )
      return;
    const otherAttempt = ["notes", "debriefs"].some((kind) => {
      const state = cache.getQueryData<SharingAttempt>([
        "meeting-artifact-attempt",
        actor.tenantId,
        actor.userId,
        meeting.id,
        meeting.client?.id ?? null,
        kind,
      ]);
      return state?.status === "pending" || state?.status === "uncertain";
    });
    if (otherAttempt) {
      cache.setQueryData<SharingAttempt>(key, {
        status: "refused",
        error: new Error(
          "Another artifact action is pending or unverified. Resolve its saved state before changing sharing.",
        ),
      });
      return;
    }
    const signal = controller.current.signal;
    const guard = () => {
      signal.throwIfAborted();
      access.guard();
    };
    cache.setQueryData<SharingAttempt>(key, { status: "pending" });
    void changeSharing(
      api,
      meeting,
      actor,
      admin,
      action,
      selected,
      guard,
      signal,
    ).then(
      () => {
        cache.setQueryData(key, idleSharing);
        void cache.invalidateQueries({ queryKey: ["meeting", meeting.id] });
        void cache.invalidateQueries({ queryKey: ["calendar"] });
        done();
      },
      (error: unknown) => {
        if (!cache.getQueryData(key)) return;
        cache.setQueryData<SharingAttempt>(key, {
          status:
            error instanceof ArtifactMutationError && error.uncertain
              ? "uncertain"
              : "refused",
          error:
            error instanceof Error
              ? error
              : new Error("Sharing could not be changed."),
        });
      },
    );
  }
  return { ...access, query, attempt, submit };
}
