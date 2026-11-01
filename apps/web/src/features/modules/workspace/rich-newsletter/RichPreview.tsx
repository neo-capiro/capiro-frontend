"use client";
import { useMemo } from "react";
import DOMPurify from "dompurify";
import {
  renderNewsletterDesign,
  newsletterPlainText,
} from "@capiro/shared/newsletter-render";
import type { RichDraft } from "./draft";
import { newsletterPreviewLinks } from "./content/preview-links";
import { PreviewLinks } from "./PreviewLinks";
import styles from "./rich-newsletter.module.css";

/** Canonical rendering plus inert display isolation; never a sendable artifact. */
export function renderDraft(draft: RichDraft, selectionSafe = false) {
  if (!DOMPurify.isSupported) return "";
  return renderNewsletterDesign(draft.design, draft.config, {
    editor: true,
    liveMergeTags: false,
    sanitizeHtml: (html) =>
      DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        // Only the canonical renderer may supply editor selection identities.
        ...(selectionSafe
          ? {
              FORBID_ATTR: [
                "id",
                "name",
                "class",
                "data-nl-block",
                "data-nl-section",
              ],
            }
          : {}),
      }),
  });
}

/** Saved owner HTML is untrusted and uses the same inert display as local HTML. */
export function sanitizePreviewDocument(rendered: string) {
  if (!DOMPurify.isSupported) return "";
  const sanitized = DOMPurify.sanitize(rendered, {
    WHOLE_DOCUMENT: true,
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
  const preview = new DOMParser().parseFromString(sanitized, "text/html");
  const assetOrigin = window.location.origin;
  preview.querySelectorAll("img").forEach((image) => {
    const src = image.getAttribute("src") ?? "";
    if (/^\/newsletter\/[a-z0-9-]+\.png$/.test(src))
      image.src = assetOrigin + src;
    else if (!/^data:image\/(png|jpeg|gif|webp);base64,/i.test(src))
      image.replaceWith(
        document.createTextNode(`[${image.alt || "External image hidden"}]`),
      );
  });
  const policy = preview.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content = `default-src 'none'; img-src data: ${assetOrigin}/newsletter/; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'`;
  preview.head.prepend(policy);
  const sizing = preview.createElement("style");
  sizing.textContent = "body{overflow-wrap:anywhere}img{max-width:100%}";
  preview.head.append(sizing);
  return `<!doctype html>${preview.documentElement.outerHTML}`;
}

/** Saved HTML uses the same sanitization, image policy and inert context. */
export function SavedNewsletterHtml({
  html,
  title,
}: {
  html: string;
  title: string;
}) {
  const document = useMemo(() => sanitizePreviewDocument(html), [html]);
  return (
    <iframe
      key={document}
      title={title}
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={document}
    />
  );
}

export function RichPreview({
  draft,
  mobile,
  plainText,
  savedReview = false,
}: {
  draft: RichDraft;
  mobile: boolean;
  plainText: boolean;
  savedReview?: boolean;
}) {
  const rendered = useMemo(() => renderDraft(draft), [draft]);
  const document = useMemo(() => sanitizePreviewDocument(rendered), [rendered]);
  const links = useMemo(() => newsletterPreviewLinks(rendered), [rendered]);
  const text = useMemo(
    () =>
      newsletterPlainText(draft.design, draft.config, { liveMergeTags: false }),
    [draft],
  );
  return (
    <div className={styles.preview}>
      <p>
        {savedReview ? "Reviewed saved content" : "Local preview"} · external
        images and links are disabled. Email clients may render differently.
      </p>
      <PreviewLinks links={links} />
      {plainText ? (
        <pre className={styles.plainText} aria-label="Newsletter plain text">
          {text}
        </pre>
      ) : (
        // Replace the inert browsing context instead of adding srcdoc history
        // entries that consume Back before the parent route can dispose a view.
        <iframe
          key={document}
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
