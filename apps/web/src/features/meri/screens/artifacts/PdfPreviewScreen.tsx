"use client";
import { useRef, useState, type Ref } from "react";
import { Sparkle } from "lucide-react";
import { LinkAction } from "../../ui/LinkAction";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import ui from "../../ui/meri-ui.module.css";
import { DownloadDialog } from "../files/DownloadDialog";
import type { DownloadView } from "../files/types";
import { ArtifactActionBar } from "./ArtifactActionBar";
import { DetailList } from "./DetailList";
import { DocumentPage } from "./DocumentPage";
import { ThumbnailRail } from "./ThumbnailRail";
import type { DetailItem, DocumentPageView, Heading } from "./types";
import shared from "./artifacts.module.css";
import documentStyles from "./document.module.css";
import styles from "./previews.module.css";

export type PdfPreviewView = {
  heading: Heading;
  title: string;
  pages: readonly DocumentPageView[];
  details: readonly DetailItem[];
  /** Exact-version formats behind Download PDF (Overlay · Download PDF). */
  download: DownloadView;
};

/** Preview details beside the page: its checks, Download PDF and the revision route. */
function PreviewDetails({
  details,
  downloadRef,
  onDownload,
  reviseHref,
  unavailable,
}: {
  details: readonly DetailItem[];
  downloadRef: Ref<HTMLButtonElement>;
  onDownload: () => void;
  reviseHref: string | undefined;
  unavailable: string;
}) {
  return (
    <section
      className={`${shared.panel} ${styles.side}`}
      aria-label="Preview details"
    >
      <h2 className={shared.panelTitle}>Preview details</h2>
      <DetailList label="Preview checks" items={details} />
      <button
        ref={downloadRef}
        type="button"
        className={ui.primary}
        aria-haspopup="dialog"
        onClick={onDownload}
      >
        Download PDF
      </button>
      <LinkAction variant="outline" href={reviseHref} unavailable={unavailable}>
        <Sparkle aria-hidden /> Ask Meri to revise
      </LinkAction>
    </section>
  );
}

/**
 * 03.03 PDF and multi-page preview (and 03.03A to C opened at a later page): page rail,
 * read-only page and preview checks. Download PDF opens the exact-version download
 * dialog (Overlay · Download PDF), open on arrival with `downloadOnLoad`.
 */
export function PdfPreviewScreen({
  view,
  reviseHref,
  unavailable,
  initialPageIndex = 0,
  downloadOnLoad = false,
}: {
  view: PdfPreviewView;
  reviseHref?: string | undefined;
  unavailable: string;
  initialPageIndex?: number;
  downloadOnLoad?: boolean | undefined;
}) {
  const [downloadOpen, setDownloadOpen] = useState(downloadOnLoad);
  const downloadButton = useRef<HTMLButtonElement>(null);
  const [pageId, setPageId] = useState(
    view.pages[initialPageIndex]?.id ?? view.pages[0]?.id ?? "",
  );
  const index = Math.max(
    0,
    view.pages.findIndex((page) => page.id === pageId),
  );
  const page = view.pages[index];
  return (
    <div className={`${ui.page} ${shared.screen}`}>
      <MeriPageHeading
        title={view.heading.title}
        description={view.heading.description}
      />
      <ArtifactActionBar reviseHref={reviseHref} unavailable={unavailable} />
      <div className={shared.columns}>
        <ThumbnailRail
          label="Pages"
          variant="page"
          className={styles.pageRail}
          items={view.pages.map((item, i) => ({
            id: item.id,
            number: String(i + 1),
            label: item.label,
          }))}
          selectedId={pageId}
          onSelect={setPageId}
        />
        {page ? (
          <DocumentPage
            label={`${view.title}, page ${index + 1} of ${view.pages.length}`}
            blocks={page.blocks}
            variant="sans"
            className={documentStyles.pdfPage}
          />
        ) : null}
        <PreviewDetails
          details={view.details}
          downloadRef={downloadButton}
          onDownload={() => setDownloadOpen(true)}
          reviseHref={reviseHref}
          unavailable={unavailable}
        />
      </div>
      <DownloadDialog
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
        view={view.download}
        unavailable={unavailable}
        returnFocus={downloadButton}
        footer={
          <button
            type="button"
            className={ui.ghost}
            onClick={() => setDownloadOpen(false)}
          >
            Cancel
          </button>
        }
      />
    </div>
  );
}
