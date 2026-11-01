import { defaultNewsletterConfig } from "@capiro/shared/newsletter";
import {
  newsletterMergeText,
  newsletterSafeUrl,
} from "@capiro/shared/newsletter-render";

export type PreviewLink = {
  key: string;
  label: string;
  url: string;
  status: "Check destination" | "Resolved in Outreach" | "Valid destination";
};

/** Local syntax/anchor checks; this never requests or opens the destination. */
export function previewLinkStatus(url: string, anchorExists: boolean) {
  const value = url.trim();
  const safe = newsletterSafeUrl(value);
  const merge = /\*\|[^|]+\|\*/.test(value);
  const unresolved = /\*\|[^|]+\|\*/.test(
    newsletterMergeText(value, defaultNewsletterConfig(), {
      liveMergeTags: true,
    }),
  );
  if (!safe || unresolved || (value.startsWith("#") && !anchorExists))
    return "Check destination" as const;
  return merge
    ? ("Resolved in Outreach" as const)
    : ("Valid destination" as const);
}

/** Template contents stay inert: scripts, frames and images are never mounted. */
export function newsletterPreviewLinks(html: string): PreviewLink[] {
  if (typeof document === "undefined") return [];
  const template = document.createElement("template");
  template.innerHTML = html;
  return Array.from(template.content.querySelectorAll("a"))
    .filter((link) => link.hasAttribute("href") || !link.hasAttribute("id"))
    .map((link, index) => {
      const url = link.getAttribute("href") ?? "";
      const label =
        link.textContent?.trim() ||
        link.querySelector("img")?.getAttribute("alt") ||
        "Linked image";
      return {
        key: JSON.stringify([index, label, url]),
        label,
        url,
        status: previewLinkStatus(
          url,
          Boolean(template.content.getElementById(url.trim().slice(1))),
        ),
      };
    });
}
