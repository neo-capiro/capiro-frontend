"use client";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import type { WorkspaceDraftDocument } from "../../../../shared/capiro/operations/workspace-documents";
import {
  assertManualSave,
  assertProspectDraft,
  type ManualDraftInput,
} from "./manual-draft";

type RetainedSave = { input: ManualDraftInput; uncertain: boolean };
export function useProspectDraftSave(
  draft: WorkspaceDraftDocument,
  onSaved: () => void,
) {
  const api = useCapiro();
  const cache = useQueryClient();
  const key = [
    "prospect-draft-save",
    draft.tenantId,
    draft.prospectId,
    draft.id,
  ];
  const retained = useQuery<RetainedSave | null>({
    queryKey: key,
    queryFn: async () => null,
    initialData: null,
    enabled: false,
    gcTime: Infinity,
  });
  const [baseline, setBaseline] = useState(draft.updatedAt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [readback, setReadback] = useState<WorkspaceDraftDocument>();
  const working = useRef(false);
  const scope = {
    id: draft.id,
    tenantId: draft.tenantId!,
    prospectId: draft.prospectId!,
  };
  async function save(input: ManualDraftInput) {
    if (working.current || cache.getQueryData<RetainedSave>(key)?.uncertain)
      return;
    working.current = true;
    setPending(true);
    setError("");
    setMessage("");
    cache.setQueryData(key, { input, uncertain: true });
    try {
      const current = await api.request("workspace.draft", {
        params: { id: draft.id },
      });
      assertProspectDraft(current, scope);
      if (current.updatedAt !== baseline)
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
      assertManualSave(updated, scope, input);
      const version = await api.request("workspace.draft.snapshot", {
        params: { draftId: draft.id },
        body: { label: "Manual save" },
      });
      if (version.draftId !== draft.id)
        throw new Error(
          "Content was saved but the version receipt belongs to another document. Read current state before another save.",
        );
      cache.setQueryData(key, null);
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The save was not confirmed.",
      );
    } finally {
      working.current = false;
      setPending(false);
    }
  }
  async function readCurrent() {
    if (working.current) return;
    working.current = true;
    setPending(true);
    setError("");
    try {
      const current = await api.request("workspace.draft", {
        params: { id: draft.id },
      });
      assertProspectDraft(current, scope);
      setBaseline(current.updatedAt);
      setReadback(current);
      const attempt = cache.getQueryData<RetainedSave>(key);
      if (attempt) cache.setQueryData(key, { ...attempt, uncertain: false });
      setMessage(
        `Current document read: ${current.docTitle}, updated ${current.updatedAt}. Your edits are retained. Review them before a deliberate save; content and version writes are separate operations.`,
      );
    } catch (cause) {
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
    retained: retained.data,
    pending,
    error,
    message,
    readback,
    save,
    readCurrent,
  };
}
