"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useApi } from "@/shared/portfolio/api/provider";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { assertClientWriter, currentClientWriter } from "./authority";
import { profileKey } from "../profile-keys";
import type { QuickLogInput } from "./contracts";
import {
  activityCommandInputSchema,
  type ActivityCommandInput,
  type ActivityCommandReceipt,
  type CommandIdentity,
  type FollowUpInput,
} from "./command-contracts";
import {
  createActivityCommand,
  readActivityCommand,
  resumeActivityCommand,
} from "./command-actions";

type PendingCommand = {
  input: ActivityCommandInput;
  known: CommandIdentity;
  receipt?: ActivityCommandReceipt;
  busy?: string;
  readFresh: boolean;
  readAttempted: boolean;
  error?: string;
};
type Operation = "create" | "read" | "resume" | "recover";

export function useFollowUpCommand(clientId: string, open: boolean) {
  const api = useApi();
  const cache = useQueryClient();
  useIdentity();
  const actor = currentClientWriter(cache);
  const scope = JSON.stringify([actor?.tenantId, actor?.userId, clientId]);
  const key = ["quick-log-follow-up", scope];
  const cached = useQuery<PendingCommand | null>({
    queryKey: key,
    queryFn: async () => null,
    enabled: false,
    initialData: null,
    gcTime: Infinity,
  });
  const [failure, setFailure] = useState<{ scope: string; message: string }>();
  const lifetime = useRef<AbortController | null>(null);
  const operation = useRef<string | null>(null);
  useLayoutEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    const scopedKey = ["quick-log-follow-up", scope];
    return () => {
      controller.abort();
      const current = cache.getQueryData<PendingCommand | null>(scopedKey);
      if (current && operation.current && current.busy === operation.current)
        cache.setQueryData(scopedKey, {
          ...current,
          busy: undefined,
          receipt: undefined,
          readFresh: false,
          error:
            "The request was interrupted. Read the original command before continuing.",
        });
      operation.current = null;
    };
  }, [cache, scope, open]);
  const pending = cached.data ?? null;
  async function run(kind: Operation, input?: ActivityCommandInput) {
    const controller = lifetime.current;
    const saved = cache.getQueryData<PendingCommand | null>(key);
    if (
      !open ||
      !actor ||
      !controller ||
      controller.signal.aborted ||
      operation.current ||
      saved?.busy ||
      (kind === "create" ? Boolean(saved) : !saved)
    )
      return;
    if (kind === "recover" && (!saved?.readAttempted || saved.receipt)) return;
    if (kind === "resume" && (!saved?.readFresh || !saved.receipt)) return;
    const original: PendingCommand = saved ?? {
      input: input!,
      known: {},
      readFresh: false,
      readAttempted: false,
    };
    const token = crypto.randomUUID();
    operation.current = token;
    const active = {
      ...original,
      busy: token,
      receipt: undefined,
      error: undefined,
      readFresh: false,
      readAttempted: original.readAttempted || kind === "read",
    };
    cache.setQueryData(key, active);
    setFailure(undefined);
    const guard = () => {
      controller.signal.throwIfAborted();
      assertClientWriter(cache, actor);
    };
    const context = {
      actor,
      clientId,
      input: original.input,
      known: original.known,
    };
    let dispatched = false;
    const mark = () => {
      dispatched = true;
    };
    try {
      const receipt =
        kind === "read"
          ? await readActivityCommand(api, context, controller.signal, guard)
          : kind === "resume"
            ? await resumeActivityCommand(
                api,
                context,
                original.receipt!,
                controller.signal,
                guard,
                mark,
              )
            : await createActivityCommand(
                api,
                context,
                controller.signal,
                guard,
                mark,
              );
      guard();
      cache.setQueryData(key, {
        ...active,
        busy: undefined,
        receipt,
        readFresh: kind === "read",
        known: {
          commandId: receipt.commandId,
          activityId: receipt.activity.id,
          version: receipt.version,
          taskId: receipt.followUp?.taskId ?? original.known.taskId,
        },
      });
    } catch (cause) {
      if (controller.signal.aborted) return;
      const message =
        cause instanceof Error
          ? cause.message
          : "The activity command could not be confirmed.";
      if (kind === "create" && !dispatched) {
        cache.setQueryData(key, null);
        setFailure({ scope, message });
      } else
        cache.setQueryData(key, { ...active, busy: undefined, error: message });
    } finally {
      if (operation.current === token) operation.current = null;
      if (dispatched && !controller.signal.aborted)
        void cache.invalidateQueries({
          queryKey: profileKey(clientId, "activity"),
        });
    }
  }
  function start(activity: QuickLogInput, followUp: FollowUpInput) {
    try {
      z.uuid().parse(actor?.userId);
      z.uuid().parse(actor?.tenantId);
      z.uuid().parse(clientId);
      const input = activityCommandInputSchema.parse({
        requestId: crypto.randomUUID(),
        activity,
        followUp,
      });
      void run("create", input);
    } catch (cause) {
      setFailure({
        scope,
        message:
          cause instanceof z.ZodError
            ? (cause.issues[0]?.message ?? "Review the follow-up fields.")
            : "A current Core session is required.",
      });
    }
  }
  const complete =
    pending?.receipt?.status === "completed" &&
    pending.receipt.activity.available &&
    pending.receipt.followUp?.state === "completed";
  return {
    pending,
    start,
    busy: Boolean(pending?.busy),
    error:
      pending?.error ??
      (failure?.scope === scope ? failure.message : undefined),
    ready: Boolean(actor),
    complete,
    refresh: () => run("read"),
    recover: () => run("recover"),
    resume: () => run("resume"),
    canResume:
      pending?.readFresh &&
      pending.receipt &&
      ["pending", "needs_attention"].includes(pending.receipt.status) &&
      pending.receipt.version <= 2147483646 &&
      pending.receipt.followUp?.state !== "completed",
    finish: () => {
      if (complete && !pending?.busy) cache.setQueryData(key, null);
    },
  };
}
