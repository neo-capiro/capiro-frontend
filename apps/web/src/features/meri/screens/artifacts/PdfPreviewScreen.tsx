"use client";
import { useState } from "react";
import { Sparkle } from "lucide-react";
import { LinkAction } from "../../ui/LinkAction";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import ui from "../../ui/meri-ui.module.css";
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
};

/** 03.03 PDF and multi-page preview: page rail, read-only page and preview checks. */
export function PdfPreviewScreen({
  view,
  reviseHref,
  unavailable,
}: {
  view: PdfPreviewView;
  reviseHref?: string | undefined;
  unavailable: string;
}) {
  const [pageId, setPageId] = useState(view.pages[0]?.id ?? "");
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
        <section
          className={`${shared.panel} ${styles.side}`}
          aria-label="Preview details"
        >
          <h2 className={shared.panelTitle}>Preview details</h2>
          <DetailList label="Preview checks" items={view.details} />
          <button
            type="button"
            className={ui.primary}
            disabled
            title={unavailable}
          >
            Download PDF
          </button>
          <LinkAction
            variant="outline"
            href={reviseHref}
            unavailable={unavailable}
          >
            <Sparkle aria-hidden /> Ask Meri to revise
          </LinkAction>
        </section>
      </div>
    </div>
  );
}
