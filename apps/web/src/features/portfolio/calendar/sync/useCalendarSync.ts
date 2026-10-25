"use client";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import { canAdminister, useIdentity } from "@/shared/portfolio/auth/identity";
import { assertClientWriter } from "@/shared/portfolio/auth/client-writer";
import { verifyCoreWriter } from "@/shared/portfolio/auth/verify-writer";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import { useCalendarCapabilities, useDispatchGuard } from "../access/public";
import {
  calendarRecoveryContract,
  calendarRecoveryScope,
  runCalendarSync,
  type CalendarAction,
} from "./recovery";
import type {
  CalendarSyncAttempt,
  CalendarSyncIntent,
  CalendarSyncReceipt,
} from "./contracts";
import { calendarConnectionsKey } from "./queries";

export function useCalendarSync(open: boolean) {
  const api = useApi(),
    cache = useQueryClient(),
    identity = useIdentity(),
    capabilities = useCalendarCapabilities();
  const userId = identity.data?.user.id ?? "",
    tenantId = identity.data?.tenant?.id ?? "";
  const actor = { userId, tenantId },
    scope = calendarRecoveryScope(actor);
  const readGuard = useDispatchGuard(userId, tenantId),
    writeGuard = useDispatchGuard(userId, tenantId, true);
  const subscribe = useCallback(
    (notify: () => void) => cache.getQueryCache().subscribe(notify),
    [cache],
  );
  const gatesInvalidated = useSyncExternalStore(
    subscribe,
    () =>
      (cache.getQueryState(["identity"])?.isInvalidated ? 1 : 0) |
      (cache.getQueryState(["meeting-preparation", "capabilities"])
        ?.isInvalidated
        ? 2
        : 0),
    () => 3,
  );
  const lifetime = useRef<AbortController | undefined>(undefined);
  const busy = useRef(false);
  const [activeScope, setActiveScope] = useState<string>();
  const [snapshot, setSnapshot] = useState<{
    scope: string;
    receipt?: CalendarSyncReceipt;
    error?: string;
  }>();
  const recovery = useRetainedIntent(
    scope,
    calendarRecoveryContract,
    async (signal, guard) => {
      assertClientWriter(cache, actor);
      await verifyCoreWriter(api, actor, signal, guard);
    },
  );
  useLayoutEffect(() => {
    const current = new AbortController();
    lifetime.current = current;
    if (!open) current.abort();
    return () => current.abort();
  }, [open, userId, tenantId]);
  const canRead = Boolean(
    open &&
    userId &&
    tenantId &&
    recovery.ready &&
    identity.isSuccess &&
    !identity.isFetching &&
    !identity.error &&
    !(gatesInvalidated & 1) &&
    (identity.data?.role === "standard_user" ||
      canAdminister(identity.data?.role)),
  );
  const allowed = Boolean(
    canRead &&
    !(gatesInvalidated & 2) &&
    capabilities.isSuccess &&
    !capabilities.isFetching &&
    !capabilities.error &&
    capabilities.data.runtime?.externalActionsEnabled === true,
  );
  function assertCurrent(current = lifetime.current, external = true) {
    if (
      !open ||
      !current ||
      current !== lifetime.current ||
      current.signal.aborted
    )
      throw new ApiError(409, "This calendar review is closed or changed.");
    recovery.guard();
    (external ? writeGuard : readGuard)();
  }
  async function execute(action: CalendarAction) {
    if (busy.current) return;
    const current = lifetime.current;
    busy.current = true;
    setActiveScope(scope);
    setSnapshot({ scope });
    try {
      if (!recovery.ready)
        throw new Error("Load saved calendar recovery before continuing.");
      const external = action.kind === "start" || action.kind === "continue";
      const guard = () => assertCurrent(current, external);
      guard();
      const signal = AbortSignal.any([current!.signal, recovery.signal()]);
      const receipt = await runCalendarSync(
        api,
        actor,
        action,
        guard,
        signal,
        recovery.install,
        () => recovery.verify(),
      );
      guard();
      setSnapshot({ scope, ...(action.kind === "done" ? {} : { receipt }) });
      void cache.invalidateQueries({ queryKey: ["calendar", "meetings"] });
      void cache.invalidateQueries({
        queryKey: calendarConnectionsKey(tenantId, userId),
      });
    } catch (failure) {
      if (current === lifetime.current && !current?.signal.aborted)
        setSnapshot({
          scope,
          error:
            failure instanceof Error
              ? failure.message
              : "Calendar import could not be confirmed.",
        });
    } finally {
      busy.current = false;
      setActiveScope(undefined);
    }
  }
  const command = recovery.record;
  const receipt =
    snapshot?.scope === scope &&
    snapshot.receipt?.requestId === command?.requestId
      ? snapshot.receipt
      : undefined;
  const attempt: CalendarSyncAttempt = !command
    ? { status: "idle" }
    : activeScope === scope
      ? { status: "pending", intent: command.intent }
      : receipt
        ? {
            status: receipt.status === "completed" ? "completed" : "partial",
            intent: command.intent,
            receipt,
          }
        : { status: "unknown", intent: command.intent };
  return {
    allowed,
    canRead,
    userId,
    tenantId,
    assertCurrent,
    attempt,
    ready: recovery.ready,
    loading: recovery.loading,
    busy: activeScope === scope,
    error:
      recovery.error ??
      (snapshot?.scope === scope ? snapshot.error : undefined),
    reload: recovery.retry,
    sync: (intent: CalendarSyncIntent) => execute({ kind: "start", intent }),
    recover: (kind: "check" | "continue" | "done") =>
      command ? execute({ kind, expected: command }) : Promise.resolve(),
    reviewAnother: () =>
      command
        ? execute({ kind: "done", expected: command })
        : Promise.resolve(),
  };
}
