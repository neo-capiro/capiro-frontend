import type { NewsletterBody } from "../../../../shared/capiro/operations/workspace-documents";

export const newsletterPresets = [
  {
    id: "weekly",
    name: "Weekly newsletter",
    title: "The week in policy.",
    description: "Policy updates and timely perspectives",
    tag: "Editorial",
    purpose: "Recurring update",
    style: "Editorial",
    industry: "All industries",
  },
  {
    id: "column",
    name: "One-column update",
    title: "A clearer perspective.",
    description: "A focused update with a clear call to action",
    tag: "Basic layout",
    purpose: "Client update",
    style: "Simple",
    industry: "All industries",
  },
  {
    id: "blank",
    name: "Start from scratch",
    title: "Your story starts here.",
    description: "Build your own layout using newsletter blocks",
    tag: "Blank canvas",
    purpose: "Custom",
    style: "Blank",
    industry: "All industries",
  },
] as const;
export function createNewsletter(
  preset: string,
  firmName = "",
): NewsletterBody {
  return {
    subject: "",
    preview: "",
    firmName,
    mailingAddress: "",
    blocks:
      preset === "blank"
        ? []
        : [
            {
              id: "issue-date",
              kind: "paragraph",
              text: `WEEKLY POLICY BRIEF / ${new Date().toISOString().slice(0, 10)}`,
            },
            {
              id: "heading",
              kind: "heading",
              text: "The week in policy.\nWhat it means for you.",
            },
            {
              id: "intro",
              kind: "paragraph",
              text: "A focused briefing on the developments shaping your priorities in Washington.",
            },
            { id: "legislative", kind: "heading", text: "Legislative watch" },
            {
              id: "analysis",
              kind: "paragraph",
              text: "Add this week’s developments, client context and practical next steps.",
            },
            { id: "action", kind: "heading", text: "Plan for the week ahead." },
            {
              id: "next",
              kind: "paragraph",
              text: "Coordinate priorities, prepare for key conversations and keep your team aligned.",
            },
            {
              id: "cta",
              kind: "button",
              text: "Read the full briefing",
              href: "",
            },
          ],
  };
}
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
