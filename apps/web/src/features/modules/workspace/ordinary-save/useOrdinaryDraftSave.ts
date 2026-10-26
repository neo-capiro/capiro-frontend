"use client";

import { useEffect, useRef, useState } from "react";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import { CapiroApiError } from "@/shared/capiro/http";
import type { OrdinaryDraftState } from "@/shared/capiro/operations/workspace-documents";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  updateRecovery,
  withRecoveryCommandLock,
  RecoveryStorageError,
  retireOrdinarySaveConflictRecovery,
} from "@/shared/session/recovery/journal";
import type { ManualDraftInput } from "../prospects/manual-draft";
import {
  bindOrdinaryReceipt,
  bindOrdinaryState,
  captureOrdinarySave,
  ordinaryInput,
  ordinaryRecoveryContract,
  ordinaryRecoveryScope,
  OrdinaryScopeError,
  retainedOrdinaryInput,
  sameOrdinaryRequest,
  type OrdinaryRetained,
  type OrdinarySaveScope,
} from "./ordinary-save";

type Editor = {
  input: ManualDraftInput;
  baseline: OrdinaryDraftState;
  readback?: OrdinaryDraftState;
  needsReview: boolean;
};

/** Core owns authorization/CAS; this hook owns only the captured browser edit
 * and composes the existing durable journal and disposable request lifetime. */
