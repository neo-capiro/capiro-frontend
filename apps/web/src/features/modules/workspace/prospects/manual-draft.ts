import type { WorkspaceDraftDocument } from "../../../../shared/capiro/operations/workspace-documents";
import { prospectWorkspaceDraft } from "../../../../shared/capiro/operations/workspace-prospects";

export type ManualDraftInput = {
  title: string;
  sections: Record<string, string>;
  names: string[];
};
export type ProspectDraftScope = {
  id: string;
  prospectId: string;
  tenantId: string;
};

export function assertProspectDraft(
  draft: WorkspaceDraftDocument,
  scope: ProspectDraftScope,
) {
  if (
    !prospectWorkspaceDraft.safeParse(draft).success ||
    draft.id !== scope.id ||
    draft.prospectId !== scope.prospectId ||
    draft.tenantId !== scope.tenantId
  )
    throw new Error(
      "The document receipt does not match this prospect, tenant and draft.",
    );
}

export function manualDraftInput(
  draft: WorkspaceDraftDocument,
): ManualDraftInput {
  const blocks = draft.documents
    .filter((document) => !document.sourceBriefVersion)
    .flatMap((document) => document.body.blocks ?? [])
    .filter((block) => block.type === "section" && block.title);
  const names = draft.config.sections?.length
    ? draft.config.sections
    : blocks.map((block) => block.title!);
  return {
    title: draft.docTitle,
    names: names.length
      ? [...new Set(names)]
      : draft.prospectId
        ? ["Body"]
        : [],
    sections: {
      ...Object.fromEntries(
        blocks.map((block) => [block.title!, block.content ?? ""]),
      ),
      ...draft.config.sectionContent,
    },
  };
}

export function assertManualSave(
  draft: WorkspaceDraftDocument,
  scope: ProspectDraftScope,
  input: ManualDraftInput,
) {
  assertProspectDraft(draft, scope);
  if (
    draft.docTitle !== input.title ||
    JSON.stringify(draft.config.sections) !== JSON.stringify(input.names) ||
    Object.keys(input.sections).some(
      (name) => draft.config.sectionContent?.[name] !== input.sections[name],
    )
  )
    throw new Error(
      "The edited title or content was not confirmed. Read the current document before another save.",
    );
}
