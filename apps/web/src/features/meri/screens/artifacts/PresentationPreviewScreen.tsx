"use client";
import { useState } from "react";
import { ArrowUpRight, Sparkle } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import ui from "../../ui/meri-ui.module.css";
import {
  ArtifactFlowActions,
  ArtifactFlowSheets,
  useArtifactSheet,
} from "../files/ArtifactFlows";
import type { ArtifactFlowView } from "../files/types";
import { DetailList } from "./DetailList";
import { ThumbnailRail } from "./ThumbnailRail";
import type { DetailItem, Heading } from "./types";
import shared from "./artifacts.module.css";
import styles from "./previews.module.css";

export type SlideView = {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  footer: string;
  notes: string;
  notesSources: string;
};
export type PresentationView = {
  heading: Heading;
  slides: readonly SlideView[];
  checks: readonly DetailItem[];
};

/** 03.05 Presentation preview: slide filmstrip, slide canvas, speaker notes and checks. */
export function PresentationPreviewScreen({
  view,
  flow,
  unavailable,
}: {
  view: PresentationView;
  /** Revise, file and download sheets for this deck. */
  flow: ArtifactFlowView;
  unavailable: string;
}) {
  const sheets = useArtifactSheet();
  const [slideId, setSlideId] = useState(view.slides[0]?.id ?? "");
  const index = Math.max(
    0,
    view.slides.findIndex((slide) => slide.id === slideId),
  );
  const slide = view.slides[index];
  return (
    <div className={`${ui.page} ${shared.screen}`}>
      <MeriPageHeading
        title={view.heading.title}
        description={view.heading.description}
      />
      <ArtifactFlowActions flow={flow} onOpen={sheets.open} />
      <div className={shared.columns}>
        <ThumbnailRail
          label="Slides"
          variant="slide"
          className={styles.slideRail}
          items={view.slides.map((item, i) => ({
            id: item.id,
            number: String(i + 1).padStart(2, "0"),
            label: item.label,
          }))}
          selectedId={slideId}
          onSelect={setSlideId}
        />
        {slide ? (
          <div className={styles.slideColumn}>
            <article
              className={styles.slide}
              aria-label={`Slide ${index + 1} of ${view.slides.length}`}
            >
              <p className={shared.eyebrow}>{slide.eyebrow}</p>
              <h2 className={styles.slideTitle}>{slide.title}</h2>
              <p className={styles.slideSubtitle}>{slide.subtitle}</p>
              <p className={styles.slideFooter}>{slide.footer}</p>
            </article>
            <section className={shared.panel} aria-label="Speaker notes">
              <h3 className={shared.panelTitle}>Speaker notes</h3>
              <p className={styles.notes}>{slide.notes}</p>
              <button
                type="button"
                className={ui.ghost}
                disabled
                title={unavailable}
              >
                <ArrowUpRight aria-hidden /> {slide.notesSources}
              </button>
            </section>
          </div>
        ) : null}
        <section
          className={`${shared.panel} ${styles.narrowSide}`}
          aria-label="Ready to share"
        >
          <h2 className={shared.panelTitle}>Ready to share</h2>
          <DetailList label="Presentation checks" items={view.checks} />
          <button
            type="button"
            className={ui.outline}
            aria-haspopup="dialog"
            onClick={() => sheets.open("revise")}
          >
            <Sparkle aria-hidden /> Revise deck
          </button>
        </section>
      </div>
      <ArtifactFlowSheets
        flow={flow}
        sheet={sheets.sheet}
        onClose={sheets.close}
        unavailable={unavailable}
      />
    </div>
  );
}
