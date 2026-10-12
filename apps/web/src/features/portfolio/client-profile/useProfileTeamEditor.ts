"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ambiguousClientWrite } from "@/shared/portfolio/auth/client-writer";
import { canAdminister } from "@/shared/portfolio/auth/identity";
import { assertProfileActor, type ProfileActor } from "./profile-access";
import { profileKey } from "./profile-keys";
import { useProfileMemberOptions } from "./profile-read-queries";
import type { TeamChange } from "./profile-receipts";
import { profileSourceMatches } from "./profile-source";
import { useTeam } from "./queries";
import { writeTeamChange } from "./team-writer";

export function useProfileTeamEditor(
  clientId: string,
  actor: ProfileActor | undefined,
) {
  const team = useTeam(clientId);
  const options = useProfileMemberOptions();
  const api = useApi();
  const cache = useQueryClient();
  const [pending, setPending] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [message, setMessage] = useState("");
  const request = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current?.abort();
    };
  }, []);
  const canEdit = Boolean(actor && canAdminister(actor.role));
  const canChange = canEdit && Boolean(team.source) && !pending && !unknown;
  async function change(value: TeamChange) {
    if (!canChange || !actor || !team.source || request.current) return false;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError(null);
    setMessage("");
    const context = {
      clientId,
      actor,
      roster: team.source,
      options: options.source,
    };
    try {
      const receipt = await writeTeamChange(
        api,
        cache,
        context,
        value,
        controller.signal,
      );
      if (!alive.current || controller.signal.aborted) return false;
      assertProfileActor(cache, actor, true);
      if (
        !profileSourceMatches(cache, context.roster) ||
        (value.kind !== "remove" &&
          context.options &&
          !profileSourceMatches(cache, context.options))
      ) {
        setUnknown(true);
        return false;
      }
      if (receipt.kind === "roster")
        cache.setQueryData(context.roster.key, receipt.roster);
      void cache.invalidateQueries({ queryKey: profileKey(clientId, "team") });
      void cache.invalidateQueries({ queryKey: ["account-owners"] });
      setMessage(
        value.kind === "owner"
          ? "Account owner saved. The team is refreshing."
          : "Team updated.",
      );
      return true;
    } catch (cause) {
      if (!alive.current || controller.signal.aborted) return false;
      setError(
        cause instanceof Error
          ? cause
          : new Error("The team could not be changed."),
      );
      setUnknown(ambiguousClientWrite(cause));
      return false;
    } finally {
      if (request.current === controller) request.current = null;
      if (alive.current) setPending(false);
    }
  }
  async function review() {
    const [roster, members] = await Promise.all([
      team.refetch(),
      options.refetch(),
    ]);
    if (
      !alive.current ||
      !actor ||
      !roster.isSuccess ||
      roster.error ||
      !members.isSuccess ||
      members.error
    )
      return;
    try {
      assertProfileActor(cache, actor, true);
      setUnknown(false);
      setError(null);
      setMessage(
        "Current team reloaded. Review it before making another change.",
      );
    } catch {
      /* The replacement session owns its own editor. */
    }
  }
  return {
    team,
    options,
    canEdit,
    canChange,
    pending,
    unknown,
    error,
    message,
    change,
    review,
  };
}
