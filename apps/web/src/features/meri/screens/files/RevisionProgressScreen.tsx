import { X } from "lucide-react";
import { LinkAction } from "../../ui/LinkAction";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { Notice } from "../../ui/Notice";
import ui from "../../ui/meri-ui.module.css";
import { PipelineSteps } from "./PipelineSteps";
import type { Heading, PipelineStep } from "./types";
import styles from "./files.module.css";

export type RevisionProgressView = {
  heading: Heading;
  steps: readonly PipelineStep[];
  preserved: { title: string; detail: string };
};

/** 04.06 Revision progress and verification: the new version publishes only after its checks pass. */
export function RevisionProgressScreen({
  view,
  currentHref,
  unavailable,
}: {
  view: RevisionProgressView;
  currentHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <div className={`${ui.page} ${styles.screen}`}>
      <MeriPageHeading
        title={view.heading.title}
        description={view.heading.description}
      />
      <div className={ui.row}>
        <LinkAction variant="outline" unavailable={unavailable}>
          Format-specific checks
        </LinkAction>
      </div>
      <section className={styles.panel} aria-label="Revision pipeline">
        <PipelineSteps label="Revision steps" steps={view.steps} />
        <div className={ui.row} role="group" aria-label="Revision controls">
          <LinkAction
            variant="outline"
            href={currentHref}
            unavailable={unavailable}
          >
            View current version
          </LinkAction>
          <button
            type="button"
            className={ui.ghost}
            disabled
            title={unavailable}
          >
            <X aria-hidden /> Stop revision
          </button>
        </div>
      </section>
      <Notice tone="success" title={view.preserved.title}>
        {view.preserved.detail}
      </Notice>
    </div>
  );
}
