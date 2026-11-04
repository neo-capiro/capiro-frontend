import { describe, expect, it, vi } from "vitest";
import { getSchema, type JSONContent } from "@tiptap/core";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DocumentContentRequest } from "@capiro/meri-contracts/document-application";
import {
  CanvasEditor,
  canvasExtensions,
} from "../src/features/meri/canvas/CanvasEditor";
import {
  canvasContentSupport,
  canvasAcceptsTransaction,
  canvasDocument,
  canvasDocumentRequest,
  canvasSourceText,
  canvasStyles,
  canvasTextChange,
  type CanvasWordRequest,
} from "../src/features/meri/canvas/canvas-content";

const source = (): CanvasWordRequest => ({
  operation: "create_word",
  format: "docx",
  title: "  Draft title  ",
  content: {
    blocks: [
      { kind: "paragraph", style: "Title", runs: [{ text: "Report" }] },
      {
        kind: "paragraph",
        quoteDepth: 3,
        runs: [
          { text: "", bold: false },
          { text: "Same ", bold: true },
          { text: "style", bold: true },
          { text: " changed", italic: true, strike: true, underline: true },
          { text: "", italic: false },
        ],
      },
      {
        kind: "table",
        rows: [
          ["One\nTwo", "  spaced  "],
          ["", "End"],
        ],
      },
    ],
  },
});
const schema = getSchema(canvasExtensions());
const normalized = (request = source()) =>
  structuredClone(
    schema.nodeFromJSON(canvasDocument(request)).toJSON(),
  ) as JSONContent;

