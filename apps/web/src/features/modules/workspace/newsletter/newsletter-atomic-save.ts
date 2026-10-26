import {
  newsletterBody,
  newsletterSaveBody,
  type NewsletterBody,
  type WorkspaceDraftDocument,
} from "@/shared/capiro/operations/workspace-documents";
import type { OrdinarySaveModel } from "../ordinary-save/ordinary-save";
import type { useOrdinaryDraftSave } from "../ordinary-save/useOrdinaryDraftSave";
import { newsletterDocumentBlocks } from "./newsletter-model";

export type NewsletterInput = {
  title: string;
  documentId: string;
  body: NewsletterBody;
};
export type NewsletterSave = ReturnType<
  typeof useOrdinaryDraftSave<NewsletterInput>
>;

export function newsletterInput(
  draft: WorkspaceDraftDocument,
): NewsletterInput {
  const documents = draft.documents.filter(
    (document) => !document.sourceBriefVersion && document.body.newsletter,
  );
  if (draft.product !== "Newsletter" || documents.length !== 1)
    throw new Error(
      "This saved draft does not have one supported primary newsletter document. Its stored content has not been changed.",
    );
  return {
    title: draft.docTitle,
    documentId: documents[0]!.id,
    body: newsletterBody.parse(documents[0]!.body.newsletter),
  };
}

export const newsletterSaveModel: OrdinarySaveModel<NewsletterInput> = {
  input: (state) => newsletterInput(state.draft),
  retained: (record) => {
    if (record.body.label !== "Newsletter revision")
      throw new Error("The retained request belongs to a different editor.");
    const document = record.body.documents[0]!;
    return {
      title: record.body.draft.docTitle,
      documentId: document.id,
      body: document.body.newsletter,
    };
  },
  capture: (state, input, requestId) => {
    const previous = newsletterInput(state.draft);
    if (input.documentId !== previous.documentId)
      throw new Error(
        "The primary newsletter document changed. Read and review current content before saving.",
      );
    const document = state.draft.documents.find(
      (value) => value.id === input.documentId,
    )!;
    const blocks = document.body.blocks ?? [];
    const expected = newsletterDocumentBlocks(previous.body);
    if (
      blocks.length &&
      (blocks.length !== expected.length ||
        blocks.some((block, index) => {
          const projected = expected[index];
          return (
            !projected ||
            block.id !== projected.id ||
            block.type !== projected.type ||
            (block.title ?? "") !== projected.title ||
            (block.content ?? "") !== projected.content
          );
        }))
    )
      throw new Error(
        "The saved body contains content outside this newsletter editor. It cannot be replaced by the supported newsletter projection.",
      );
    // Optional editor fields can be undefined. Capture the exact JSON sent to
    // Core and retained by the journal, so replay compares the same bytes/data.
    const body = newsletterBody.parse(JSON.parse(JSON.stringify(input.body)));
    return {
      names: [],
      body: newsletterSaveBody.parse({
        requestId,
        expectedStateHash: state.stateHash,
        expectedClientId: state.clientId,
        label: "Newsletter revision",
        draft: { docTitle: input.title },
        documents: [
          {
            id: input.documentId,
            name: input.title,
            body: {
              ...document.body,
              blocks: newsletterDocumentBlocks(body).map((block) => ({
                ...blocks.find((previous) => previous.id === block.id),
                ...block,
              })),
              newsletter: body,
            },
          },
        ],
      }),
    };
  },
};

export function newsletterMatchesSaved(save: NewsletterSave) {
  if (!save.ready || save.frozen || !save.input || !save.currentDraft)
    return false;
  const current = newsletterInput(save.currentDraft);
  return (
    current.title === save.input.title &&
    current.documentId === save.input.documentId &&
    JSON.stringify(current.body) === JSON.stringify(save.input.body)
  );
}
