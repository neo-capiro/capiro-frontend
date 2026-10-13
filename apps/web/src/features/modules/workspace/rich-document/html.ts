import DOMPurify from "dompurify";
import { isRichSection, plainSectionHtml, workspaceLink } from "./content";

const tags = [
  "p",
  "br",
  "h2",
  "h3",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "sup",
];
/** Display/editor projection only. Unedited source remains byte-exact in the save owner. */
export function projectSection(value: string) {
  if (!DOMPurify.isSupported) return { html: "", requiresReview: false };
  const source = isRichSection(value) ? value : plainSectionHtml(value);
  const fragment = DOMPurify.sanitize(source, {
    ALLOWED_TAGS: tags,
    ALLOWED_ATTR: [
      "href",
      "colspan",
      "rowspan",
      "start",
      "target",
      "rel",
      "colwidth",
    ],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    RETURN_DOM_FRAGMENT: true,
  });
  let requiresReview = DOMPurify.removed.some(
    (removed) => !removed.element || removed.element.nodeName !== "BODY",
  );
  for (const anchor of fragment.querySelectorAll("a")) {
    const href = workspaceLink(anchor.getAttribute("href") ?? "");
    if (href) {
      anchor.setAttribute("href", href);
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    } else {
      anchor.removeAttribute("href");
      requiresReview = true;
    }
  }
  for (const cell of fragment.querySelectorAll("td, th")) {
    for (const attribute of ["colspan", "rowspan"]) {
      const value = cell.getAttribute(attribute);
      if (
        value &&
        (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 100)
      ) {
        cell.removeAttribute(attribute);
        requiresReview = true;
      }
    }
  }
  const container = document.createElement("div");
  container.append(fragment);
  return { html: container.innerHTML, requiresReview };
}
