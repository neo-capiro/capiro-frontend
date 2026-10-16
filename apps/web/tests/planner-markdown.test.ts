import { describe, expect, it } from "vitest";
import { safeMarkdownLink } from "@capiro/ui/markdown";
import {
  editedMarkdown,
  formatMarkdownRange,
  linkMarkdownRange,
} from "../src/shared/markdown/source-edit";
describe("explicit Markdown source edits", () => {
  it.each([
    ["bold", "**alpha**", 2],
    ["italic", "*alpha*", 1],
    ["heading", "### alpha", 4],
    ["list", "- alpha", 2],
    ["checklist", "- [ ] alpha", 6],
  ] as const)(
    "formats %s and retains the intended text selection",
    (action, expected, start) => {
      const edit = formatMarkdownRange("alpha", 0, 5, action);
      expect(editedMarkdown("alpha", edit, 50000)).toBe(expected);
      expect(edit.start).toBe(start);
      expect(expected.slice(edit.start, edit.end)).toBe("alpha");
    },
  );
  it("prefixes complete selected lines without rewriting neighboring source", () => {
    const value = "before\none\ntwo\nafter";
    expect(
      editedMarkdown(
        value,
        formatMarkdownRange(value, 8, 14, "checklist"),
        50000,
      ),
    ).toBe("before\n- [ ] one\n- [ ] two\nafter");
    expect(
      editedMarkdown(
        "\ntext",
        formatMarkdownRange("\ntext", 0, 0, "heading"),
        50000,
      ),
    ).toBe("### \ntext");
  });
  it("refuses an oversized command without truncating or modifying the source", () => {
    const source = "A".repeat(50000);
    expect(
      editedMarkdown(source, formatMarkdownRange(source, 0, 1, "bold"), 50000),
    ).toBeNull();
    expect(source.length).toBe(50000);
  });
  it("escapes link delimiters and keeps destination parentheses in the link target", () => {
    const source = "a[b]";
    expect(
      editedMarkdown(
        source,
        linkMarkdownRange(source, 0, 4, "https://example.test/a(b)"),
        50000,
      ),
    ).toBe("[a\\[b\\]](https://example.test/a%28b%29)");
  });
});
describe("shared Markdown URL policy", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,x",
    "vbscript:x",
    "//evil.test",
    "/\\evil.test",
    "https://user:pass@example.test",
    "https://example.test/\npath",
    " javaScript:alert(1)",
  ])("refuses %s", (value) => expect(safeMarkdownLink(value)).toBeNull());
  it.each([
    "https://example.test/path",
    "http://example.test/path",
    "mailto:hello@example.test",
    "/modules/planner",
    "../task",
    "#note",
  ])("admits explicit safe link %s", (value) =>
    expect(safeMarkdownLink(value)).toBe(value),
  );
});
