import type { DocumentContentRequest } from "@capiro/meri-contracts/document-application";

/** Local editor state, not a transport contract or authority decision. */
export type DocumentDraft = Readonly<{
  title: string;
  format: "docx" | "txt";
  body: string;
}>;

export const emptyDocumentDraft = (): DocumentDraft => ({
  title: "",
  format: "docx",
  body: "",
});

/** Form guidance only; the canonical receiver still validates every submitted request. */
export function draftProblem(draft: DocumentDraft): string | null {
  if (!draft.title.trim()) return "Enter a document title.";
  if (draft.title.length > 200)
    return "Use a title of 200 characters or fewer.";
  if (draft.body.length > 100_000)
    return "This text editor accepts up to 100,000 characters.";
  if (draft.format === "docx" && draft.body.split(/\r\n|\r|\n/).length > 1000)
    return "DOCX text supports up to 1,000 paragraphs. Each line becomes a paragraph.";
  return null;
}

/** Map explicit text input to the published Word subset without HTML interpretation. */
export function documentContent(draft: DocumentDraft): DocumentContentRequest {
  const problem = draftProblem(draft);
  if (problem) throw new Error(problem);
  if (draft.format === "txt") {
    return {
      operation: "create_word",
      format: "txt",
      title: draft.title,
      content: { text: draft.body },
    };
  }
  const paragraphs = draft.body.split(/\r\n|\r|\n/).map((text) => ({
    kind: "paragraph" as const,
    runs: [{ text }] as [{ text: string }],
    style: "Normal" as const,
  }));
  const [first, ...rest] = paragraphs;
  // String.split always supplies at least one paragraph, including an empty body.
  return {
    operation: "create_word",
    format: "docx",
    title: draft.title,
    content: { blocks: [first!, ...rest] },
  };
}
