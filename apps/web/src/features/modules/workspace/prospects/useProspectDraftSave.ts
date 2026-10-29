"use client";
import { useRef, useState } from "react";
import { CapiroApiError } from "@/shared/capiro/http";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import type { WorkspaceDraftDocument } from "@/shared/capiro/operations/workspace-documents";
import type { ProspectAtomicState } from "@/shared/capiro/operations/workspace-prospect-save";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import {
  acknowledgeRecovery,
  reserveRecovery,
  updateRecovery,
  RecoveryStorageError,
} from "@/shared/session/recovery/journal";
import type { ManualDraftInput } from "./manual-draft";
import {
  prospectIntentScope,
  verifyProspectWriter,
  type ProspectWriter,
} from "./recovery-authority";
import {
  bindProspectState,
  bindProspectSave,
  prospectRequest,
  prospectSaveRecoveryContract,
  type ProspectSaveRecovery,
} from "./atomic-save";

export function useProspectDraftSave(
  draft: WorkspaceDraftDocument,
  actor: ProspectWriter,
  onSaved: () => void,
) {
  const api = useCapiro();
  const scope = {
    id: draft.id,
    tenantId: draft.tenantId!,
    prospectId: draft.prospectId!,
  };
  // Retain the existing key so interrupted legacy edits remain recoverable.
  const key = prospectIntentScope(
    "prospect-draft-save",
    actor,
    scope.prospectId,
    scope.id,
  );
  const [current, setCurrent] = useState<ProspectAtomicState>();
  const baseline = useRef<string | undefined>(undefined);
  const [reviewed, setReviewed] = useState<string>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [readback, setReadback] = useState<WorkspaceDraftDocument>();
  const working = useRef(false);
  async function read(signal?: AbortSignal) {
    return bindProspectState(
      await api.request(
        "workspace.prospect.state",
        {
          params: { id: scope.id },
          query: { prospectId: scope.prospectId },
        },
        { signal },
      ),
      scope,
    );
  }
  const journal = useRetainedIntent(
    key,
    prospectSaveRecoveryContract,
    async (signal, guard) => {
      await verifyProspectWriter(api, actor, signal, guard);
      const state = await read(signal);
      guard();
      if (!baseline.current) baseline.current = state.stateHash;
      setCurrent((previous) => previous ?? state);
    },
  );
  const record = journal.record;
  const retained = record
    ? { ...record, uncertain: reviewed !== record.requestId }
    : null;
  const copied = Boolean(
    current?.draft.documents.some((document) => document.sourceBriefVersion),
  );

  async function attempt(work: () => Promise<void>) {
    if (working.current || !journal.ready) return;
    working.current = true;
    setPending(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      if (
        cause instanceof RecoveryStorageError ||
        (cause instanceof CapiroApiError &&
          [401, 403, 404].includes(cause.status))
      )
        journal.block(cause);
      setError(
        cause instanceof Error ? cause.message : "The save was not confirmed.",
      );
    } finally {
      working.current = false;
      setPending(false);
    }
  }
  async function submit(next: ProspectSaveRecovery) {
    const original = await reserveRecovery(
      key,
      next.requestId,
      next,
      prospectSaveRecoveryContract,
      journal.guard,
    );
    journal.install(original);
    setReviewed(undefined);
    if (original.requestId !== next.requestId)
      throw new Error(
        "Another view retained a save. Recover that original request before creating a new version.",
      );
    await journal.verify();
    const body = prospectRequest(original, scope.prospectId);
    try {
      const result = await api.request(
        "workspace.prospect.save",
        { params: { id: scope.id }, body },
        { signal: journal.signal() },
      );
      journal.guard();
      const saved = await bindProspectSave(result, scope, actor.ownerId, body);
      journal.guard();
      const latest = await read(journal.signal());
      journal.guard();
      await acknowledgeRecovery(key, next.requestId, journal.guard);
      journal.install(null);
      baseline.current = latest.stateHash;
      setCurrent(latest);
      setReadback(latest.draft);
      setMessage(
        `Saved version ${saved.receipt.versionId}. Content and version history were saved together.`,
      );
      onSaved();
    } catch (cause) {
      if (
        cause instanceof CapiroApiError &&
        cause.code === "WORKSPACE_SAVE_STATE_CONFLICT"
      ) {
        const conflict = { ...original, conflict: true as const };
        await updateRecovery(
          key,
          original.requestId,
          conflict,
          prospectSaveRecoveryContract,
          journal.guard,
        );
        journal.install(conflict);
        throw new Error(
          "The document changed. Read the current document, compare your retained edits, then save a new version.",
        );
      }
      throw cause;
    }
  }
  const save = (input: ManualDraftInput) =>
    attempt(async () => {
      if (copied)
        throw new Error("Use the copied-document editor for this draft.");
      if (!baseline.current)
        throw new Error("Read the current document before saving.");
      if (record) {
        if (
          reviewed !== record.requestId ||
          (record.atomicVersion === 1 && !record.conflict)
        )
          throw new Error(
            "Recover the original save before creating a new version.",
          );
        // Only a definite no-write conflict or explicitly reviewed legacy flow
        // can be replaced. An unknown atomic outcome always keeps its request.
        await journal.verify();
        await acknowledgeRecovery(key, record.requestId, journal.guard);
        journal.install(null);
      }
      await submit({
        requestId: crypto.randomUUID(),
        baseline: baseline.current,
        atomicVersion: 1,
        input: {
          ...input,
          sections: Object.fromEntries(
            input.names.map((name) => [name, input.sections[name] ?? ""]),
          ),
        },
      });
    });
  const recover = () =>
    attempt(async () => {
      if (!record || record.atomicVersion !== 1 || record.conflict) return;
      await submit(record);
    });
  const readCurrent = () =>
    attempt(async () => {
      await journal.verify();
      const latest = await read(journal.signal());
      journal.guard();
      setReadback(latest.draft);
      if (!record || record.conflict || record.atomicVersion !== 1) {
        baseline.current = latest.stateHash;
        if (record) setReviewed(record.requestId);
        setMessage(
          record?.atomicVersion !== 1 && record
            ? "Legacy edits are retained. Compare them with the current saved content; Save draft will create a new atomic version."
            : "Current saved content loaded. Compare it with your retained edits before saving a new version.",
        );
      } else
        setMessage(
          "The original save is still unconfirmed. Recover original save to reconcile its exact result.",
        );
    });
  return {
    retained,
    pending,
    error,
    message,
    readback,
    save,
    recover,
    readCurrent,
    currentDraft: current?.draft ?? draft,
    canSave:
      journal.ready &&
      !pending &&
      !copied &&
      (!record || reviewed === record.requestId),
    canRecover:
      journal.ready &&
      !pending &&
      record?.atomicVersion === 1 &&
      !record.conflict,
    ready: journal.ready,
    recoveryError: journal.error,
    retry: journal.retry,
  };
}
