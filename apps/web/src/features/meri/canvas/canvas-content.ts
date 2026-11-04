import type { JSONContent } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";
import type { DocumentContentRequest } from "@capiro/meri-contracts/document-application";

export type CanvasWordRequest = Extract<
  DocumentContentRequest,
  { format: "docx" }
>;
type Block = CanvasWordRequest["content"]["blocks"][number];
type Paragraph = Extract<Block, { kind: "paragraph" }>;
type Run = Paragraph["runs"][number];
export const canvasStyles = [
  "Normal",
  "Title",
  "Heading 1",
  "Heading 2",
  "List Bullet",
] as const;
const markNames = ["bold", "italic", "strike", "underline"] as const;
const keys = (value: object, allowed: readonly string[]) =>
  Object.keys(value).every((key) => allowed.includes(key));

/** Editing eligibility, not public-contract admission. Unknown source data is never projected away. */
export function canvasContentSupport(request: DocumentContentRequest): {
  editable: boolean;
  reason?: string;
} {
  const unsupported = {
    editable: false,
    reason:
      "This document includes content or formatting the canvas cannot preserve. Open the original file to edit it; its saved content is unchanged.",
  };
  if (
    !keys(request, ["operation", "format", "title", "content"]) ||
    request.operation !== "create_word"
  )
    return unsupported;
  if (request.format === "txt")
    return keys(request.content, ["text"]) &&
      typeof request.content.text === "string"
      ? { editable: true }
      : unsupported;
  if (request.format !== "docx" || !keys(request.content, ["blocks"]))
    return unsupported;
  const supported =
    request.content.blocks.length > 0 &&
    request.content.blocks.every((block) => {
      if (block.kind === "paragraph") {
        return (
          keys(block, ["kind", "runs", "style", "quoteDepth"]) &&
          (block.style === undefined || canvasStyles.includes(block.style)) &&
          (block.quoteDepth === undefined ||
            (Number.isInteger(block.quoteDepth) &&
              block.quoteDepth >= 1 &&
              block.quoteDepth <= 8)) &&
          block.runs.length > 0 &&
          block.runs.every(
            (run) =>
              keys(run, ["text", ...markNames]) &&
              typeof run.text === "string" &&
              markNames.every(
                (mark) =>
                  run[mark] === undefined || typeof run[mark] === "boolean",
              ),
          )
        );
      }
      if (block.kind !== "table" || !keys(block, ["kind", "rows"]))
        return false;
      const width = block.rows[0]?.length ?? 0;
      return (
        width > 0 &&
        block.rows.every(
          (row) =>
            row.length === width &&
            row.every((cell) => typeof cell === "string"),
        )
      );
    });
  return supported ? { editable: true } : unsupported;
}

const textNodes = (
  text: string,
  marks?: JSONContent["marks"],
): JSONContent[] =>
  text ? [{ type: "text", text, ...(marks?.length ? { marks } : {}) }] : [];

function blockNode(block: Block, sourceIndex: number): JSONContent {
  if (block.kind === "paragraph")
    return {
      type: "paragraph",
      attrs: {
        sourceIndex,
        style: block.style ?? "Normal",
        quoteDepth: block.quoteDepth ?? 0,
      },
      content: block.runs.flatMap((run) =>
        textNodes(
          run.text,
          markNames.filter((mark) => run[mark]).map((type) => ({ type })),
        ),
      ),
    };
  if (block.kind !== "table") throw new Error("Unsupported canvas source");
  return {
    type: "table",
    attrs: { sourceIndex },
    content: block.rows.map((row) => ({
      type: "tableRow",
      content: row.map((text) => ({
        type: "tableCell",
        content: [{ type: "paragraph", content: textNodes(text) }],
      })),
    })),
  };
}

/** Local source indices preserve exact untouched blocks even when ProseMirror merges equivalent runs. */
export function canvasDocument(request: CanvasWordRequest): JSONContent {
  if (!canvasContentSupport(request).editable)
    throw new Error("Unsupported canvas source");
  return { type: "doc", content: request.content.blocks.map(blockNode) };
}

const invalid = (): never => {
  throw new Error("This change cannot be preserved in the document format.");
};
const assertAttrs = (node: JSONContent, allowed: readonly string[]) => {
  if (node.attrs && !keys(node.attrs, allowed)) invalid();
};

function paragraph(node: JSONContent, plain = false): Paragraph {
  if (node.type !== "paragraph" || node.marks?.length) return invalid();
  assertAttrs(node, ["sourceIndex", "style", "quoteDepth"]);
  const style = node.attrs?.style ?? "Normal";
  const depth = node.attrs?.quoteDepth ?? 0;
  if (
    !canvasStyles.includes(style) ||
    !Number.isInteger(depth) ||
    depth < 0 ||
    depth > 8 ||
    (plain && (style !== "Normal" || depth !== 0))
  )
    return invalid();
  const runs: Run[] = [];
  for (const child of node.content ?? []) {
    if (
      child.content?.length ||
      (child.attrs && Object.keys(child.attrs).length)
    )
      return invalid();
    const text =
      child.type === "hardBreak"
        ? "\n"
        : child.type === "text" && typeof child.text === "string"
          ? child.text
          : invalid();
    const run: Run = { text };
    for (const mark of child.marks ?? []) {
      if (
        plain ||
        !markNames.includes(mark.type as (typeof markNames)[number]) ||
        (mark.attrs && Object.keys(mark.attrs).length)
      )
        return invalid();
      run[mark.type as (typeof markNames)[number]] = true;
    }
    const previous = runs.at(-1);
    if (previous && markNames.every((mark) => !!previous[mark] === !!run[mark]))
      previous.text += text;
    else runs.push(run);
  }
  if (!runs.length) runs.push({ text: "" });
  // Fixed mark order makes semantically equivalent upstream JSON deterministic.
  return {
    kind: "paragraph",
    style,
    ...(depth ? { quoteDepth: depth } : {}),
    runs: runs.map((run) => ({
      text: run.text,
      ...Object.fromEntries(
        markNames.filter((mark) => run[mark]).map((mark) => [mark, true]),
      ),
    })) as Paragraph["runs"],
  };
}

