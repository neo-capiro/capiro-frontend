import type { WorkspaceDraftDocument } from "../../../../shared/capiro/operations/workspace-documents";

/**
 * Ordinary Workspace saved-export seam. Reuses the existing authorized
 * `workspace.draft` read and the existing `workspace.draft.pdf|docx` binary
 * operations. Nothing here writes, snapshots or restores: an export is served
 * from the current server-saved content, which may differ from unsaved editor
 * changes, and it is never labelled as a saved-history revision.
 */

export type OrdinaryExportFormat = "pdf" | "docx";
export type OrdinaryExportRequest = {
  format: OrdinaryExportFormat;
  part: string;
};
export type OrdinaryExportTab = { id: string; label: string };
export type OrdinaryExportScope = { id: string; clientId: string | null };
export type OrdinaryExportFile = { blob: Blob; filename: string };

export const ORDINARY_ALL_PART = "all";
export const ORDINARY_MAIN_PART = "main";

/**
 * Tabs are the current authorized draft's packet ADD-ON documents, identified by
 * exact id. The producer orders documents by ordinal ascending and treats the
 * first row as the draft's own (primary) content: its export service builds
 * `packetDocs = documents.slice(1)` and accepts an exact `part` id only from
 * those add-ons. Primary content is exported with `part=main`, never by its
 * document id, so the primary row is deliberately not offered here.
 */
export function ordinaryExportTabs(
  draft: WorkspaceDraftDocument,
): OrdinaryExportTab[] {
  return [...draft.documents]
    .sort((left, right) => left.ordinal - right.ordinal)
    .slice(1)
    .map((document) => ({
      id: document.id,
      label: document.name?.trim() || "Untitled tab",
    }));
}

export function ordinaryPartOptions(
  tabs: readonly OrdinaryExportTab[],
): { value: string; label: string }[] {
  return [
    { value: ORDINARY_ALL_PART, label: "All documents" },
    { value: ORDINARY_MAIN_PART, label: "Main sections only" },
    ...tabs.map((tab) => ({ value: tab.id, label: tab.label })),
  ];
}

/**
 * The fresh authorized read must still be this ordinary draft for the current
 * client association. A moved, held, foreign or prospect receipt is refused
 * before any export is requested.
 */
export function ordinaryScopeRefusal(
  current: WorkspaceDraftDocument,
  expected: OrdinaryExportScope,
): string {
  if (current.id.toLowerCase() !== expected.id.toLowerCase())
    return "The returned document does not match this link.";
  if (current.prospectId) return "This view exports ordinary documents only.";
  if (current.clientAssociation === "held")
    return "The returned document no longer matches this client scope.";
  if ((current.clientId ?? null) !== expected.clientId)
    return "The returned document no longer matches this client scope.";
  return "";
}

/** A chosen part must be all, main, or an exact id of the current draft's tabs. */
export function ordinaryPartRefusal(
  part: string,
  tabs: readonly OrdinaryExportTab[],
): string {
  if (part === ORDINARY_ALL_PART || part === ORDINARY_MAIN_PART) return "";
  return tabs.some((tab) => tab.id.toLowerCase() === part.toLowerCase())
    ? ""
    : "The selected saved tab is not part of this document.";
}

/**
 * Re-authorize the current saved content, validate the exact selected part,
 * then download through the existing binary client and hand the validated file
 * to `save`. Returns "" on success, a refusal/error message otherwise; a
 * cancelled (superseded or unmounted) request is silent and never saves.
 */
export async function runOrdinaryExport(input: {
  request: OrdinaryExportRequest;
  expected: OrdinaryExportScope;
  readCurrent: () => Promise<WorkspaceDraftDocument>;
  download: (request: OrdinaryExportRequest) => Promise<OrdinaryExportFile>;
  save: (file: OrdinaryExportFile) => void;
}): Promise<string> {
  try {
    const current = await input.readCurrent();
    const scopeRefusal = ordinaryScopeRefusal(current, input.expected);
    if (scopeRefusal) return scopeRefusal;
    const partRefusal = ordinaryPartRefusal(
      input.request.part,
      ordinaryExportTabs(current),
    );
    if (partRefusal) return partRefusal;
    const file = await input.download(input.request);
    input.save(file);
    return "";
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") return "";
    return cause instanceof Error ? cause.message : "Export unavailable.";
  }
}
