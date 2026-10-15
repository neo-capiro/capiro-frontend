"use client";
import { useRef, useState } from "react";
import { InlineDialog } from "../../ui/InlineDialog";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import ui from "../../ui/meri-ui.module.css";
import { DownloadDialog } from "./DownloadDialog";
import {
  SourceScopeDetails,
  type SourceScopeDetailsView,
} from "./SourceScopeDetails";
import type { Heading } from "./types";
import styles from "./files.module.css";

export type SourceScopeView = SourceScopeDetailsView & { heading: Heading };

/**
 * 04.08 Artifact sharing and source scopes and 04.08A Source access review requested,
 * with the permitted source bundle download (Overlay · Download source bundle) when
 * the view offers one; `bundleOnLoad` opens that overlay on arrival.
 */
export function SourceScopeScreen({
  view,
  closeHref,
  unavailable,
  bundleOnLoad = false,
}: {
  view: SourceScopeView;
  closeHref?: string | undefined;
  unavailable: string;
  bundleOnLoad?: boolean;
}) {
  const [bundleOpen, setBundleOpen] = useState(bundleOnLoad);
  const bundleButton = useRef<HTMLButtonElement>(null);
  return (
    <div className={`${ui.page} ${styles.screen}`}>
      <MeriPageHeading
        title={view.heading.title}
        description={view.heading.description}
      />
      <InlineDialog
        title={view.title}
        context={view.context}
        closeHref={closeHref}
        unavailable={unavailable}
      >
        <SourceScopeDetails
          view={view}
          handlers={view.bundle ? { bundle: () => setBundleOpen(true) } : {}}
          bundleRef={bundleButton}
          unavailable={unavailable}
        />
      </InlineDialog>
      {view.bundle ? (
        <DownloadDialog
          open={bundleOpen}
          onOpenChange={setBundleOpen}
          view={view.bundle}
          unavailable={unavailable}
          returnFocus={bundleButton}
          footer={
            <button
              type="button"
              className={ui.ghost}
              onClick={() => setBundleOpen(false)}
            >
              Cancel
            </button>
          }
        />
      ) : null}
    </div>
  );
}
