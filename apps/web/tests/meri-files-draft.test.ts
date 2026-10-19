import { describe, expect, it } from "vitest";
import {
  documentContent,
  draftProblem,
} from "../src/features/meri/files/document-draft";

describe("explicit Word text intent", () => {
  it("preserves TXT whitespace, Unicode and literal markup", () => {
    const body = "  héllo <b>literal</b>\r\n\r\nlast\tline\n";
    expect(documentContent({ format: "txt", title: "Minutes", body })).toEqual({
      operation: "create_word",
      format: "txt",
      title: "Minutes",
      content: { text: body },
    });
  });

  it("retains blank lines and text order as normal DOCX paragraphs", () => {
    expect(
      documentContent({
        format: "docx",
        title: "Complete replacement",
        body: "First\r\n\r\n  Last <script>literal</script>\n",
      }),
    ).toEqual({
      operation: "create_word",
      format: "docx",
      title: "Complete replacement",
      content: {
        blocks: [
          { kind: "paragraph", runs: [{ text: "First" }], style: "Normal" },
          { kind: "paragraph", runs: [{ text: "" }], style: "Normal" },
          {
            kind: "paragraph",
            runs: [{ text: "  Last <script>literal</script>" }],
            style: "Normal",
          },
          { kind: "paragraph", runs: [{ text: "" }], style: "Normal" },
        ],
      },
    });
  });

  it("does not silently truncate an oversized replacement", () => {
    const draft = {
      format: "docx" as const,
      title: "Report",
      body: "a\n".repeat(1000),
    };
    expect(draftProblem(draft)).toContain("1,000 paragraphs");
    expect(() => documentContent(draft)).toThrow("1,000 paragraphs");
    expect(draft.body).toHaveLength(2000);
  });

  it("allows an explicitly empty document but requires a title", () => {
    expect(
      draftProblem({ format: "txt", title: "Blank", body: "" }),
    ).toBeNull();
    expect(draftProblem({ format: "txt", title: "  ", body: "Body" })).toBe(
      "Enter a document title.",
    );
  });

  it("takes a detached submission snapshot without changing editor input", () => {
    const draft = {
      format: "txt" as const,
      title: "Original",
      body: "Original body",
    };
    const content = documentContent(draft);
    draft.title = "Later title";
    draft.body = "Later body";
    expect(content).toEqual({
      operation: "create_word",
      format: "txt",
      title: "Original",
      content: { text: "Original body" },
    });
  });
});

it("admits both explicit Word forms through the exact published request receiver", async () => {
  const { receiveDocumentRequest } =
    await import("@capiro/meri-contracts/document-application");
  for (const format of ["docx", "txt"] as const) {
    const content = documentContent({
      title: "Word intent",
      format,
      body: "First\n\nLast",
    });
    const admitted = receiveDocumentRequest(
      "create",
      new TextEncoder().encode(
        JSON.stringify({
          deliveryId: "synthetic-editor-control",
          request: content,
        }),
      ),
    );
    expect(admitted.request).toEqual(content);
  }
});
