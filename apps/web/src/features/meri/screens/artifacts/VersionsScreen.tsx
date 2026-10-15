"use client";
import { Sparkle } from "lucide-react";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { LinkAction } from "../../ui/LinkAction";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { Notice } from "../../ui/Notice";
import { StatusPill } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import type { Heading, VersionRow } from "./types";
import shared from "./artifacts.module.css";
import styles from "./versions.module.css";

export type VersionSnapshot = {
  id: string;
  title: string;
  summary: string;
  section: string;
  text: string;
  status: string;
  previewHref?: string;
};
export type VersionsView = {
  heading: Heading;
  rows: readonly VersionRow[];
  comparison: readonly VersionSnapshot[];
  lineage: { title: string; detail: string };
  reviseHref?: string;
};

export const versionColumns: readonly DataColumn<VersionRow>[] = [
  {
    key: "version",
    label: "Version",
    width: 150,
    render: (row) => row.version,
  },
  {
    key: "change",
    label: "Requested change",
    width: 520,
    render: (row) => row.change,
  },
  {
    key: "created",
    label: "Created",
    width: 250,
    render: (row) => row.created,
  },
  {
    key: "validation",
    label: "Validation",
    width: 232,
    render: (row) => row.validation,
  },
];

/** 03.09 Versions and comparison: immutable versions side by side with their lineage. */
export function VersionsScreen({
  view,
  unavailable,
}: {
  view: VersionsView;
  unavailable: string;
}) {
  return (
    <div className={`${ui.page} ${shared.screen}`}>
      <MeriPageHeading
        title={view.heading.title}
        description={view.heading.description}
      />
      <DataTable caption="Versions" columns={versionColumns} rows={view.rows} />
      <div className={shared.columns}>
        {view.comparison.map((version) => (
          <article
            key={version.id}
            className={styles.version}
            aria-label={version.title}
          >
            <h2 className={styles.versionTitle}>{version.title}</h2>
            <p className={shared.caption}>{version.summary}</p>
            <h3 className={shared.panelTitle}>{version.section}</h3>
            <p className={styles.versionText}>{version.text}</p>
            <StatusPill tone="success">{version.status}</StatusPill>
            <LinkAction
              variant="outline"
              href={version.previewHref}
              unavailable={unavailable}
            >
              Preview this version
            </LinkAction>
            <button
              type="button"
              className={ui.ghost}
              disabled
              title={unavailable}
            >
              Download exact version
            </button>
          </article>
        ))}
      </div>
      <Notice tone="success" title={view.lineage.title}>
        {view.lineage.detail}
      </Notice>
      <div className={ui.row}>
        <LinkAction
          variant="primary"
          href={view.reviseHref}
          unavailable={unavailable}
        >
          <Sparkle aria-hidden /> Revise current version
        </LinkAction>
      </div>
    </div>
  );
}
