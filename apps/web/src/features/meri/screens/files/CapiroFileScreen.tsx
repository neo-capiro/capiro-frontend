"use client";
import { useRef, useState } from "react";
import { Layers } from "lucide-react";
import { LinkAction } from "../../ui/LinkAction";
import { MeriDialog } from "../../ui/MeriDialog";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import ui from "../../ui/meri-ui.module.css";
import { CapiroFilePicker, type CapiroFileRow } from "./CapiroFilePicker";
import type { Heading } from "./types";
import styles from "./files.module.css";

export type CapiroFileView = {
  heading: Heading;
  scope: string;
  files: readonly CapiroFileRow[];
  query: string;
  selected?: string;
};

/** 04.02 Attach an authorized Capiro file: picker dialog over the attachment screen, open on arrival. */
export function CapiroFileScreen({
  view,
  backHref,
  unavailable,
}: {
  view: CapiroFileView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  const [open, setOpen] = useState(true);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <div className={`${ui.page} ${styles.screen}`}>
      <MeriPageHeading
        title={view.heading.title}
        description={view.heading.description}
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
            <Layers aria-hidden /> Choose a Capiro file
          </button>
          <LinkAction variant="ghost" href={backHref} unavailable={unavailable}>
            Back to attachments
          </LinkAction>
        </div>
      )}
      <MeriDialog
        open={open}
        onOpenChange={setOpen}
        returnFocus={trigger}
        title="Choose a Capiro file"
        description={view.scope}
        placement="top"
        width="extra-wide"
      >
        <CapiroFilePicker
          files={view.files}
          initialQuery={view.query}
          initialSelected={view.selected}
          onCancel={() => setOpen(false)}
          unavailable={unavailable}
        />
      </MeriDialog>
    </div>
  );
}