export function useOrdinaryDraftSave(
  scope: OrdinarySaveScope,
  carriedInput?: ManualDraftInput,
) {
  const api = useCapiro();
  const key = ordinaryRecoveryScope(scope);
  const verifiedCurrent = useRef<OrdinaryDraftState | null>(null);
  const journal = useRetainedIntent(
    key,
    ordinaryRecoveryContract,
    async (signal, guard) => {
      const me = await api.request("me.read", {}, { signal });
      guard();
      if (
        me.tenant.id !== scope.tenantId ||
        me.user.id !== scope.userId ||
        me.user.clerkUserId !== scope.actorId
      )
        throw new OrdinaryScopeError();
      const current = await api.request(
        "workspace.draft.state",
        { params: { id: scope.draftId } },
        { signal },
      );
      guard();
      verifiedCurrent.current = bindOrdinaryState(current, scope);
    },
  );
  const [editor, setEditor] = useState<Editor>();
  const retryEditor = useRef<Editor | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const working = useRef(false);

  useEffect(() => {
    if (!journal.ready || editor || !verifiedCurrent.current) return;
    const current = verifiedCurrent.current;
    const retained = journal.record;
    void (async () => {
      try {
        if (
          retained?.body.expectedClientId !== undefined &&
          retained.body.expectedClientId !== scope.clientId
        )
          throw new OrdinaryScopeError();
        if (retained?.outcome?.kind === "saved")
          await bindOrdinaryReceipt(
            retained.outcome.response,
            scope,
            retained.body,
          );
        journal.guard();
        setEditor(
          retained
            ? {
                baseline: current,
                input: retainedOrdinaryInput(retained),
                needsReview: false,
              }
            : (retryEditor.current ?? {
                baseline: current,
                input: carriedInput ?? ordinaryInput(current),
                needsReview: Boolean(carriedInput),
                ...(carriedInput ? { readback: current } : {}),
              }),
        );
        retryEditor.current = undefined;
      } catch (cause) {
        journal.block(cause);
      }
    })();
  }, [journal, editor, scope, carriedInput]);

  function fail(cause: unknown) {
    if (cause instanceof DOMException && cause.name === "AbortError") return;
    try {
      journal.guard();
    } catch {
      return;
    }
    if (
      cause instanceof OrdinaryScopeError ||
      cause instanceof RecoveryStorageError ||
      (cause instanceof CapiroApiError &&
        [401, 403, 404].includes(cause.status))
    )
      journal.block(cause);
    setError(
      cause instanceof Error ? cause.message : "The save is not confirmed.",
    );
  }
  async function action(run: () => Promise<void>) {
    if (working.current || !journal.ready || !editor) return;
    working.current = true;
    setPending(true);
    setError("");
    setMessage("");
    try {
      await withRecoveryCommandLock(key, journal.guard, run);
    } catch (cause) {
      fail(cause);
    } finally {
      working.current = false;
      try {
        journal.guard();
        setPending(false);
      } catch {
        /* Scope was disposed. */
      }
    }
  }
  async function refreshCurrent() {
    // Verification reads current access/state, but never advances the editor's
    // baseline. Only initial hydration or an explicit resolution can do that.
    await journal.verify();
    journal.guard();
    return verifiedCurrent.current!;
  }
  async function reconcile(
    record: OrdinaryRetained,
    current: OrdinaryDraftState,
  ) {
    setEditor((value) => value && { ...value, readback: current });
    if (record.outcome?.kind !== "saved") return;
    const result = await bindOrdinaryReceipt(
      record.outcome.response,
      scope,
      record.body,
    );
    journal.guard();
    if (result.receipt.stateHash !== current.stateHash) {
      setMessage(
        "This request has a saved version. Current saved content has changed since that version; review it before adopting or rebasing your retained edits.",
      );
      return;
    }
    await acknowledgeRecovery(key, record.body.requestId, journal.guard);
    journal.install(null);
    setEditor(
      (value) =>
        value && {
          ...value,
          baseline: current,
          readback: undefined,
          needsReview: false,
        },
    );
    setMessage(
      "Saved. The immutable version and current saved content are confirmed.",
    );
  }
  async function dispatch(original: OrdinaryRetained) {
    await refreshCurrent();
    let response;
    try {
      response = await api.request(
        "workspace.draft.save",
        {
          params: { id: scope.draftId },
          body: original.body,
        },
        { signal: journal.signal() },
      );
    } catch (cause) {
      journal.guard();
      // This code is emitted only after current access/client/prior-request
      // checks and before the producer writes. Other409s cannot settle a save.
      if (
        cause instanceof CapiroApiError &&
        cause.status === 409 &&
        cause.code === "WORKSPACE_SAVE_STATE_CONFLICT"
      ) {
        const refused: OrdinaryRetained = {
          ...original,
          outcome: { kind: "conflict" },
        };
        await updateRecovery(
          key,
          original.body.requestId,
          refused,
          ordinaryRecoveryContract,
          journal.guard,
        );
        journal.install(refused);
        setError(
          "The saved document changed. Your edits are retained. Read current saved content, then deliberately adopt or rebase.",
        );
        return;
      }
      throw cause;
    }
    journal.guard();
    const bound = await bindOrdinaryReceipt(response, scope, original.body);
    journal.guard();
    const confirmed: OrdinaryRetained = {
      ...original,
      outcome: { kind: "saved", response: bound },
    };
    await updateRecovery(
      key,
      original.body.requestId,
      confirmed,
      ordinaryRecoveryContract,
      journal.guard,
    );
    journal.install(confirmed);
    await reconcile(confirmed, await refreshCurrent());
  }
  async function save() {
    if (
      !editor ||
      journal.record ||
      editor.needsReview ||
      editor.baseline.draft.clientAssociation === "held"
    )
      return;
    const captured = structuredClone(editor.input);
    await action(async () => {
      const original: OrdinaryRetained = {
        body: captureOrdinarySave(
          editor.baseline,
          captured,
          crypto.randomUUID(),
        ),
        names: captured.names,
      };
      const retained = await reserveRecovery(
        key,
        original.body.requestId,
        original,
        ordinaryRecoveryContract,
        journal.guard,
      );
      journal.install(retained);
      if (!sameOrdinaryRequest(retained, original))
        throw new RecoveryStorageError();
      await dispatch(retained);
    });
  }
  async function replay() {
    const expected = journal.record;
    if (!expected || expected.outcome) return;
    await action(async () => {
      const original = await readRecovery(
        key,
        ordinaryRecoveryContract,
        journal.guard,
      );
      if (!original || !sameOrdinaryRequest(original, expected))
        throw new RecoveryStorageError();
      journal.install(original);
      if (original.outcome) {
        await reconcile(original, await refreshCurrent());
        return;
      }
      await dispatch(original);
    });
  }
  async function readCurrent() {
    await action(async () => {
      const current = await refreshCurrent();
      const retained = await readRecovery(
        key,
        ordinaryRecoveryContract,
        journal.guard,
      );
      if (
        retained &&
        (!journal.record || !sameOrdinaryRequest(retained, journal.record))
      )
        throw new RecoveryStorageError();
      journal.install(retained);
      setEditor((value) => value && { ...value, readback: current });
      if (retained) await reconcile(retained, current);
      else
        setMessage(
          "Current saved content loaded separately. Your editor baseline and edits have not changed.",
        );
    });
  }
  async function resolve(choice: "adopt" | "rebase") {
    const reviewed = editor?.readback;
    if (!reviewed || (journal.record && !journal.record.outcome)) return;
    await action(async () => {
      const current = await refreshCurrent();
      if (current.stateHash !== reviewed.stateHash)
        throw new Error(
          "Saved content changed again. Read and review it before adopting or rebasing.",
        );
      const retained = await readRecovery(
        key,
        ordinaryRecoveryContract,
        journal.guard,
      );
      if (
        retained &&
        (!journal.record ||
          !sameOrdinaryRequest(retained, journal.record) ||
          !retained.outcome)
      )
        throw new RecoveryStorageError();
      if (retained?.outcome?.kind === "saved") {
        await bindOrdinaryReceipt(
          retained.outcome.response,
          scope,
          retained.body,
        );
        journal.guard();
        await acknowledgeRecovery(key, retained.body.requestId, journal.guard);
      } else if (retained?.outcome?.kind === "conflict") {
        await retireOrdinarySaveConflictRecovery(
          key,
          retained.body.requestId,
          ordinaryRecoveryContract,
          journal.guard,
        );
      }
      journal.install(null);
      setEditor(
        (value) =>
          value && {
            input: choice === "adopt" ? ordinaryInput(current) : value.input,
            baseline: current,
            needsReview: false,
          },
      );
      setMessage(
        choice === "adopt"
          ? "Current saved content adopted."
          : "Retained edits rebased. Review them, then save deliberately.",
      );
    });
  }
  const ready = journal.ready && Boolean(editor);
  const frozen =
    pending || Boolean(journal.record) || Boolean(editor?.needsReview);
  return {
    ready,
    pending,
    error,
    message,
    recoveryError: journal.error,
    retryRecovery: () => {
      // A failed reservation may have sent nothing and retained no journal row.
      // Keep those local edits and their old baseline while rechecking storage.
      retryEditor.current = editor ?? retryEditor.current;
      setEditor(undefined);
      setError("");
      setMessage("");
      journal.retry();
    },
    input: ready ? editor!.input : undefined,
    currentDraft: ready ? editor!.baseline.draft : undefined,
    readback: ready ? editor!.readback : undefined,
    retained: ready ? journal.record : null,
    frozen,
    canSave:
      ready && !frozen && editor!.baseline.draft.clientAssociation !== "held",
    canResolve:
      ready &&
      Boolean(editor!.readback) &&
      (!journal.record || Boolean(journal.record.outcome)),
    setInput: (input: ManualDraftInput) => {
      if (!ready || frozen || working.current) return;
      setEditor((value) => value && { ...value, input });
      setMessage("");
    },
    save,
    replay,
    readCurrent,
    resolve,
  };
}
