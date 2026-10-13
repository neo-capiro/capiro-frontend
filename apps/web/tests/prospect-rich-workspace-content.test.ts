import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import { documentExtensions } from "../src/features/modules/workspace/rich-document/extensions";
import {
  isRichSection,
  plainSectionHtml,
  sectionSizeError,
  workspaceLink,
} from "../src/features/modules/workspace/rich-document/content";
import {
  assertManualSave,
  manualDraftInput,
} from "../src/features/modules/workspace/prospects/manual-draft";
import { draft, otherId } from "./prospect-resources-fixtures";

const html =
  '<h2>Scope</h2><p>A <strong>bold</strong> and <em>italic</em> <u>term</u><sup>1</sup>.</p><ol start="3"><li><p>Third</p></li></ol><table><tbody><tr><th><p>Heading</p></th><td><p>Cell</p></td></tr></tbody></table>';
describe("existing Workspace section HTML persistence", () => {
  it("uses exact native section strings without a second document schema", () => {
    const received = {
      ...draft,
      config: { sections: ["Body"], sectionContent: { Body: html } },
    };
    const input = manualDraftInput(received);
    expect(input.sections.Body).toBe(html);
    expect(() =>
      assertManualSave(
        received,
        {
          id: draft.id,
          tenantId: draft.tenantId,
          prospectId: draft.prospectId,
        },
        input,
      ),
    ).not.toThrow();
  });
  it.each(["html", "origin", "order"])(
    "rejects a changed %s save receipt",
    (change) => {
      const received = {
        ...draft,
        config: {
          sections: ["Body", "Summary"],
          sectionContent: { Body: html, Summary: "Plain" },
        },
      };
      const input = manualDraftInput(received);
      const changed = structuredClone(received);
      if (change === "html")
        changed.config.sectionContent.Body = "A bold and italic term.";
      if (change === "origin") changed.prospectId = otherId;
      if (change === "order") changed.config.sections.reverse();
      expect(() =>
        assertManualSave(
          changed,
          {
            id: draft.id,
            tenantId: draft.tenantId,
            prospectId: draft.prospectId,
          },
          input,
        ),
      ).toThrow();
    },
  );
  it("escapes literal text before an explicit rich-mode conversion, retaining blank lines", () => {
    expect(plainSectionHtml('A <b>literal</b> & "quote"\n\nLast')).toBe(
      "<p>A &lt;b&gt;literal&lt;/b&gt; &amp; &quot;quote&quot;</p><p><br></p><p>Last</p>",
    );
    expect(isRichSection("1 < 2 and 3 > 2")).toBe(false);
    expect(isRichSection(html)).toBe(true);
  });
  it("rejects oversize serialization without truncating the submitted string", () => {
    expect(sectionSizeError("x".repeat(50_000))).toBe("");
    expect(sectionSizeError("x".repeat(50_001))).toContain("50,000");
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,bad",
    "https://user:password@example.com",
    "/relative",
    "file:///tmp/local",
  ])("rejects unsafe/unsupported link %s", (href) => {
    expect(workspaceLink(href)).toBeNull();
  });
  it.each([
    "https://example.com/page?q=1#heading",
    "http://example.com/",
    "mailto:person@example.com",
  ])("keeps supported complete link %s", (href) => {
    expect(workspaceLink(href)).toBe(href);
  });
});
describe("adopted rich document schema", () => {
  const schema = getSchema(documentExtensions());
  it("supports saved format, link, list, table and citation nodes through upstream schema", () => {
    const doc = schema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Scope" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Formatted",
              marks: [
                { type: "bold" },
                { type: "italic" },
                { type: "underline" },
                { type: "superscript" },
                { type: "link", attrs: { href: "https://example.com/" } },
              ],
            },
          ],
        },
        {
          type: "orderedList",
          attrs: { start: 3 },
          content: [{ type: "listItem", content: [{ type: "paragraph" }] }],
        },
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                { type: "tableHeader", content: [{ type: "paragraph" }] },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(() => doc.check()).not.toThrow();
    expect(doc.textContent).toBe("ScopeFormattedCell");
    expect(doc.child(2).attrs.start).toBe(3);
    expect(doc.child(3).type.spec.tableRole).toBe("table");
    expect(doc.child(3).child(0).child(0).type.spec.tableRole).toBe(
      "header_cell",
    );
  });
  it("does not admit scripts, iframe or remote image nodes", () => {
    for (const type of ["script", "iframe", "image"])
      expect(() => schema.nodeFromJSON({ type })).toThrow();
  });
});