function blockContent(node: JSONContent): Block {
  if (node.type === "paragraph") return paragraph(node);
  if (node.type !== "table" || node.marks?.length || !node.content?.length)
    return invalid();
  assertAttrs(node, ["sourceIndex"]);
  const rows = node.content.map((row) => {
    if (row.type !== "tableRow" || row.marks?.length || !row.content?.length)
      return invalid();
    assertAttrs(row, []);
    return row.content.map((cell) => {
      if (
        cell.type !== "tableCell" ||
        cell.marks?.length ||
        !cell.content?.length
      )
        return invalid();
      assertAttrs(cell, ["colspan", "rowspan", "colwidth", "align"]);
      if (
        (cell.attrs?.colspan ?? 1) !== 1 ||
        (cell.attrs?.rowspan ?? 1) !== 1 ||
        cell.attrs?.colwidth != null ||
        cell.attrs?.align != null
      )
        return invalid();
      return cell.content
        .map((part) =>
          paragraph(part, true)
            .runs.map((run) => run.text)
            .join(""),
        )
        .join("\n");
    });
  });
  if (rows.some((row) => row.length !== rows[0]!.length)) return invalid();
  return {
    kind: "table",
    rows: rows as Extract<Block, { kind: "table" }>["rows"],
  };
}

function documentBlocks(document: JSONContent): Block[] {
  if (
    document.type !== "doc" ||
    !document.content?.length ||
    document.marks?.length ||
    (document.attrs && Object.keys(document.attrs).length)
  )
    return invalid();
  return document.content.map(blockContent);
}

/** A schema-level guard also covers formatting applied by paste or keyboard shortcuts. */
export function canvasDocumentRepresentable(document: JSONContent): boolean {
  try {
    documentBlocks(document);
    return true;
  } catch {
    return false;
  }
}

/** A mark shortcut in an empty cell must not leave typing stuck behind an unrepresentable stored mark. */
export function canvasAcceptsTransaction(transaction: Transaction): boolean {
  if (transaction.storedMarks?.length) {
    const position = transaction.selection.$from;
    for (let depth = position.depth; depth > 0; depth--)
      if (position.node(depth).type.name === "table") return false;
  }
  return (
    !transaction.docChanged ||
    canvasDocumentRepresentable(transaction.doc.toJSON())
  );
}

/** Refuses unrepresentable edits; it never strips formatting to make a save pass. */
export function canvasDocumentRequest(
  source: CanvasWordRequest,
  document: JSONContent,
): CanvasWordRequest {
  if (!canvasContentSupport(source).editable) return invalid();
  const blocks = documentBlocks(document).map((value, position) => {
    const node = document.content![position]!;
    const index: unknown = node.attrs?.sourceIndex;
    const original =
      typeof index === "number" && Number.isInteger(index) && index >= 0
        ? source.content.blocks[index]
        : undefined;
    return original &&
      JSON.stringify(value) ===
        JSON.stringify(blockContent(blockNode(original, index as number)))
      ? original
      : value;
  });
  return {
    ...source,
    content: {
      ...source.content,
      blocks: blocks as CanvasWordRequest["content"]["blocks"],
    },
  };
}

/** Safe textual fallback; it is a preview only and is never used as replacement content. */
export function canvasSourceText(request: DocumentContentRequest): string {
  if ("text" in request.content) return request.content.text;
  if (!("blocks" in request.content))
    return "Open the original file to view this content.";
  return request.content.blocks
    .map((block) => {
      if (block.kind === "paragraph")
        return block.runs.map((run) => run.text).join("");
      if (block.kind === "table")
        return block.rows.map((row) => row.join("\t")).join("\n");
      if (block.kind === "image")
        return "[Image retained in the original document]";
      if (block.kind === "chart") return `[Chart: ${block.chart.title}]`;
      return "[Content retained in the original document]";
    })
    .join("\n\n");
}

/** A textarea normalizes CRLF in its DOM value. Keep line endings in unchanged source spans. */
export function canvasTextChange(original: string, edited: string): string {
  const normalized = original.replace(/\r\n?/g, "\n");
  if (normalized === edited) return original;
  let start = 0,
    end = 0;
  while (
    start < normalized.length &&
    start < edited.length &&
    normalized[start] === edited[start]
  )
    start++;
  while (
    end < normalized.length - start &&
    end < edited.length - start &&
    normalized[normalized.length - 1 - end] === edited[edited.length - 1 - end]
  )
    end++;
  const offsets = [0];
  for (let i = 0; i < original.length; i++) {
    if (original[i] === "\r" && original[i + 1] === "\n") i++;
    offsets.push(i + 1);
  }
  const newline =
    original.includes("\r\n") && !/(^|[^\r])\n/.test(original) ? "\r\n" : "\n";
  return (
    original.slice(0, offsets[start]) +
    edited.slice(start, edited.length - end).replace(/\n/g, newline) +
    original.slice(offsets[normalized.length - end])
  );
}
