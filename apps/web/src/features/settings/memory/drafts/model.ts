import type {
  MemoryDraftFile,
  MemoryDraftRead,
  MemoryDraftSave,
} from "@capiro/shared/settings-memory-drafts";
export type DraftSelection = { id: string; fresh: boolean };
export function editableDraft(
  file: MemoryDraftFile,
  id: string,
  read?: MemoryDraftRead,
) {
  return {
    id,
    revision: read?.revision ?? 0,
    baseItemId: read ? read.baseItemId : file.baseItemId,
    baseVersion: read ? read.baseVersion : file.baseVersion,
    sections: read
      ? (read.sections ?? [])
      : file.sections
          .filter((s) => s.owner === "human")
          .map(({ key, body }) => ({ key, body })),
    state: read?.state ?? "draft",
    legalHold: read?.legalHold ?? false,
    expiresAt: read?.expiresAt ?? null,
    baseChanged:
      !!read &&
      (read.baseChanged ||
        read.baseItemId !== file.baseItemId ||
        read.baseVersion !== file.baseVersion),
  };
}
export type EditableDraft = ReturnType<typeof editableDraft>;
export function draftSaveRequest(
  draft: EditableDraft,
  sections: MemoryDraftSave["sections"],
  action: "save" | "discard",
): MemoryDraftSave {
  return {
    requestId: crypto.randomUUID(),
    expectedRevision: draft.revision,
    action,
    baseItemId: draft.baseItemId,
    baseVersion: draft.baseVersion,
    sections: action === "discard" ? [] : sections,
  };
}
export function draftBelongsToFile(
  read: MemoryDraftRead,
  file: MemoryDraftFile,
  id: string,
  userId: string,
) {
  return (
    read.id === id &&
    read.type === file.type &&
    read.slug === (file.scope === "user" ? userId : file.slug)
  );
}
