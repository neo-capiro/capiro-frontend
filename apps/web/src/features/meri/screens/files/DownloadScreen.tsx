"use client";
import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { LinkAction } from "../../ui/LinkAction";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import ui from "../../ui/meri-ui.module.css";
import { DownloadDialog } from "./DownloadDialog";
import type { DownloadView, Heading } from "./types";
import styles from "./files.module.css";

/** 04.05 Download exact artifact version: format choice for the displayed version, open on arrival. */
export function DownloadScreen({
  heading,
  download,
  previewHref,
  unavailable,
}: {
  heading: Heading;
  download: DownloadView;
  previewHref?: string | undefined;
  unavailable: string;
}) {
  const [open, setOpen] = useState(true);
  const trigger = useRef<HTMLButtonElement>(null);
  const back = (
    <LinkAction variant="ghost" href={previewHref} unavailable={unavailable}>
      Back to preview
    </LinkAction>
  );
  return (
    <div className={`${ui.page} ${styles.screen}`}>
      <MeriPageHeading
        title={heading.title}
        description={heading.description}
      />
      {open ? null : (
        <div className={ui.row}>
          <button
            type="button"
            ref={trigger}
            className={ui.outline}
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            <ChevronDown aria-hidden /> Choose a format
          </button>
          {back}
        </div>
      )}
      <DownloadDialog
        open={open}
        onOpenChange={setOpen}
        view={download}
        unavailable={unavailable}
        returnFocus={trigger}
        footer={back}
      />
    </div>
  );
}
