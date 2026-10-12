"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { assertClientWriter, currentClientWriter } from "./authority";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  updateRecovery,
  RecoveryStorageError,
} from "@/shared/portfolio/recovery/journal";
import {
  retainedCommandContract,
  verifyCommandAuthority,
} from "./command-recovery";
import { useCommandRecovery } from "./useCommandRecovery";
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
  const recovery = useCommandRecovery(
    api,
    cache,
    actor,
    clientId,
    open,
    (record) => {
      cache.setQueryData(
        key,
        record ? { ...record, readFresh: false, readAttempted: false } : null,
      );
    },
  );
  const pending = recovery.ready ? (cached.data ?? null) : null;
  async function run(kind: Operation, input?: ActivityCommandInput) {
    const controller = lifetime.current;
    const saved = cache.getQueryData<PendingCommand | null>(key);
    if (
      !open ||
      !actor ||
      !recovery.ready ||
      !recovery.scope ||
      !controller ||
      controller.signal.aborted ||
      operation.current ||
      saved?.busy ||
      (kind === "create" ? Boolean(saved) : !saved)
    )
      return;
    if (kind === "recover" && (!saved?.readAttempted || saved.receipt)) return;
    if (kind === "resume" && (!saved?.readFresh || !saved.receipt)) return;
    let original: PendingCommand = saved ?? {
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
    let dispatched = false;
    const mark = () => {
      dispatched = true;
    };
    let authorityVerified = false;
    let durable = Boolean(saved);
    try {
      await verifyCommandAuthority(
        api,
        actor,
        clientId,
        controller.signal,
        guard,
      );
      authorityVerified = true;
      const retained =
        kind === "create"
          ? await reserveRecovery(
              recovery.scope,
              original.input.requestId,
              { input: original.input, known: original.known },
              retainedCommandContract,
              guard,
            )
          : await readRecovery(recovery.scope, retainedCommandContract, guard);
      guard();
      if (!retained) throw new RecoveryStorageError();
      durable = true;
      if (retained.input.requestId !== original.input.requestId) {
        cache.setQueryData(key, {
          ...retained,
          readFresh: false,
          readAttempted: false,
          error:
            "An original command was restored from another view. Read it before continuing.",
        });
        return;
      }
      original = { ...original, ...retained };
      const context = {
        actor,
        clientId,
        input: original.input,
        known: original.known,
      };
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
      const known = {
        commandId: receipt.commandId,
        activityId: receipt.activity.id,
        version: receipt.version,
        taskId: receipt.followUp?.taskId ?? original.known.taskId,
      };
      await updateRecovery(
        recovery.scope,
        original.input.requestId,
        { input: original.input, known },
        retainedCommandContract,
        guard,
      );
      guard();
      cache.setQueryData(key, {
        ...active,
        busy: undefined,
        receipt,
        readFresh: kind === "read",
        known,
      });
    } catch (cause) {
      if (controller.signal.aborted) return;
      const message =
        cause instanceof Error
          ? cause.message
          : "The activity command could not be confirmed.";
      if (
        !authorityVerified ||
        cause instanceof RecoveryStorageError ||
        (cause instanceof ApiError && [401, 403].includes(cause.status))
      )
        recovery.block(message);
      if (kind === "create" && !durable) {
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
    ready: Boolean(actor && recovery.ready),
    checking: recovery.checking,
    blocked: recovery.blocked,
    recoveryError: recovery.error,
    retryRecovery: recovery.retry,
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
    finish: async () => {
      const controller = lifetime.current;
      if (
        !complete ||
        pending?.busy ||
        !pending ||
        !actor ||
        !recovery.scope ||
        !controller ||
        operation.current
      )
        return false;
      const token = crypto.randomUUID();
      operation.current = token;
      cache.setQueryData(key, { ...pending, busy: token });
      const guard = () => {
        controller.signal.throwIfAborted();
        assertClientWriter(cache, actor);
      };
      try {
        await verifyCommandAuthority(
          api,
          actor,
          clientId,
          controller.signal,
          guard,
        );
        await acknowledgeRecovery(
          recovery.scope,
          pending.input.requestId,
          guard,
        );
        guard();
        cache.setQueryData(key, null);
        return true;
      } catch (cause) {
        if (!controller.signal.aborted)
          recovery.block(
            cause instanceof Error
              ? cause.message
              : "The original command remains retained.",
          );
        return false;
      } finally {
        if (operation.current === token) operation.current = null;
      }
    },
  };
}
