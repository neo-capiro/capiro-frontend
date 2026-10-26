"use client";
import { useMemo } from "react";
import DOMPurify from "dompurify";
import {
  renderNewsletterDesign,
  newsletterPlainText,
} from "@capiro/shared/newsletter-render";
import type { RichDraft } from "./draft";
import type { NewsletterPreview } from "@capiro/shared/newsletter";
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
  return sanitizePreviewDocument(rendered);
}

/** Saved owner HTML is untrusted and uses the same inert display as local HTML. */
function sanitizePreviewDocument(rendered: string) {
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

export function SavedRichPreview({ preview }: { preview: NewsletterPreview }) {
  const document = useMemo(
    () => sanitizePreviewDocument(preview.html),
    [preview],
  );
  return (
    <section className={styles.preview} aria-label="Saved newsletter preview">
      <h2>Saved-state preview</h2>
      <p>
        Saved document {preview.documentId}, revision {preview.revision}. This
        response matches the requested saved revision and excludes local edits.
        External images and links are disabled.
      </p>
      <iframe
        key={document}
        title="Saved newsletter preview"
        sandbox=""
        referrerPolicy="no-referrer"
        srcDoc={document}
      />
      <details>
        <summary>Saved plain text</summary>
        <pre className={styles.plainText}>{preview.plainText}</pre>
      </details>
      <ul>
        {preview.checks.map((check, index) => (
          <li key={`${check.id}:${index}`}>
            {check.severity}: {check.label} — {check.detail}
          </li>
        ))}
      </ul>
    </section>
  );
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
