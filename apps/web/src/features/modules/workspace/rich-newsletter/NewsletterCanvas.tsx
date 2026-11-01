"use client";
import { useEffect, useMemo, useRef } from "react";
import { renderDraft, sanitizePreviewDocument } from "./RichPreview";
import {
  bindCanvasDocument,
  markCanvasSelection,
  type CanvasActions,
} from "./canvas-document";
import type { RichDraft } from "./draft";
import styles from "./workspace.module.css";

export function NewsletterCanvas({
  draft,
  mobile,
  selectedId,
  actions,
}: {
  draft: RichDraft;
  mobile: boolean;
  selectedId: string | null;
  actions: CanvasActions;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const current = useRef({ actions, selectedId });
  useEffect(() => {
    current.current = { actions, selectedId };
  }, [actions, selectedId]);
  const html = useMemo(
    () => sanitizePreviewDocument(renderDraft(draft, true)),
    [draft],
  );
  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (doc) markCanvasSelection(doc, selectedId);
  }, [selectedId]);
  useEffect(() => () => observer.current?.disconnect(), []);
  return (
    <div className={styles.canvasScroll}>
      <iframe
        ref={frame}
        className={styles.emailCanvas}
        title="Newsletter editing canvas"
        // Scripts remain disabled. Same-origin access lets the parent attach local
        // selection/drag handlers and measure canonical HTML without an iframe script.
        // Saved and preview frames retain their opaque sandbox="" boundary.
        sandbox="allow-same-origin"
        referrerPolicy="no-referrer"
        srcDoc={html}
        style={{ width: mobile ? 375 : draft.design.styles.width }}
        onLoad={() => {
          const element = frame.current;
          const doc = element?.contentDocument;
          if (!element || !doc) return;
          observer.current?.disconnect();
          bindCanvasDocument(doc, draft.design, {
            select: (id) => current.current.actions.select(id),
            editSection: (id) => current.current.actions.editSection(id),
            change: (action) => current.current.actions.change(action),
            remove: (id) => current.current.actions.remove(id),
          });
          markCanvasSelection(doc, current.current.selectedId);
          const size = () => {
            element.style.height = `${Math.max(400, doc.body.scrollHeight + 16)}px`;
          };
          size();
          observer.current = new ResizeObserver(size);
          observer.current.observe(doc.body);
          if (document.activeElement === element)
            (
              (current.current.selectedId
                ? doc.getElementById(current.current.selectedId)
                : null) ?? doc.querySelector<HTMLElement>("[data-nl-block]")
            )?.focus();
        }}
      />
      <p className={styles.caption}>
        Weekly newsletter · {mobile ? "mobile" : "desktop"} design
      </p>
    </div>
  );
}
