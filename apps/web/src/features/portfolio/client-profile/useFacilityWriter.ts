"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ambiguousClientWrite } from "@/shared/portfolio/auth/client-writer";
import type { Facility } from "./contracts";
import { assertProfileActor, type ProfileActor } from "./profile-access";
import { profileKey, profileReadKey } from "./profile-keys";
import {
  currentProfileSource,
  profileSourceMatches,
  type ProfileSource,
} from "./profile-source";
import { useFacilities } from "./queries";
import {
  nextFacilityAttempt,
  setFacilityAttempt,
  unknownFacilityAttempt,
  useFacilityAttempt,
} from "./facility-attempt";
import {
  assertFacilityWrite,
  facilityDraftRevision,
  writeFacility,
  type FacilityCommand,
} from "./facility-writer";

export function useFacilityWriter(
  clientId: string,
  actor: ProfileActor | undefined,
  facility: Facility | undefined,
  onSaved: () => void,
  onRestart: () => void,
) {
  const query = useFacilities(clientId);
  const api = useApi();
  const cache = useQueryClient();
  const { key, attempt } = useFacilityAttempt(clientId, actor, facility?.id);
  const [error, setError] = useState<Error | null>(null);
  const [reviewed, setReviewed] = useState<ProfileSource>();
  const request = useRef<{ controller: AbortController; token: number } | null>(
    null,
  );
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (request.current) {
        request.current.controller.abort();
        unknownFacilityAttempt(cache, key, request.current.token);
      }
    };
  }, [cache, key]);
  const current = facility
    ? query.data?.find((row) => row.id === facility.id)
    : undefined;
  const changed = Boolean(
    facility &&
    (!current ||
      facilityDraftRevision(facility) !== facilityDraftRevision(current)),
  );
  const canWrite = Boolean(actor && query.source && !changed && !attempt);
  async function save(command: FacilityCommand) {
    if (!canWrite || !actor || !query.source || request.current) return;
    const context = { clientId, actor, source: query.source, facility };
    try {
      assertFacilityWrite(cache, context, command);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause
          : new Error("Review the facility before saving."),
      );
      return;
    }
    const controller = new AbortController();
    const token = nextFacilityAttempt();
    request.current = { controller, token };
    setError(null);
    setReviewed(undefined);
    setFacilityAttempt(cache, key, {
      token,
      kind: command.kind === "remove" ? "remove" : facility ? "edit" : "create",
      status: "pending",
    });
    try {
      await writeFacility(api, cache, context, command, controller.signal);
      if (!alive.current || controller.signal.aborted) return;
      try {
        assertProfileActor(cache, actor);
      } catch {
        unknownFacilityAttempt(cache, key, token);
        return;
      }
      if (!profileSourceMatches(cache, context.source)) {
        unknownFacilityAttempt(cache, key, token);
        return;
      }
      setFacilityAttempt(cache, key, null);
      for (const section of ["facilities", "representation", "district-nexus"])
        void cache.invalidateQueries({
          queryKey: profileKey(clientId, section),
        });
      onSaved();
    } catch (cause) {
      if (!alive.current || controller.signal.aborted) return;
      if (ambiguousClientWrite(cause))
        unknownFacilityAttempt(cache, key, token);
      else setFacilityAttempt(cache, key, null);
      setError(
        cause instanceof Error
          ? cause
          : new Error("The facility request could not be completed."),
      );
    } finally {
      if (request.current?.token === token) request.current = null;
    }
  }
  async function review() {
    const result = await query.refetch();
    if (!alive.current || !actor || !result.isSuccess || result.error) return;
    try {
      assertProfileActor(cache, actor);
      const source = currentProfileSource(
        cache,
        profileReadKey(clientId, "facilities", actor),
      );
      if (source) setReviewed(source);
    } catch {
      /* A replacement view cannot resume this attempt. */
    }
  }
  function restart() {
    if (
      !actor ||
      !reviewed ||
      !profileSourceMatches(cache, reviewed) ||
      attempt?.status === "pending"
    )
      return;
    try {
      assertProfileActor(cache, actor);
    } catch {
      return;
    }
    setFacilityAttempt(cache, key, null);
    onRestart();
  }
  return {
    query,
    current,
    changed,
    canWrite,
    error,
    attempt,
    reviewed: Boolean(reviewed && profileSourceMatches(cache, reviewed)),
    save,
    review,
    restart,
  };
}
