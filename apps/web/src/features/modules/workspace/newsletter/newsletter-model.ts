import type { NewsletterBody } from "../../../../shared/capiro/operations/workspace-documents";

export function newsletterDocumentBlocks(body: NewsletterBody) {
  return body.blocks
    .filter((block) => !["divider", "spacer"].includes(block.kind))
    .map((block) => ({
      id: block.id,
      type: "section" as const,
      title:
        block.kind === "heading"
          ? block.text
          : ["button", "social"].includes(block.kind)
            ? "Action"
            : "",
      content:
        block.kind === "heading"
          ? ""
          : ["button", "social"].includes(block.kind)
            ? `${block.text}${block.href ? `: ${block.href}` : ""}`
            : block.text,
    }));
}
export function safeNewsletterHref(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:"].includes(url.protocol)
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}
