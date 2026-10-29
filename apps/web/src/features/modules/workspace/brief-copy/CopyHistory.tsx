"use client";
import { useState } from "react";
import { useCapiroQuery } from "@/shared/capiro/queries";
import { ActionButton, Modal, StatusPanel } from "@/shared/module-ui";
import type { BriefCopyDetail } from "@/shared/capiro/operations/workspace-brief-copy";
import { CopySavedVersion } from "./CopySavedVersion";
import { copyPresentInVersion } from "./saved-copy-version";
export function CopyHistory({ detail }: { detail: BriefCopyDetail }) {
  const draftId = detail.draftId;
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
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
          {!history.loading && !history.error && history.data?.length === 0 && (
            <p>No saved versions are available.</p>
          )}
          {open &&
            !mismatch &&
            !history.loading &&
            !history.error &&
            history.data?.map((version) => (
              <p key={version.id}>
                <ActionButton
                  disabled={!copyPresentInVersion(version, detail)}
                  onClick={() => setSelectedId(version.id)}
                  aria-pressed={selectedId === version.id}
                >
                  Inspect {version.label ?? "saved version"}
                </ActionButton>{" "}
                {version.label ?? "Saved version"} · {version.id} ·{" "}
                {new Date(version.createdAt).toLocaleString()}
              </p>
            ))}
          {open &&
            !mismatch &&
            !history.loading &&
            !history.error &&
            selectedId &&
            history.data?.some(
              (version) =>
                version.id === selectedId &&
                copyPresentInVersion(version, detail),
            ) && (
              <CopySavedVersion
                key={`${detail.tenantId}:${draftId}:${detail.document.id}:${selectedId}`}
                detail={detail}
                versionId={selectedId}
              />
            )}
        </StatusPanel>
        <p>
          Versions without this copied tab and its original source cannot be
          inspected here. Whole-draft restore is unavailable for a draft
          containing a copied Core brief.
        </p>
      </Modal>
    </>
  );
}
