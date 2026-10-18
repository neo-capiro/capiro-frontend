"use client";
import { useState } from "react";
import { FormField } from "../../ui/FormField";
import { InlineDialog } from "../../ui/InlineDialog";
import { LinkAction } from "../../ui/LinkAction";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { Notice } from "../../ui/Notice";
import ui from "../../ui/meri-ui.module.css";
import type { Heading } from "./types";
import styles from "./files.module.css";

export type FileToClientView = {
  heading: Heading;
  title: string;
  context: string;
  version: string;
  client: string;
  destination: string;
  fileName: string;
  access: string;
  review: { title: string; detail: string };
};

/**
 * 04.04 File artifact to client: the exact version, client, destination and
 * audience are bound context; only the proposed file name is edited locally
 * before the governed filing proposal is reviewed.
 */
export function FileToClientScreen({
  view,
  links,
  unavailable,
}: {
  view: FileToClientView;
  links: { artifact?: string; sourceScopes?: string; review?: string };
  unavailable: string;
}) {
  const [fileName, setFileName] = useState(view.fileName);
  return (
    <div className={`${ui.page} ${styles.screen} ${styles.filingScreen}`}>
      <MeriPageHeading
        title={view.heading.title}
        description={view.heading.description}
      />
      <InlineDialog
        title={view.title}
        context={view.context}
        closeHref={links.artifact}
        unavailable={unavailable}
      >
        <FormField label="Artifact version" value={view.version} />
        <FormField label="Client" value={view.client} />
        <FormField label="Destination folder" value={view.destination} />
        <FormField label="File name" value={fileName} onChange={setFileName} />
        <FormField label="Who can access it" value={view.access} />
        <div className={styles.full}>
          <Notice tone="warning" title={view.review.title}>
            {view.review.detail}
          </Notice>
        </div>
        <div className={ui.row}>
          <LinkAction
            variant="outline"
            href={links.artifact}
            unavailable={unavailable}
          >
            Cancel
          </LinkAction>
          <LinkAction
            variant="outline"
            href={links.sourceScopes}
            unavailable={unavailable}
          >
            Review source scopes
          </LinkAction>
          <LinkAction
            variant="primary"
            href={links.review}
            unavailable={unavailable}
          >
            Review filing proposal
          </LinkAction>
        </div>
      </InlineDialog>
    </div>
  );
}
