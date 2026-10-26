"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import { CapiroApiError } from "@/shared/capiro/http";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import {
  readRecovery,
  reserveRecovery,
  updateRecovery,
  withRecoveryCommandLock,
  RecoveryStorageError,
} from "@/shared/session/recovery/journal";
import {
  bindHillDayExport,
  exportDownloadInput,
  hillDayExportContract,
  hillDayExportScope,
  type HillDayExportIntent,
  type HillDayExportReceipt,
  type HillDayExportScope,
} from "./hillday-export-recovery";

class ExportScopeError extends Error {}
type View = {
  key: string;
  receipt?: HillDayExportReceipt;
  error?: string;
  absent?: boolean;
};

/** Existing journal + command lock retain intent; Core alone owns render/results. */
export function useHillDayExport(scope: HillDayExportScope) {
  const api = useCapiro();
  const key = hillDayExportScope(scope);
  const journal = useRetainedIntent(
    key,
    hillDayExportContract,
    async (signal, guard) => {
      const me = await api.request("me.read", {}, { signal });
      guard();
      if (
        me.tenant.id !== scope.tenantId ||
        me.user.id !== scope.userId ||
        me.user.clerkUserId !== scope.actorId
      )
        throw new ExportScopeError(
          "The current account changed. Reopen this document.",
        );
      const doc = await api.request(
        "workspace.hillday.document",
        { params: { id: scope.documentId } },
        { signal },
      );
      guard();
      if (doc.id !== scope.documentId || doc.client.id !== scope.clientId)
        throw new ExportScopeError(
          "The document or its client changed. Reopen it from Workspace.",
        );
    },
  );
  const [view, setView] = useState<View>({ key });
  const [phase, setPhase] = useState<"create" | "check" | "download" | null>(
    null,
  );
  const working = useRef(false);
  const known = useRef<HillDayExportIntent | null>(null);
  const [retainedPageSize, setRetainedPageSize] = useState<"letter" | "a4">();
  const [now, setNow] = useState(Date.now);
  const receipt = journal.ready && view.key === key ? view.receipt : undefined;
  const expires = Date.parse(receipt?.expiresAt ?? "");
  const expired = Number.isFinite(expires) && expires <= now;
  const canDownload =
    receipt?.status === "ready" &&
    !!receipt.url &&
    Number.isFinite(expires) &&
    !expired &&
    !phase;

  function install(record: HillDayExportIntent) {
    journal.install(record);
    known.current = record;
    setRetainedPageSize(record.pageSize);
  }
  async function retained() {
    const record = await readRecovery(
      key,
      hillDayExportContract,
      journal.guard,
    );
    const expected = known.current ?? journal.record;
    if (
      (expected && record?.requestId !== expected.requestId) ||
      (record &&
        (record.documentId !== scope.documentId ||
          record.clientId !== scope.clientId))
    )
      throw new RecoveryStorageError();
    if (record) install(record);
    return record;
  }
  async function remember(
    original: HillDayExportIntent,
    result: HillDayExportReceipt,
  ) {
    bindHillDayExport(result, original);
    const next: HillDayExportIntent = {
      ...original,
      exportId: result.exportId,
      ...(result.status === "ready"
        ? {
            proof: {
              renderInputSha256: result.renderInputSha256!,
              contentSha256: result.contentSha256!,
            },
          }
        : {}),
    };
    await updateRecovery(
      key,
      original.requestId,
      next,
      hillDayExportContract,
      journal.guard,
    );
    install(next);
    return next;
  }
  async function read(original: HillDayExportIntent) {
    const result = await api.request(
      "workspace.hillday.export.request",
      {
        params: { id: original.documentId, requestId: original.requestId },
      },
      { signal: journal.signal() },
    );
    journal.guard();
    if (result) await remember(original, result);
    // Recheck the original client as well as Core's current access before release.
    await journal.verify();
    journal.guard();
    setView({ key, receipt: result ?? undefined, absent: !result });
    return result;
  }
  async function action(
    nextPhase: NonNullable<typeof phase>,
    run: () => Promise<void>,
  ) {
    if (working.current || !journal.ready) return;
    working.current = true;
    known.current ??= journal.record;
    setRetainedPageSize(known.current?.pageSize);
    setPhase(nextPhase);
    setView({ key });
    try {
      await withRecoveryCommandLock(key, journal.guard, async () => {
        await journal.verify();
        await run();
        journal.guard();
      });
    } catch (cause) {
      try {
        journal.guard();
      } catch {
        return;
      }
      if (
        cause instanceof ExportScopeError ||
        cause instanceof RecoveryStorageError ||
        (cause instanceof CapiroApiError &&
          [401, 403, 404].includes(cause.status))
      )
        journal.block(cause);
      setView({
        key,
        error:
          cause instanceof Error
            ? cause.message
            : "The export result is unavailable. Check status to recover the original request.",
      });
    } finally {
      working.current = false;
      try {
        journal.guard();
        setPhase(null);
      } catch {
        /* retired view */
      }
    }
  }
  function refresh() {
    if (!journal.ready) {
      journal.retry();
      return;
    }
    return action("check", async () => {
      const original = await retained();
      if (original) await read(original);
    });
  }
  function generate(pageSize: "letter" | "a4") {
    return action("create", async () => {
      const existing = await retained();
      if (existing) {
        await read(existing);
        return;
      }
      const requestId = crypto.randomUUID();
      const original = await reserveRecovery(
        key,
        requestId,
        {
          requestId,
          documentId: scope.documentId,
          clientId: scope.clientId,
          pageSize,
        },
        hillDayExportContract,
        journal.guard,
      );
      install(original);
      if (original.requestId !== requestId) {
        await read(original);
        return;
      }
      // This is the only dispatch: intent is durably reserved first. Readback,
      // reload and cross-tab contention never send this POST again.
      const result = await api.request(
        "workspace.hillday.export",
        {
          params: { id: original.documentId },
          body: { pageSize: original.pageSize, requestId: original.requestId },
        },
        { signal: journal.signal() },
      );
      journal.guard();
      const retainedResult = await remember(original, result);
      setPhase("check");
      await read(retainedResult);
    });
  }
  function download() {
    if (!canDownload || expires <= Date.now()) {
      setNow(Date.now());
      return;
    }
    return action("download", async () => {
      const original = await retained();
      if (!original) throw new RecoveryStorageError();
      const current = await read(original);
      if (
        !current ||
        current.status !== "ready" ||
        Date.parse(current.expiresAt ?? "") <= Date.now()
      )
        throw new Error(
          "The download link is unavailable. Check status again.",
        );
      const result = await api.download(
        "workspace.hillday.download",
        exportDownloadInput(current),
        { signal: journal.signal() },
      );
      journal.guard();
      await journal.verify();
      journal.guard();
      const url = URL.createObjectURL(result.blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  const refreshRef = useRef(refresh);
  useLayoutEffect(() => {
    refreshRef.current = refresh;
  });
  const requestId = journal.record?.requestId;
  useEffect(() => {
    if (journal.ready && requestId) void refreshRef.current();
  }, [journal.ready, requestId]);
  useEffect(() => {
    if (receipt?.status !== "queued" || phase) return;
    const timer = setTimeout(() => void refreshRef.current(), 2000);
    return () => clearTimeout(timer);
  }, [receipt, phase]);
  useEffect(() => {
    if (!Number.isFinite(expires)) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.min(Math.max(0, expires - Date.now()), 2_147_483_647),
    );
    return () => clearTimeout(timer);
  }, [expires]);
  return {
    known: !!journal.record || !!retainedPageSize,
    ready: journal.ready,
    loading: journal.loading,
    pageSize: journal.record?.pageSize ?? retainedPageSize,
    creating: phase === "create",
    checking: phase === "check",
    downloading: phase === "download",
    pending: !!phase,
    error: journal.error ?? (view.key === key ? view.error : undefined),
    absent: view.key === key && view.absent,
    receipt,
    expired,
    canDownload,
    generate,
    refresh,
    download,
  };
}
