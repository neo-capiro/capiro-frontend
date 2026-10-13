import DOMPurify from "dompurify";

/** Local display/editor subset. The backend remains the send sanitizer. */
export function safeMailBodyHtml(html: string) {
  if (!DOMPurify.isSupported) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "ul", "li"],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
}
