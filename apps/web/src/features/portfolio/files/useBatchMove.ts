"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ambiguousClientWrite } from "@/shared/portfolio/auth/client-writer";
import { useFileReader, filesKey } from "./file-reader";
import { useFileScope, type FileExecution } from "./file-scope";
import {
  batchPayloadDigest,
  batchReceiptSchema,
  batchRecoverySchema,
  requireBatchReceipt,
  type BatchCommand,
  type BatchRecovery,
} from "./batch-move-contract";

export function useBatchMove(clientId: string) {
  const api = useApi(),
    cache = useQueryClient(),
    reader = useFileReader();
  const scope = useFileScope(clientId, "batch-move");
  const key = `capiro:file-batch:v1:${JSON.stringify([reader?.tenantId, reader?.userId, clientId])}`;
  const active = useRef<FileExecution | null>(null);
  const [state, setState] = useState<{
    key: string;
    pending?: BatchRecovery;
    busy?: boolean;
    error?: string;
    confirmed?: string;
    invalid?: boolean;
  }>({ key: "" });
  const stored = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return sessionStorage.getItem(key) ?? "";
      } catch {
        return "unreadable";
      }
    },
    () => undefined,
  );
  const restored = () => {
    try {
      return {
        key,
        pending: stored
          ? batchRecoverySchema.parse(JSON.parse(stored))
          : undefined,
        invalid: stored === undefined,
      };
    } catch {
      return {
        key,
        invalid: true,
        error:
          "The retained batch record could not be read. No new batch can be sent from this view.",
      };
    }
  };
  const visible: typeof state = state.key === key ? state : restored();
  async function run(command?: BatchCommand) {
    if (active.current && !active.current.signal.aborted) return;
    let execution: FileExecution | undefined,
      dispatched = false;
    let pending = visible.pending;
    try {
      execution = scope.capture(!!command);
      active.current = execution;
      setState({ key, pending, busy: true });
      const retained = sessionStorage.getItem(key);
      if (command && retained)
        throw new Error("Check the retained batch before starting another.");
      if (!command)
        pending = retained
          ? batchRecoverySchema.parse(JSON.parse(retained))
          : undefined;
      if (command) {
        pending = {
          version: 1,
          clientId,
          requestId: command.requestId,
          payloadDigest: await batchPayloadDigest(command),
        };
        execution.guard();
        sessionStorage.setItem(key, JSON.stringify(pending));
      }
      if (!pending || pending.clientId !== clientId)
        throw new Error("No exact batch recovery identity is available.");
      setState({ key, pending, busy: true });
      execution.guard();
      const path = `clients/${encodeURIComponent(clientId)}/files/batch-moves`;
      dispatched = !!command;
      const result = await api.request(
        "core",
        command ? path : `${path}/${encodeURIComponent(pending.requestId)}`,
        batchReceiptSchema,
        {
          ...(command ? { method: "POST", body: command } : {}),
          signal: execution.signal,
        },
      );
      const receipt = await requireBatchReceipt(pending, result);
      execution.guard();
      // Never erase a newer tab/view's recovery record.
      const current = sessionStorage.getItem(key);
      if (
        current &&
        batchRecoverySchema.parse(JSON.parse(current)).requestId ===
          pending.requestId
      )
        sessionStorage.removeItem(key);
      setState({
        key,
        confirmed: `Batch of ${receipt.files.length} files confirmed at ${new Date(receipt.committedAt).toLocaleString()}.`,
      });
      await cache.invalidateQueries({ queryKey: filesKey(clientId) });
    } catch (error) {
      if (execution?.signal.aborted) {
        setState((current) =>
          current.key === key ? { ...current, busy: false } : current,
        );
        return;
      }
      if (dispatched && !ambiguousClientWrite(error) && pending) {
        try {
          const raw = sessionStorage.getItem(key);
          if (
            raw &&
            batchRecoverySchema.parse(JSON.parse(raw)).requestId ===
              pending.requestId
          )
            sessionStorage.removeItem(key);
          pending = undefined;
        } catch {
          /* Keep the exact identity fenced when storage is unavailable. */
        }
      }
      setState({
        key,
        pending,
        error:
          error instanceof Error
            ? error.message
            : "The batch result is unconfirmed.",
      });
    } finally {
      if (active.current === execution) active.current = null;
    }
  }
  return {
    ...visible,
    available: scope.canWrite,
    busy: !!visible.busy,
    locked:
      !!visible.busy ||
      !!visible.pending ||
      !!visible.invalid ||
      !scope.canWrite,
    begin: () => {
      if (!visible.pending && !visible.busy && !visible.invalid)
        setState({ key });
    },
    send: (command: BatchCommand) => void run(command),
    recover: () => void run(),
  };
}
