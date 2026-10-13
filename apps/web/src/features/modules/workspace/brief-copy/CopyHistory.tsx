"use client";
import { useState } from "react";
import { useCapiroQuery } from "@/shared/capiro/queries";
import { ActionButton, Modal, StatusPanel } from "@/shared/module-ui";
export function CopyHistory({ draftId }: { draftId: string }) {
  const [open, setOpen] = useState(false);
  const history = useCapiroQuery(
    "workspace.draft.versions",
    { params: { draftId } },
    { enabled: open },
  );
  const mismatch = history.data?.some((version) => version.draftId !== draftId);
  return (
    <>
      <ActionButton onClick={() => setOpen(true)}>
        Workspace draft history
      </ActionButton>
      <Modal title="Workspace draft history" open={open} onOpenChange={setOpen}>
        <p>
          Saved versions cover the whole Workspace draft. An atomic copied-tab
          receipt identifies its saved version by request ID. Core history is
          separate.
        </p>
        <StatusPanel
          loading={history.loading}
          error={
            history.error ??
            (mismatch
              ? new Error("History belongs to a different draft.")
              : undefined)
          }
          onRetry={history.reload}
        >
          {!mismatch &&
            history.data?.map((version) => (
              <p key={version.id}>
                {version.label ?? "Saved version"} · {version.id} ·{" "}
                {new Date(version.createdAt).toLocaleString()}
              </p>
            ))}
        </StatusPanel>
        <p>
          Whole-draft restore is unavailable for a draft containing a copied
          Core brief.
        </p>
      </Modal>
    </>
  );
}
