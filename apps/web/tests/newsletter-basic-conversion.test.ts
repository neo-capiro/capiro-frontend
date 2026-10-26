import { describe, expect, it, vi } from "vitest";
import { renderNewsletterDesign } from "@capiro/shared/newsletter-render";
import { convertBasicNewsletter } from "../src/features/modules/workspace/newsletter/basic-rich-conversion";
import {
  createNewsletter,
  newsletterDocumentBlocks,
} from "../src/features/modules/workspace/newsletter/newsletter-model";
import type { NewsletterBody } from "../src/shared/capiro/operations/workspace-documents";

const body = (): NewsletterBody => ({
  subject: "A subject — café",
  preview: "A saved preview",
  firmName: "Example firm",
  mailingAddress: "1 Saved Street",
  blocks: [
    { id: "h", kind: "heading", text: "Heading\nsecond line" },
    {
      id: "p",
      kind: "paragraph",
      text: "<script>alert(1)</script> & plain text",
    },
    {
      id: "b",
      kind: "button",
      text: "Email us",
      href: "mailto:team@example.test",
    },
    {
      id: "i",
      kind: "image",
      text: "Saved alternative text",
      href: "https://images.example.test/a.png",
    },
    {
      id: "l",
      kind: "logo",
      text: "Saved logo",
      href: "https://images.example.test/logo.png",
    },
    { id: "d", kind: "divider", text: "" },
    { id: "s", kind: "spacer", text: "" },
  ],
});
describe("explicit basic conversion", () => {
  it("preserves subject/footer/text/images/links without modifying or aliasing the basic body", () => {
    const input = body(),
      original = structuredClone(input);
    const result = convertBasicNewsletter(
      "Saved newsletter",
      input,
      "client-1",
    );
    expect(result.issues).toEqual([]);
    const draft = result.draft!;
    expect(draft.config).toMatchObject({
      clientId: "client-1",
      subject: input.subject,
      previewText: input.preview,
      company: input.firmName,
      mailingAddress: input.mailingAddress,
      recipientIds: [],
      permissionReminder: "",
    });
    expect(draft.design.sourceClientIds).toEqual(["client-1"]);
    const blocks = draft.design.sections[0]!.blocks;
    expect(blocks.find((b) => b.kind === "button")).toMatchObject({
      text: "Email us",
      url: "mailto:team@example.test",
      linkType: "email",
    });
    expect(blocks.find((b) => b.kind === "image")).toMatchObject({
      imageUrl: input.blocks[3]!.href,
      alt: "Saved alternative text",
    });
    expect(blocks.find((b) => b.kind === "logo")).toMatchObject({
      imageUrl: input.blocks[4]!.href,
      alt: "Saved logo",
    });
    const html = renderNewsletterDesign(draft.design, draft.config);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("1 Saved Street");
    blocks[0]!.text = "Changed rich content";
    expect(input).toEqual(original);
  });
  it("converts a social destination only to an ordinary labelled link, with explicit review", () => {
    const input = body();
    input.blocks = [
      {
        id: "social",
        kind: "social",
        text: "Our updates",
        href: "https://example.test/community",
      },
    ];
    const result = convertBasicNewsletter("Name", input, null);
    expect(result.notes.some((n) => n.includes("ordinary link buttons"))).toBe(
      true,
    );
    expect(result.draft!.design.sections[0]!.blocks[1]).toMatchObject({
      kind: "button",
      text: "Our updates",
      url: input.blocks[0]!.href,
      items: [],
    });
    expect(newsletterDocumentBlocks(input)[0]!.content).toContain(
      input.blocks[0]!.href,
    );
  });
  it("refuses code, unsafe destinations and otherwise dropped text with precise block positions", () => {
    const input = body();
    input.blocks = [
      { id: "1", kind: "code", text: "<form />" },
      {
        id: "2",
        kind: "image",
        text: "Alt",
        href: "mailto:someone@example.test",
      },
      { id: "3", kind: "divider", text: "Must retain" },
    ];
    const result = convertBasicNewsletter("Name", input, null);
    expect(result.draft).toBeUndefined();
    expect(result.issues).toEqual([
      expect.stringContaining("Block 1 (code)"),
      expect.stringContaining("Block 2 (image)"),
      expect.stringContaining("Block 3 (divider)"),
    ]);
  });
  it("refuses unknown source fields rather than silently discarding them", () => {
    expect(
      convertBasicNewsletter(
        "Name",
        { ...body(), unknown: { retained: true } },
        null,
      ).draft,
    ).toBeUndefined();
    const input = body();
    const result = convertBasicNewsletter(
      "Name",
      { ...input, blocks: [{ ...input.blocks[0], unknown: "keep me" }] },
      null,
    );
    expect(result.draft).toBeUndefined();
    expect(result.issues[0]).toContain("blocks.0");
  });
  it("refuses literal merge tags rather than silently changing their meaning in rich delivery", () => {
    const input = body();
    input.subject = "For *|FNAME|*";
    input.blocks[0]!.text = "*|CURRENT_YEAR|*";
    const result = convertBasicNewsletter("Name", input, null);
    expect(result.draft).toBeUndefined();
    expect(result.issues).toEqual([
      expect.stringContaining("subject: merge-tag"),
      expect.stringContaining("Block 1 (heading): merge-tag"),
    ]);
  });
  it("refuses duplicate IDs, unrepresentable links and overlong names without truncation", () => {
    const input = body();
    input.blocks = [
      {
        id: "a",
        kind: "paragraph",
        text: "First",
        href: "https://example.test",
      },
      { id: "a", kind: "paragraph", text: "Second" },
    ];
    const result = convertBasicNewsletter("n".repeat(201), input, null);
    expect(result.draft).toBeUndefined();
    expect(result.issues).toHaveLength(3);
  });
  it("stores the issue date as normal editable content and never recalculates a reopened body", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-26T23:59:59Z"));
      const created = createNewsletter("weekly");
      const saved = JSON.stringify(created);
      vi.setSystemTime(new Date("2026-11-10T00:00:00Z"));
      const reopened: NewsletterBody = JSON.parse(saved);
      expect(reopened.blocks[0]!.text).toBe("WEEKLY POLICY BRIEF / 2026-10-26");
      expect(
        convertBasicNewsletter("Name", reopened, null).draft!.design
          .sections[0]!.blocks[0]!.text,
      ).toBe(reopened.blocks[0]!.text);
      expect(createNewsletter("blank").blocks).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });
});
