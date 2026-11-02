import type { NewsletterBody } from "../src/shared/capiro/operations/workspace-documents";
/** Synthetic examples of the persisted original format, not a production factory. */
export function savedNewsletterFixture(preset: string): NewsletterBody {
  return {
    subject: "",
    preview: "",
    firmName: "",
    mailingAddress: "",
    blocks:
      preset === "blank"
        ? []
        : [
            {
              id: "issue-date",
              kind: "paragraph",
              text: "WEEKLY POLICY BRIEF / 2026-10-26",
            },
            { id: "heading", kind: "heading", text: "Synthetic saved heading" },
            {
              id: "intro",
              kind: "paragraph",
              text: "Synthetic saved paragraph",
            },
            {
              id: "cta",
              kind: "button",
              text: "Read more",
              href: "https://example.test",
            },
          ],
  };
}
