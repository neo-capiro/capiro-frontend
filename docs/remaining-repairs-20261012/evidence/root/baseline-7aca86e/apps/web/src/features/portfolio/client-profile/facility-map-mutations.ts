"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ambiguousClientWrite } from "@/shared/portfolio/auth/client-writer";
import type { Facility } from "./contracts";
import { assertProfileActor, type ProfileActor } from "./profile-access";
import { profileKey, profileReadKey } from "./profile-keys";
import { currentProfileSource, profileSourceMatches } from "./profile-source";
import { useFacilities } from "./queries";
import {
  nextFacilityActionAttempt,
  setFacilityActionAttempt,
  unknownFacilityActionAttempt,
  useFacilityActionAttempt,
  type FacilityActionAttempt,
} from "./facility-action-attempt";
import {
  assertFacilityAction,
  facilityActionRevision,
  writeFacilityAction,
  type FacilityAction,
  type FacilityActionContext,
} from "./facility-action-writer";
export type { FacilityAction } from "./facility-action-writer";

type ActiveAction = {
  token: number;
  controller: AbortController;
  stop: () => void;
};

export function useFacilityAction(
  clientId: string,
  facility: Facility,
  actor: ProfileActor | undefined,
  enabled: boolean,
) {
  const api = useApi();
  const cache = useQueryClient();
  const query = useFacilities(clientId);
  const { key, attempt } = useFacilityActionAttempt(
    clientId,
    actor,
    facility.id,
  );
  const [error, setError] = useState<Error | null>(null);
  const [message, setMessage] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const request = useRef<ActiveAction | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const active = request.current;
      if (active) {
        active.stop();
        active.controller.abort();
        unknownFacilityActionAttempt(cache, key, active.token);
      }
    };
  }, [cache, key]);
  const current = query.data?.find((row) => row.id === facility.id);
  const canAct = Boolean(
    enabled &&
    actor &&
    query.source &&
    current &&
    facilityActionRevision(current) === facilityActionRevision(facility) &&
    !attempt,
  );

  function watch(context: FacilityActionContext, active: ActiveAction) {
    const encoded = JSON.stringify(context.source.key);
    return cache.getQueryCache().subscribe((event) => {
      if (
        event.query.queryKey[0] !== "identity" &&
        JSON.stringify(event.query.queryKey) !== encoded
      )
        return;
      try {
        assertProfileActor(cache, context.actor);
        if (profileSourceMatches(cache, context.source)) return;
      } catch {
        /* A changed actor also makes this local request obsolete. */
      }
      active.stop();
      active.controller.abort();
      if (request.current === active) request.current = null;
      unknownFacilityActionAttempt(cache, key, active.token);
    });
  }
  async function run(action: FacilityAction) {
    if (
      !canAct ||
      !actor ||
      !query.source ||
      request.current ||
      cache.getQueryData<FacilityActionAttempt | null>(key)
    )
      return;
    const context = { clientId, actor, source: query.source, facility };
    try {
      assertFacilityAction(cache, context, action);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause
          : new Error("Review the saved facility."),
      );
      return;
    }
    const active: ActiveAction = {
      token: nextFacilityActionAttempt(),
      controller: new AbortController(),
      stop: () => {},
    };
    request.current = active;
    setError(null);
    setMessage("");
    setReviewed(false);
    setFacilityActionAttempt(cache, key, {
      token: active.token,
      kind: action.kind,
      status: "pending",
    });
    active.stop = watch(context, active);
    try {
      await writeFacilityAction(
        api,
        cache,
        context,
        action,
        active.controller.signal,
      );
      if (!alive.current || active.controller.signal.aborted) return;
      assertProfileActor(cache, actor);
      if (!profileSourceMatches(cache, context.source)) {
        unknownFacilityActionAttempt(cache, key, active.token);
        return;
      }
      active.stop();
      setFacilityActionAttempt(cache, key, null);
      if (action.kind === "geocode")
        setMessage(
          "Retry requested. Refresh this page later to check the current result.",
        );
      for (const section of ["facilities", "representation", "district-nexus"])
        void cache.invalidateQueries({
          queryKey: profileKey(clientId, section),
        });
    } catch (cause) {
      if (!alive.current || active.controller.signal.aborted) return;
      active.stop();
      if (ambiguousClientWrite(cause))
        unknownFacilityActionAttempt(cache, key, active.token);
      else setFacilityActionAttempt(cache, key, null);
      setError(
        cause instanceof Error
          ? cause
          : new Error("The address-resolution request could not be completed."),
      );
      if (
        action.kind === "geocode-candidate" &&
        !ambiguousClientWrite(cause) &&
        profileSourceMatches(cache, context.source)
      ) {
        try {
          assertProfileActor(cache, actor);
          void cache.invalidateQueries({
            queryKey: profileKey(clientId, "facilities"),
          });
        } catch {
          /* An obsolete error cannot refresh a replacement view. */
        }
      }
    } finally {
      active.stop();
      if (request.current === active) request.current = null;
    }
  }
  async function review() {
    if (!actor || attempt?.status !== "unknown") return;
    const token = attempt.token;
    const result = await query.refetch();
    if (!alive.current || !result.isSuccess || result.error) return;
    try {
      assertProfileActor(cache, actor);
      const source = currentProfileSource(
        cache,
        profileReadKey(clientId, "facilities", actor),
      );
      const stored = cache.getQueryData<FacilityActionAttempt | null>(key);
      if (
        !source ||
        !result.data.some((row) => row.id === facility.id) ||
        stored?.token !== token ||
        stored.status !== "unknown"
      )
        return;
      setFacilityActionAttempt(cache, key, null);
      setReviewed(true);
      setError(null);
    } catch {
      /* Only the initiating current view may resume explicit actions. */
    }
  }
  return {
    canAct,
    isPending: attempt?.status === "pending",
    kind: attempt?.kind,
    unknown: attempt?.status === "unknown",
    error,
    message,
    reviewed,
    reviewing: query.isFetching,
    run,
    review,
  };
}