describe("canonical canvas content", () => {
  it("preserves every untouched canonical block through real ProseMirror normalization", () => {
    const request = source();
    const doc = normalized(request);
    expect(doc.content![1]!.content).toHaveLength(2);
    const roundtrip = canvasDocumentRequest(request, doc);
    expect(roundtrip).toEqual(request);
    expect(roundtrip.content.blocks[1]).toBe(request.content.blocks[1]);
    expect(roundtrip.content.blocks[2]).toBe(request.content.blocks[2]);
    expect(roundtrip.title).toBe("  Draft title  ");
  });

  it("edits one paragraph while keeping the exact untouched runs and table", () => {
    const request = source(),
      doc = normalized(request);
    doc.content![0]!.content![0]!.text = "Updated report";
    const revised = canvasDocumentRequest(request, doc);
    expect(revised.content.blocks[0]).toEqual({
      kind: "paragraph",
      style: "Title",
      runs: [{ text: "Updated report" }],
    });
    expect(revised.content.blocks[1]).toBe(request.content.blocks[1]);
    expect(revised.content.blocks[2]).toBe(request.content.blocks[2]);
    expect(request.content.blocks[0]).toEqual({
      kind: "paragraph",
      style: "Title",
      runs: [{ text: "Report" }],
    });
  });

  it("retains the paragraph styles, quote depths, all marks and empty paragraphs", () => {
    const blocks = canvasStyles.map(
      (style): CanvasWordRequest["content"]["blocks"][number] => ({
        kind: "paragraph",
        style,
        quoteDepth: 8,
        runs: [
          {
            text: style === "Normal" ? "" : style,
            bold: true,
            italic: true,
            strike: true,
            underline: true,
          },
        ],
      }),
    );
    const request: CanvasWordRequest = {
      ...source(),
      content: {
        blocks: [blocks[0]!, ...blocks.slice(1)],
      },
    };
    expect(canvasDocumentRequest(request, normalized(request))).toEqual(
      request,
    );
    const edited = normalized(request);
    edited.content![0]!.content = [
      {
        type: "text",
        text: "New",
        marks: [{ type: "underline" }, { type: "bold" }],
      },
    ];
    expect(canvasDocumentRequest(request, edited).content.blocks[0]).toEqual({
      kind: "paragraph",
      style: "Normal",
      quoteDepth: 8,
      runs: [{ text: "New", bold: true, underline: true }],
    });
  });

  it("retains source identity across inserted and reordered blocks without restoring deleted text", () => {
    const request = source(),
      doc = normalized(request);
    const heading = doc.content!.shift()!;
    doc.content!.push(heading);
    doc.content!.unshift({
      type: "paragraph",
      attrs: { style: "Heading 2", quoteDepth: 0 },
      content: [{ type: "text", text: "New" }],
    });
    const result = canvasDocumentRequest(request, doc).content.blocks;
    expect(result[0]).toEqual({
      kind: "paragraph",
      style: "Heading 2",
      runs: [{ text: "New" }],
    });
    expect(result[1]).toBe(request.content.blocks[1]);
    expect(result[3]).toBe(request.content.blocks[0]);
  });

  it("edits plain cells and turns cell paragraph breaks into text without trimming whitespace", () => {
    const request = source(),
      doc = normalized(request);
    const cell = doc.content![2]!.content![0]!.content![1]!;
    cell.content!.push({
      type: "paragraph",
      content: [{ type: "text", text: "  next  " }],
    });
    expect(canvasDocumentRequest(request, doc).content.blocks[2]).toEqual({
      kind: "table",
      rows: [
        ["One\nTwo", "  spaced  \n  next  "],
        ["", "End"],
      ],
    });
  });

  it.each(["bold", "italic", "strike", "underline"])(
    "rejects %s in table cells instead of silently flattening",
    (mark) => {
      const doc = normalized();
      doc.content![2]!.content![0]!.content![0]!.content![0]!.content![0]!.marks =
        [{ type: mark }];
      expect(() => canvasDocumentRequest(source(), doc)).toThrow(
        "cannot be preserved",
      );
    },
  );

  it("rejects merged cells, table headings, unknown nodes, marks and attributes", () => {
    const changes: ((doc: JSONContent) => void)[] = [
      (doc) => {
        doc.content![2]!.content![0]!.content![0]!.attrs!.colspan = 2;
      },
      (doc) => {
        doc.content![2]!.content![0]!.content![0]!.type = "tableHeader";
      },
      (doc) => {
        doc.content!.push({ type: "image", attrs: { src: "test.png" } });
      },
      (doc) => {
        doc.content![0]!.content![0]!.marks = [
          { type: "link", attrs: { href: "https://example.com" } },
        ];
      },
      (doc) => {
        doc.content![0]!.attrs!.unsupported = true;
      },
    ];
    for (const change of changes) {
      const doc = normalized();
      change(doc);
      expect(() => canvasDocumentRequest(source(), doc)).toThrow(
        "cannot be preserved",
      );
    }
  });

  it("refuses stored marks in table cells while keeping ordinary typing and paragraph shortcuts available", () => {
    const doc = schema.nodeFromJSON(canvasDocument(source()));
    const state = EditorState.create({ schema, doc });
    let cellPosition = 0;
    doc.descendants((node, position) => {
      if (node.type.name === "tableCell" && !cellPosition)
        cellPosition = position + 2;
    });
    const markedCell = state.tr
      .setSelection(TextSelection.create(doc, cellPosition))
      .setStoredMarks([schema.marks.bold!.create()]);
    expect(canvasAcceptsTransaction(markedCell)).toBe(false);
    const typed = state.tr
      .setSelection(TextSelection.create(doc, cellPosition))
      .insertText("Typed");
    expect(canvasAcceptsTransaction(typed)).toBe(true);
    expect(
      canvasAcceptsTransaction(
        state.tr
          .setSelection(TextSelection.create(doc, 1))
          .setStoredMarks([schema.marks.bold!.create()]),
      ),
    ).toBe(true);
  });

  it("leaves images, charts, ragged tables and extra source fields read-only and unmodified", () => {
    const requests: CanvasWordRequest[] = [
      {
        ...source(),
        content: {
          blocks: [
            {
              kind: "image",
              assetId: "retained-image",
              widthInches: 2,
              heightInches: 1,
            },
          ],
        },
      },
      {
        ...source(),
        content: {
          blocks: [
            {
              kind: "chart",
              chart: {
                kind: "bar",
                title: "Totals",
                categories: ["One"],
                series: [{ name: "First", values: [1] }],
              },
            },
          ],
        },
      },
      {
        ...source(),
        content: { blocks: [{ kind: "table", rows: [["A", "B"], ["C"]] }] },
      },
      { ...source(), template: { id: "keep" } } as CanvasWordRequest,
      {
        ...source(),
        content: {
          blocks: [
            { kind: "paragraph", runs: [{ text: "Keep", custom: true }] },
          ],
        },
      } as unknown as CanvasWordRequest,
    ];
    for (const request of requests) {
      const original = JSON.stringify(request);
      expect(canvasContentSupport(request).editable).toBe(false);
      expect(() => canvasDocument(request)).toThrow(
        "Unsupported canvas source",
      );
      expect(JSON.stringify(request)).toBe(original);
    }
    expect(canvasSourceText(requests[0]!)).toContain("Image retained");
    expect(canvasSourceText(requests[1]!)).toContain("Totals");
  });
});

describe("raw text and initial rendering", () => {
  it("keeps blank lines, tabs, spaces and original line endings in unchanged spans", () => {
    const raw = "  First\r\n\r\n\tLast  \r\n";
    expect(canvasTextChange(raw, raw.replace(/\r\n/g, "\n"))).toBe(raw);
    expect(canvasTextChange(raw, "  First!\n\n\tLast  \n")).toBe(
      "  First!\r\n\r\n\tLast  \r\n",
    );
    expect(canvasTextChange("A\r\nB\nC", "A\nChanged\nC")).toBe(
      "A\r\nChanged\nC",
    );
    expect(canvasTextChange("", " \n\t")).toBe(" \n\t");
  });
  it("does not emit replacements while mounting a document, text file, or unsupported source", () => {
    const onChange = vi.fn();
    const requests: DocumentContentRequest[] = [
      source(),
      {
        operation: "create_word",
        format: "txt",
        title: "Notes",
        content: { text: " \n\n\t " },
      },
      {
        operation: "create_word",
        format: "xml",
        title: "Original",
        content: { text: "<keep />" },
      },
    ];
    for (const request of requests)
      renderToStaticMarkup(
        createElement(CanvasEditor, { request, disabled: false, onChange }),
      );
    expect(onChange).not.toHaveBeenCalled();
  });
});
