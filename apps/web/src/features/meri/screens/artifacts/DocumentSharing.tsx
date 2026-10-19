"use client";
import { useState, type RefObject } from "react";
import { MeriDialog } from "../../ui/MeriDialog";
import ui from "../../ui/meri-ui.module.css";
import { DownloadDialog } from "../files/DownloadDialog";
import {
  SourceScopeDetails,
  type SourceScopeDetailsView,
} from "../files/SourceScopeDetails";
import styles from "./document-sharing.module.css";

type SharingOverlay = "share" | "bundle";

/** Local open state of the document's sharing dialog (04.08B) and the source bundle download it opens. */
export function useDocumentSharing(openOnLoad: boolean) {
  const [overlay, setOverlay] = useState<SharingOverlay | null>(
    openOnLoad ? "share" : null,
  );
  return { overlay, setOverlay };
}

export type DocumentSharingControls = ReturnType<typeof useDocumentSharing>;

/**
 * 04.08B Artifact sharing opened from the document workspace: the sharing view as a
 * dialog over the document. Close and Back to document return to the same page;
 * Download source bundle swaps to the bundle download, whose Cancel returns here.
 */
export function DocumentSharingDialogs({
  view,
  sharing,
  returnFocus,
  unavailable,
}: {
  view: SourceScopeDetailsView;
  sharing: DocumentSharingControls;
  /** The Share control, focused when the dialogs close. */
  returnFocus: RefObject<HTMLButtonElement | null>;
  unavailable: string;
}) {
  const { overlay, setOverlay } = sharing;
  const close = () => setOverlay(null);
  const backToShare = () => setOverlay("share");
  return (
    <>
      <MeriDialog
        open={overlay === "share"}
        onOpenChange={(open) => (open ? undefined : close())}
        title={view.title}
        description={view.context}
        width="extra-wide"
        returnFocus={returnFocus}
      >
        <div className={styles.body}>
          <SourceScopeDetails
            view={view}
            handlers={{
              close,
              ...(view.bundle ? { bundle: () => setOverlay("bundle") } : {}),
            }}
            unavailable={unavailable}
          />
        </div>
      </MeriDialog>
      {view.bundle ? (
        <DownloadDialog
          open={overlay === "bundle"}
          onOpenChange={(open) => (open ? undefined : backToShare())}
          view={view.bundle}
          unavailable={unavailable}
          returnFocus={returnFocus}
          footer={
            <button type="button" className={ui.ghost} onClick={backToShare}>
              Cancel
            </button>
          }
        />
      ) : null}
    </>
  );
}
