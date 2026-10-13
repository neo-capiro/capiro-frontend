"use client";
import { useRef, useState } from "react";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import { CapiroApiError } from "@/shared/capiro/http";
import type {
  BriefCopyDetail,
  BriefCopySource,
  BriefCopyState,
} from "@/shared/capiro/operations/workspace-brief-copy";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import {
  acknowledgeRecovery,
  reserveRecovery,
  updateRecovery,
  readRecovery,
  retireRefusedRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import { assertCopyReceipt, sameSource, type CopyScope } from "./admission";
import {
  copyIntentSchema,
  copyIntentScope,
  copyRecoveryContract,
  type CopyIntent,
} from "./intent";
import {
  readCopyDocument,
  readCopyState,
  submitCopyIntent,
} from "./transactions";

export type CurrentCopy = { state: BriefCopyState; detail?: BriefCopyDetail };
export function useBriefCopyCommand(
  scope: CopyScope,
  source: BriefCopySource,
  initial: CurrentCopy,
  documentId?: string,
) {
  const api = useCapiro();
  const key = copyIntentScope(
    scope.actor,
    scope.draftId,
    documentId ?? `source:${source.briefId}:${source.versionId}`,
  );
  const [current, setCurrent] = useState<CurrentCopy>(initial);
  const [rebased, setRebased] = useState<CopyIntent>();
  const journal = useRetainedIntent(
    key,
    copyRecoveryContract,
    async (signal, guard) => {
      const fresh = documentId
        ? await readCopyDocument(api, scope, documentId, source, {
            signal,
            guard,
          })
        : { state: await readCopyState(api, scope, { signal, guard }) };
      setCurrent(fresh);
    },
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [generation, setGeneration] = useState(0);
  const busy = useRef(false);
  const lifetime = () => ({ signal: journal.signal(), guard: journal.guard });
  function assertIntent(intent: CopyIntent) {
    if (
      !sameSource(intent.source, source) ||
      intent.command.body.expectedClientId !== scope.clientId ||
      (documentId
        ? intent.command.kind !== "save" ||
          intent.command.documentId !== documentId
        : intent.command.kind !== "copy")
    )
      throw new Error(
        "The saved intent does not belong to this exact copy view.",
      );
  }
  async function persist(intent: CopyIntent) {
    await updateRecovery(
      key,
      intent.command.body.requestId,
      intent,
      copyRecoveryContract,
      journal.guard,
    );
    journal.install(intent);
  }
  async function reconcile(intent: CopyIntent) {
    assertIntent(intent);
    if (!intent.receipt)
      throw new Error(
        "The saved command has no verified receipt. Retry its exact input deliberately.",
      );
    assertCopyReceipt(intent.receipt, scope, {
      requestId: intent.command.body.requestId,
      operation:
        intent.command.kind === "copy" ? "copy_core_brief" : "save_brief_copy",
      source,
      documentId,
    });
    const fresh = await readCopyDocument(
      api,
      scope,
      intent.receipt.receipt.documentId,
      source,
      lifetime(),
    );
    await acknowledgeRecovery(
      key,
      intent.command.body.requestId,
      journal.guard,
    );
    journal.install(null);
    setCurrent(fresh);
    setRebased(undefined);
    setGeneration((value) => value + 1);
    setMessage(
      `Saved Workspace version ${intent.receipt.receipt.versionId}${intent.receipt.replayed ? " (original receipt replayed)" : ""}. Showing freshly read current content; Core is unchanged.`,
    );
  }
  async function perform(action: (record: CopyIntent | null) => Promise<void>) {
    if (busy.current || !journal.ready) return;
    busy.current = true;
    setPending(true);
    setError("");
    setMessage("");
    try {
      await withRecoveryCommandLock(key, journal.guard, async () => {
        const record = await readRecovery(
          key,
          copyRecoveryContract,
          journal.guard,
        );
        journal.install(record);
        if (record) assertIntent(record);
        await action(record);
      });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      if (
        !(
          cause instanceof CapiroApiError &&
          cause.code === "WORKSPACE_BRIEF_STATE_CONFLICT"
        )
      )
        journal.block(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "The Workspace result is unavailable.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function submit(proposed: CopyIntent) {
    await perform(async () => {
      await journal.verify();
      const retained = await reserveRecovery(
        key,
        proposed.command.body.requestId,
        copyIntentSchema.parse(proposed),
        copyRecoveryContract,
        journal.guard,
      );
      journal.install(retained);
      assertIntent(retained);
      if (retained.command.body.requestId !== proposed.command.body.requestId)
        throw new Error(
          "An earlier command is retained. Review it and retry only that exact command.",
        );
      if (retained.stateConflict)
        throw new Error(
          "This command was refused because the document changed. Review current content before preparing another save.",
        );
      if (retained.receipt) {
        await reconcile(retained);
        return;
      }
      let result;
      try {
        result = await submitCopyIntent(api, scope, retained, lifetime());
      } catch (cause) {
        if (
          cause instanceof CapiroApiError &&
          cause.code === "WORKSPACE_BRIEF_STATE_CONFLICT"
        )
          await persist({ ...retained, stateConflict: true });
        throw cause;
      }
      const confirmed = { ...retained, receipt: result };
      await persist(confirmed);
      await reconcile(confirmed);
    });
  }
  async function readCurrent() {
    await perform(async (record) => {
      try {
        await journal.verify();
      } catch (cause) {
        journal.block(cause);
        throw cause;
      }
      if (record?.receipt) {
        await reconcile(record);
        return;
      }
      const next = documentId
        ? await readCopyDocument(api, scope, documentId, source, lifetime())
        : { state: await readCopyState(api, scope, lifetime()) };
      setCurrent(next);
      setMessage(
        record
          ? "Current state read. This does not confirm the retained write; its exact command is still preserved."
          : "Current Workspace state read. Review before saving.",
      );
      if (!record) setGeneration((value) => value + 1);
    });
  }
  async function reviewConflict() {
    await perform(async (record) => {
      if (!record?.stateConflict || record.receipt)
        throw new Error(
          "Only an exact confirmed state-conflict refusal can be retired.",
        );
      await journal.verify();
      const fresh = documentId
        ? await readCopyDocument(api, scope, documentId, source, lifetime())
        : { state: await readCopyState(api, scope, lifetime()) };
      await retireRefusedRecovery(
        key,
        record.command.body.requestId,
        "WORKSPACE_BRIEF_STATE_CONFLICT",
        journal.guard,
      );
      journal.install(null);
      setCurrent(fresh);
      setRebased(record);
      setGeneration((value) => value + 1);
      setMessage(
        "The refused command is retired. Your proposed text is retained alongside a fresh baseline. Review it and explicitly save to create a new request; no write ran automatically.",
      );
    });
  }
  let mismatch: string | undefined;
  if (journal.record) {
    try {
      assertIntent(journal.record);
    } catch (cause) {
      mismatch =
        cause instanceof Error
          ? cause.message
          : "The retained copy association changed.";
    }
  }
  return {
    ready: journal.ready && !mismatch,
    recoveryError: journal.error ?? mismatch,
    retryRecovery: journal.retry,
    record: mismatch ? null : journal.record,
    rebased,
    pending,
    error,
    message,
    current,
    generation,
    submit,
    readCurrent,
    reviewConflict,
    retryExact: () =>
      journal.record ? submit(journal.record) : Promise.resolve(),
  };
}
