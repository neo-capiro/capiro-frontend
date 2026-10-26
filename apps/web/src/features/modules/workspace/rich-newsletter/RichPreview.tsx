"use client";
import { useMemo, useState } from "react";
import DOMPurify from "dompurify";
import {
  renderNewsletterDesign,
  newsletterPlainText,
} from "@capiro/shared/newsletter-render";
import type { RichDraft } from "./draft";
import type { NewsletterPreview } from "@capiro/shared/newsletter";
import { ActionButton, PageHeader } from "../../../../shared/module-ui";
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

export function SavedRichPreview({
  preview,
  name,
  onClose,
}: {
  preview: NewsletterPreview;
  name?: string;
  onClose: () => void;
}) {
  const [mobile, setMobile] = useState(false);
  const [plainText, setPlainText] = useState(false);
  const document = useMemo(
    () => sanitizePreviewDocument(preview.html),
    [preview],
  );
  return (
    <section className={styles.savedView} aria-label="Saved newsletter preview">
      <PageHeader
        title={mobile ? "Preview newsletter · Mobile" : "Preview newsletter"}
        description={name || `Saved revision ${preview.revision}`}
        actions={
          <ActionButton autoFocus onClick={onClose}>
            Back to editor
          </ActionButton>
        }
      />
      <div className={styles.savedModes} aria-label="Saved preview width">
        <ActionButton aria-pressed={!mobile} onClick={() => setMobile(false)}>
          Desktop
        </ActionButton>
        <ActionButton aria-pressed={mobile} onClick={() => setMobile(true)}>
          Mobile
        </ActionButton>
      </div>
      <div className={styles.savedLayout}>
        <div
          className={`${styles.savedCanvas} ${mobile ? styles.savedMobile : ""}`}
        >
          {plainText ? (
            <pre
              className={styles.savedPlainText}
              aria-label="Saved newsletter plain text"
            >
              {preview.plainText}
            </pre>
          ) : (
            <iframe
              key={document}
              title="Saved newsletter preview"
              sandbox=""
              referrerPolicy="no-referrer"
              srcDoc={document}
            />
          )}
        </div>
        <aside
          className={styles.savedInspector}
          aria-label="Saved preview information"
        >
          <h2>Saved preview</h2>
          <p className={styles.savedRevision}>
            Saved revision {preview.revision}
          </p>
          <p>
            This preview shows the requested saved revision and excludes unsaved
            local edits.
          </p>
          <p className={styles.savedCaption}>
            External images and live links are disabled. Email clients may
            render differently.
          </p>
          <ActionButton
            aria-pressed={plainText}
            onClick={() => setPlainText((value) => !value)}
          >
            Saved plain text
          </ActionButton>
          {preview.checks.length > 0 && (
            <ul
              className={styles.savedChecks}
              aria-label="Saved preview checks"
            >
              {preview.checks.map((check, index) => (
                <li key={`${check.id}:${index}`}>
                  {check.severity}: {check.label} — {check.detail}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </section>
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
  const document = useMemo(() => previewDocument(draft), [draft]);
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
