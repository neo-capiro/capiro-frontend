"use client";
import { useRef, useState } from "react";
import { z } from "zod";
import { CapiroApiError } from "../../../../shared/capiro/http";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import type { WorkspaceDraftDocument } from "../../../../shared/capiro/operations/workspace-documents";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import {
  acknowledgeRecovery,
  reserveRecovery,
  updateRecovery,
  RecoveryStorageError,
} from "@/shared/session/recovery/journal";
import {
  assertManualSave,
  assertProspectDraft,
  type ManualDraftInput,
} from "./manual-draft";
import {
  prospectIntentScope,
  verifyProspectWriter,
  type ProspectWriter,
} from "./recovery-authority";

const retainedSaveSchema = z
  .object({
    requestId: z.uuid(),
    baseline: z.string(),
    input: z
      .object({
        title: z.string().min(1).max(500),
        names: z.array(z.string()),
        sections: z.record(z.string(), z.string()),
      })
      .strict(),
  })
  .strict();
type RetainedSave = z.infer<typeof retainedSaveSchema>;
const recoveryContract = {
  schema: retainedSaveSchema,
  requestId: (value: RetainedSave) => value.requestId,
};
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
  const key = prospectIntentScope(
    "prospect-draft-save",
    actor,
    scope.prospectId,
    scope.id,
  );
  const journal = useRetainedIntent(
    key,
    recoveryContract,
    async (signal, guard) => {
      await verifyProspectWriter(api, actor, signal, guard);
      const current = await api.request(
        "workspace.draft",
        { params: { id: draft.id } },
        { signal },
      );
      guard();
      assertProspectDraft(current, scope);
    },
  );
  const [reviewed, setReviewed] = useState<{
    requestId: string;
    baseline: string;
  }>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [readback, setReadback] = useState<WorkspaceDraftDocument>();
  const working = useRef(false);
  const retained = journal.record
    ? {
        ...journal.record,
        uncertain: reviewed?.requestId !== journal.record.requestId,
      }
    : null;
  async function save(input: ManualDraftInput) {
    if (working.current || !journal.ready || retained?.uncertain) return;
    working.current = true;
    setPending(true);
    setError("");
    setMessage("");
    let verified = false;
    try {
      const next = retainedSaveSchema.parse({
        requestId: retained?.requestId ?? crypto.randomUUID(),
        input,
        baseline: reviewed?.baseline ?? draft.updatedAt,
      });
      const original = await reserveRecovery(
        key,
        next.requestId,
        next,
        recoveryContract,
        journal.guard,
      );
      if (original.requestId !== next.requestId) {
        journal.install(original);
        throw new Error(
          "Another view retained an unknown save. Read current state before saving again.",
        );
      }
      await updateRecovery(
        key,
        next.requestId,
        next,
        recoveryContract,
        journal.guard,
      );
      journal.install(next);
      setReviewed(undefined);
      await journal.verify();
      verified = true;
      const current = await api.request("workspace.draft", {
        params: { id: draft.id },
      });
      journal.guard();
      assertProspectDraft(current, scope);
      if (current.updatedAt !== next.baseline)
        throw new Error(
          "The document changed since this editor opened. Read the current document before saving your retained edits.",
        );
      const updated = await api.request("workspace.draft.update", {
        params: { id: draft.id },
        body: {
          docTitle: input.title,
          config: { sections: input.names, sectionContent: input.sections },
        },
      });
      journal.guard();
      assertManualSave(updated, scope, input);
      const version = await api.request("workspace.draft.snapshot", {
        params: { draftId: draft.id },
        body: { label: "Manual save" },
      });
      journal.guard();
      if (version.draftId !== draft.id)
        throw new Error(
          "Content was saved but the version receipt belongs to another document. Read current state before another save.",
        );
      await acknowledgeRecovery(key, next.requestId, journal.guard);
      journal.install(null);
      onSaved();
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      if (
        !verified ||
        cause instanceof RecoveryStorageError ||
        (cause instanceof CapiroApiError && [401, 403].includes(cause.status))
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
  async function readCurrent() {
    if (working.current || !journal.ready) return;
    working.current = true;
    setPending(true);
    setError("");
    let verified = false;
    try {
      await journal.verify();
      verified = true;
      const current = await api.request("workspace.draft", {
        params: { id: draft.id },
      });
      journal.guard();
      assertProspectDraft(current, scope);
      setReadback(current);
      if (journal.record)
        setReviewed({
          requestId: journal.record.requestId,
          baseline: current.updatedAt,
        });
      setMessage(
        `Current document read: ${current.docTitle}, updated ${current.updatedAt}. Your edits are retained. Review them before a deliberate save; content and version writes are separate operations.`,
      );
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      if (
        !verified ||
        (cause instanceof CapiroApiError && [401, 403].includes(cause.status))
      )
        journal.block(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Current document unavailable.",
      );
    } finally {
      working.current = false;
      setPending(false);
    }
  }
  return {
    retained,
    pending,
    error,
    message,
    readback,
    save,
    readCurrent,
    ready: journal.ready,
    recoveryError: journal.error,
    retry: journal.retry,
  };
}
