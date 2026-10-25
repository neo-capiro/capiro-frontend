"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { assertClientWriter } from "@/shared/portfolio/auth/client-writer";
import { verifyCoreWriter } from "@/shared/portfolio/auth/verify-writer";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import {
  meetingCommandContract,
  meetingCommandScope,
  runMeetingCommand,
  type MeetingAction,
  type MeetingAttempt,
  type MeetingChange,
} from "./recovery";

export function useMeetingCommand(meetingId: string | null) {
  const api = useApi();
  const cache = useQueryClient();
  const identity = useIdentity();
  const actor = {
    tenantId: identity.data?.tenant?.id ?? "",
    userId: identity.data?.user.id ?? "",
  };
  const scope = meetingCommandScope(actor, meetingId);
  const [lastAttempt, setLastAttempt] = useState<{
    scope: string;
    value: MeetingAttempt;
  }>();
  const recovery = useRetainedIntent(
    scope,
    meetingCommandContract,
    async (signal, guard) => {
      assertClientWriter(cache, actor);
      await verifyCoreWriter(api, actor, signal, guard);
    },
  );
  const mutation = useMutation({
    mutationKey: ["meeting-command", scope],
    retry: false,
    mutationFn: async (
      action: MeetingAction & {
        before?: (signal: AbortSignal, guard: () => void) => Promise<void>;
      },
    ) => {
      if (!recovery.ready)
        throw new Error("Load saved meeting recovery before continuing.");
      const guard = () => {
        recovery.guard();
        assertClientWriter(cache, actor);
      };
      const signal = recovery.signal();
      guard();
      const result = await runMeetingCommand(
        api,
        actor,
        meetingId,
        action,
        guard,
        signal,
        (value) => {
          recovery.install(value);
          if (value) setLastAttempt({ scope, value });
          else if (action.kind !== "save") setLastAttempt(undefined);
        },
        async () => {
          await recovery.verify();
          if (action.kind === "save") await action.before?.(signal, guard);
        },
      );
      if (action.kind === "review")
        setLastAttempt({ scope, value: action.expected });
      return result;
    },
    onSettled: () => {
      for (const key of [
        "calendar",
        "meeting",
        "meeting-library",
        "meeting-review",
        "meeting-artifacts",
      ])
        void cache.invalidateQueries({ queryKey: [key] });
    },
  });
  const attempt = recovery.record;
  return {
    ready: recovery.ready,
    attempt,
    draft: attempt ?? (lastAttempt?.scope === scope ? lastAttempt.value : null),
    busy: mutation.isPending,
    blocked: !recovery.ready || mutation.isPending || Boolean(attempt),
    error: recovery.error ?? mutation.error?.message,
    receipt:
      mutation.data?.requestId === attempt?.input.requestId
        ? mutation.data
        : undefined,
    reload: recovery.retry,
    save: (
      change: MeetingChange,
      before?: (signal: AbortSignal, guard: () => void) => Promise<void>,
    ) => mutation.mutateAsync({ kind: "save", change, before }),
    recover: (kind: "check" | "retry" | "done" | "review") =>
      attempt
        ? mutation.mutateAsync({ kind, expected: attempt })
        : Promise.reject(new Error("No saved meeting action")),
  };
}
export type MeetingRecovery = ReturnType<typeof useMeetingCommand>;
