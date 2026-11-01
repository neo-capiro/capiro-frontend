"use client";
import { useMemo, useState } from "react";
import { newsletterPlainText } from "@capiro/shared/newsletter-render";
import type { NewsletterPreview } from "@capiro/shared/newsletter";
import { Modal } from "../../../../shared/module-ui";
import { renderDraft, sanitizePreviewDocument } from "./RichPreview";
import { PreviewLinks } from "./PreviewLinks";
import { newsletterPreviewLinks } from "./content/preview-links";
import type { RichDraft } from "./draft";
import styles from "./workspace.module.css";

export function WorkspacePreview({
  draft,
  saved,
  initialMode,
  close,
  stage,
  checkHtml,
}: {
  draft: RichDraft;
  saved?: NewsletterPreview;
  initialMode: "Desktop" | "Mobile" | "Plain text";
  close: () => void;
  stage: () => void;
  checkHtml: () => void;
}) {
  const [mode, setMode] = useState<string>(initialMode);
  const rendered = useMemo(
    () => saved?.html ?? renderDraft(draft),
    [draft, saved],
  );
  const html = useMemo(() => sanitizePreviewDocument(rendered), [rendered]);
  const links = useMemo(() => newsletterPreviewLinks(rendered), [rendered]);
  const text = useMemo(
    () =>
      saved?.plainText ??
      newsletterPlainText(draft.design, draft.config, { liveMergeTags: false }),
    [draft, saved],
  );
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title="Preview"
      description={
        saved
          ? `Saved revision ${saved.revision}; unsaved edits are excluded.`
          : "Preview your local newsletter design."
      }
      className={`${styles.root} ${styles.previewModal}`}
    >
      <div className={styles.previewToolbar}>
        <div className={styles.tabs} aria-label="Newsletter preview mode">
          {["Desktop", "Mobile", "Inbox", "Plain text"].map((name) => (
            <button
              key={name}
              aria-pressed={mode === name}
              onClick={() => setMode(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <button onClick={stage}>Stage in Outreach</button>
      </div>
      {mode === "Inbox" ? (
        <section className={styles.inbox}>
          <h3>Check your HTML, then test your inbox</h3>
          <p>
            Check your saved newsletter for HTML compatibility issues. Then
            stage it in Outreach to prepare a test email. Inbox screenshots are
            not available.
          </p>
          <button onClick={checkHtml}>Review saved HTML checks</button>
          <p>
            Checks use the current verified saved revision. Review saved state
            before running a check.
          </p>
        </section>
      ) : (
        <div className={styles.previewLayout}>
          <div className={styles.previewFrame}>
            {mode === "Plain text" ? (
              <pre
                className={styles.previewText}
                aria-label={
                  saved
                    ? "Saved newsletter plain text"
                    : "Newsletter plain text"
                }
              >
                {text}
              </pre>
            ) : (
              <iframe
                key={html}
                title={
                  saved ? "Saved newsletter preview" : "Rich newsletter preview"
                }
                sandbox=""
                referrerPolicy="no-referrer"
                srcDoc={html}
                style={{
                  width:
                    mode === "Mobile"
                      ? 375
                      : Math.max(660, draft.design.styles.width),
                }}
              />
            )}
          </div>
          <aside>
            <h3>Email information</h3>
            {saved ? (
              <p>
                Saved revision {saved.revision}. This preview excludes unsaved
                local edits.
              </p>
            ) : (
              <dl>
                <dt>To</dt>
                <dd>Select in Outreach</dd>
                <dt>From</dt>
                <dd>Select in Outreach</dd>
                <dt>Subject</dt>
                <dd>
                  {draft.config.subject ||
                    "Add a subject in newsletter details"}
                </dd>
                <dt>Preview text</dt>
                <dd>{draft.config.previewText || "—"}</dd>
              </dl>
            )}
            <PreviewLinks links={links} />
            {saved?.checks.map((check) => (
              <p key={check.id}>
                {check.label}: {check.detail}
              </p>
            ))}
            <p className={styles.muted}>
              External images and live links are disabled. Email clients may
              render differently.
            </p>
          </aside>
        </div>
      )}
    </Modal>
  );
}
