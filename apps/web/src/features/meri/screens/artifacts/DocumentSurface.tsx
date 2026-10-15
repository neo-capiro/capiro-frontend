"use client";
import { DocumentPage } from "./DocumentPage";
import { DocumentPager } from "./DocumentPager";
import { DocumentToolbar } from "./DocumentToolbar";
import {
  BlockMenu,
  CommentThread,
  ModeMenu,
  RevisionCard,
} from "./DocumentOverlays";
import type { DocumentWorkspaceView } from "./types";
import type { useDocumentDraft } from "./useDocumentDraft";
import shared from "./artifacts.module.css";
import styles from "./document.module.css";

/** Toolbar, in-screen overlays, the current page and page navigation. */
export function DocumentSurface({
  view,
  draft,
  editable,
  editHref,
  unavailable,
}: {
  view: DocumentWorkspaceView;
  draft: ReturnType<typeof useDocumentDraft>;
  editable: boolean;
  editHref?: string | undefined;
  unavailable: string;
}) {
  const revision =
    draft.overlay === "revision" && draft.pageIndex === 0
      ? {
          index: view.suggestion.blockIndex,
          node: (
            <RevisionCard
              suggestion={view.suggestion}
              canApply={editable && !draft.applied}
              applyUnavailable={
                editable
                  ? "This suggestion is already applied to the local copy."
                  : "Open Edit document to apply suggestions to a working draft."
              }
              onApply={draft.apply}
              onClose={draft.close}
              unavailable={unavailable}
            />
          ),
        }
      : undefined;
  return (
    <>
      <div className={styles.toolbarArea}>
        <DocumentToolbar
          editable={editable}
          mode={draft.mode}
          overlay={draft.overlay}
          onToggle={(id) => {
            if (id === "revision") draft.setPageIndex(0);
            draft.toggle(id);
          }}
          editHref={editHref}
          unavailable={unavailable}
        />
        {draft.overlay === "blocks" ? (
          <BlockMenu
            items={view.blockTypes}
            onClose={draft.close}
            unavailable={unavailable}
          />
        ) : null}
        {draft.overlay === "comments" ? (
          <CommentThread
            comments={view.comments}
            onClose={draft.close}
            unavailable={unavailable}
          />
        ) : null}
        {draft.overlay === "mode" ? (
          <ModeMenu
            value={draft.mode}
            onChange={draft.setMode}
            onClose={draft.close}
          />
        ) : null}
      </div>
      <p className={shared.liveStatus} role="status">
        {draft.applied}
      </p>
      {draft.page ? (
        <DocumentPage
          label={`${view.panelTitle}, page ${draft.pageIndex + 1}`}
          blocks={draft.page.blocks}
          variant="editorial"
          zoom={draft.zoom}
          insertAfter={revision}
        />
      ) : null}
      <DocumentPager
        index={draft.pageIndex}
        count={draft.pages.length}
        onPage={draft.setPageIndex}
        zoom={draft.zoom}
        onZoom={draft.setZoom}
      />
    </>
  );
}
