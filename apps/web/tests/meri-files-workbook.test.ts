import { describe, expect, it } from "vitest";
import {
  workbookContent,
  workbookExample,
  workbookProblem,
} from "../src/features/meri/files/workbook-draft";

describe("typed workbook input intent", () => {
  it("preserves literals, formulas and typed cells without interpreting strings", () => {
    const sheets = [
      {
        name: "Facts",
        rows: [
          [
            { value: "=SUM(A2:A3)" },
            { formula: "SUM(A2:A3)" },
            { value: 3.5, numberFormat: "0.00" },
            { value: false },
            { value: null },
          ],
        ],
      },
    ];
    expect(
      workbookContent({ title: "Facts", sheets: JSON.stringify(sheets) }),
    ).toEqual({
      operation: "create_excel",
      format: "xlsx",
      title: "Facts",
      content: { sheets },
    });
  });

  it("rejects syntax errors and a non-array without claiming schema admission", () => {
    expect(workbookProblem({ title: "Facts", sheets: "[" })).toContain(
      "valid JSON",
    );
    expect(workbookProblem({ title: "Facts", sheets: "{}" })).toContain(
      "array",
    );
    // Structurally invalid members reach the canonical receiver; local parsing is not its validator.
    expect(workbookContent({ title: "Facts", sheets: "[{}]" })).toEqual({
      operation: "create_excel",
      format: "xlsx",
      title: "Facts",
      content: { sheets: [{}] },
    });
  });
});

describe("workbook public request admission", () => {
  it("admits typed literals and formulas through the exact public receiver", async () => {
    const { receiveDocumentRequest } =
      await import("@capiro/meri-contracts/document-application");
    const content = workbookContent({
      title: "Typed cells",
      sheets:
        '[{"name":"Facts","rows":[[{"value":"=SUM(A2:A3)"},{"formula":"=SUM(A2:A3)"}]]}]',
    });
    const request = receiveDocumentRequest(
      "create",
      new TextEncoder().encode(
        JSON.stringify({
          deliveryId: "synthetic-editor-control",
          request: content,
        }),
      ),
    );
    expect(request.request).toEqual(content);
    expect(Object.isFrozen(request.request)).toBe(true);
  });

  it("leaves invalid sheet structure to canonical admission and never silently repairs it", async () => {
    const { receiveDocumentRequest } =
      await import("@capiro/meri-contracts/document-application");
    const content = workbookContent({
      title: "Invalid",
      sheets: '[{"name":"Facts","rows":[[{"value":1,"unexpected":true}]]}]',
    });
    expect(() =>
      receiveDocumentRequest(
        "create",
        new TextEncoder().encode(
          JSON.stringify({
            deliveryId: "synthetic-editor-control",
            request: content,
          }),
        ),
      ),
    ).toThrow();
  });
});

it("admits the advertised initial workbook example without editing its formula", async () => {
  const { receiveDocumentRequest } =
    await import("@capiro/meri-contracts/document-application");
  const content = workbookContent({
    title: "Example",
    sheets: workbookExample,
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
});
