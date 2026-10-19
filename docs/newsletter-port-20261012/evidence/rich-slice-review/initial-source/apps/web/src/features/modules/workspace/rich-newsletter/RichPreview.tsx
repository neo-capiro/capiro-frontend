"use client";
import { useMemo } from "react";
import DOMPurify from "dompurify";
import {
  renderNewsletterDesign,
  newsletterPlainText,
} from "@capiro/shared/newsletter-render";
import type { RichDraft } from "./draft";
import styles from "./rich-newsletter.module.css";

/** Canonical rendering plus inert display isolation; never a sendable artifact. */
function previewDocument(draft: RichDraft) {
  if (!DOMPurify.isSupported) return "";
  const rendered = renderNewsletterDesign(draft.design, draft.config, {
    editor: true,
    liveMergeTags: false,
    sanitizeHtml: (html) =>
      DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }),
  });
  const fragment = DOMPurify.sanitize(rendered, {
    RETURN_DOM_FRAGMENT: true,
    FORBID_TAGS: [
      "script",
      "iframe",
      "form",
      "input",
      "button",
      "textarea",
      "select",
      "video",
      "audio",
      "source",
      "link",
      "meta",
      "base",
    ],
    FORBID_ATTR: ["href", "srcset"],
  });
  const assetOrigin = window.location.origin;
  fragment.querySelectorAll("img").forEach((image) => {
    const src = image.getAttribute("src") ?? "";
    if (/^\/newsletter\/[a-z0-9-]+\.png$/.test(src))
      image.src = assetOrigin + src;
    else if (!/^data:image\/(png|jpeg|gif|webp);base64,/i.test(src))
      image.replaceWith(
        document.createTextNode(`[${image.alt || "External image hidden"}]`),
      );
  });
  const body = document.createElement("div");
  body.append(fragment);
  return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: ${assetOrigin}/newsletter/; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><style>body{margin:0;overflow-wrap:anywhere}img{max-width:100%}</style>${body.innerHTML}`;
}

export function RichPreview({
  draft,
  mobile,
  plainText,
}: {
  draft: RichDraft;
  mobile: boolean;
  plainText: boolean;
}) {
  const document = useMemo(() => previewDocument(draft), [draft]);
  const text = useMemo(
    () =>
      newsletterPlainText(draft.design, draft.config, { liveMergeTags: false }),
    [draft],
  );
  return (
    <div className={styles.preview}>
      <p>
        Local preview · external images and links are disabled. Email clients
        may render differently.
      </p>
      {plainText ? (
        <pre className={styles.plainText} aria-label="Newsletter plain text">
          {text}
        </pre>
      ) : (
        <iframe
          title="Rich newsletter preview"
          sandbox=""
          referrerPolicy="no-referrer"
          srcDoc={document}
          style={{ width: mobile ? 375 : "100%" }}
        />
      )}
    </div>
  );
}
