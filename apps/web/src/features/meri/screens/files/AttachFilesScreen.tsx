"use client";
import { useRef, useState } from "react";
import { FileText, Layers, Plus } from "lucide-react";
import { MeriComposer } from "../../MeriComposer";
import { InlineDialog } from "../../ui/InlineDialog";
import { LinkAction } from "../../ui/LinkAction";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { Notice } from "../../ui/Notice";
import ui from "../../ui/meri-ui.module.css";
import { AttachedFiles } from "./AttachedFiles";
import type { AttachedFile, Heading } from "./types";
import styles from "./files.module.css";

export type AttachFilesView = {
  heading: Heading;
  accepted: string;
  access: { title: string; detail: string };
  attached: readonly AttachedFile[];
  draft: string;
};

/** 04.01 Upload and attachment menu: device upload, an authorized Capiro file, and the draft's attachments. */
export function AttachFilesScreen({
  view,
  links,
  unavailable,
}: {
  view: AttachFilesView;
  links: { capiro?: string; close?: string };
  unavailable: string;
}) {
  const [attached, setAttached] = useState(view.attached);
  const [draft, setDraft] = useState(view.draft);
  const textarea = useRef<HTMLTextAreaElement>(null);
  return (
    <div className={`${ui.page} ${styles.screen}`}>
      <MeriPageHeading
        title={view.heading.title}
        description={view.heading.description}
      />
      <InlineDialog
        title="Attach files"
        context="Upload from your device or choose an authorized Capiro file."
        closeHref={links.close}
        unavailable={unavailable}
      >
        <section className={styles.dropZone} aria-label="Upload from device">
          <Plus aria-hidden className={styles.dropIcon} />
          <h3 className={styles.sheetTitle}>Drop files here</h3>
          <p className={styles.small}>{view.accepted}</p>
          <button
            type="button"
            className={ui.primary}
            disabled
            title={unavailable}
          >
            <FileText aria-hidden /> Choose files
          </button>
        </section>
        <div className={ui.row} role="group" aria-label="Other sources">
          <LinkAction
            variant="outline"
            href={links.capiro}
            unavailable={unavailable}
          >
            <Layers aria-hidden /> From Capiro
          </LinkAction>
          <button
            type="button"
            className={ui.outline}
            disabled
            title={unavailable}
          >
            Paste a screenshot
          </button>
          <LinkAction
            variant="ghost"
            href={links.close}
            unavailable={unavailable}
          >
            Cancel
          </LinkAction>
        </div>
        <div className={styles.full}>
          <Notice tone="success" title={view.access.title}>
            {view.access.detail}
          </Notice>
        </div>
      </InlineDialog>
      <div className={styles.draft}>
        {attached.length ? (
          <AttachedFiles
            label="Attached to this draft"
            files={attached}
            onRemove={(id) =>
              setAttached((files) => files.filter((file) => file.id !== id))
            }
          />
        ) : (
          <p className={styles.small} role="status">
            No files are attached to this draft.
          </p>
        )}
        <MeriComposer draft={draft} onDraft={setDraft} textareaRef={textarea} />
      </div>
    </div>
  );
}
