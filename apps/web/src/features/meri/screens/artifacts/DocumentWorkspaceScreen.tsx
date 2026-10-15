"use client";
import { useState } from "react";
import { DataTable } from "../../ui/DataTable";
import { LinkAction } from "../../ui/LinkAction";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import ui from "../../ui/meri-ui.module.css";
import { ArtifactActionBar } from "./ArtifactActionBar";
import { ConversationPane } from "./ConversationPane";
import { DetailList } from "./DetailList";
import { DocumentSurface } from "./DocumentSurface";
import type { DocumentWorkspaceView } from "./types";
import { versionColumns } from "./VersionsScreen";
import { useDocumentDraft } from "./useDocumentDraft";
import shared from "./artifacts.module.css";
import styles from "./document.module.css";

export type DocumentWorkspaceLinks = {
  download?: string;
  revise?: string;
  file?: string;
  edit?: string;
  back?: string;
  versions?: string;
};
type Tab = "preview" | "versions" | "sources";

/** Working-draft actions: saving and versioning are not executed; Back returns to the artifact. */
function DraftActions({
  backHref,
  unavailable,
}: {
  backHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <div className={ui.row} role="group" aria-label="Working draft actions">
      <button type="button" className={ui.primary} disabled title={unavailable}>
        Save draft
      </button>
      <button type="button" className={ui.outline} disabled title={unavailable}>
        Create new version
      </button>
      <LinkAction variant="ghost" href={backHref} unavailable={unavailable}>
        Back to artifact
      </LinkAction>
    </div>
  );
}

/**
 * 03.02 Word document workspace (read-only Viewing) and the document working draft
 * (Editing): conversation beside the artifact, with in-screen document overlays.
 */
export function DocumentWorkspaceScreen({
  view,
  editable,
  links,
  unavailable,
}: {
  view: DocumentWorkspaceView;
  editable: boolean;
  links: DocumentWorkspaceLinks;
  unavailable: string;
}) {
  const draft = useDocumentDraft(view.pages, view.suggestion);
  const [tab, setTab] = useState<Tab>("preview");
  const tabs = [
    { id: "preview", label: editable ? "Editor" : "Preview" },
    { id: "versions", label: "Versions" },
    { id: "sources", label: "Sources" },
  ] as const;
  return (
    <div className={`${ui.page} ${shared.screen}`}>
      <MeriPageHeading
        title={view.heading.title}
        description={view.heading.description}
      />
      {view.caption ? (
        <p className={`${shared.caption} ${styles.headingCaption}`}>
          {view.caption}
        </p>
      ) : null}
      <div className={shared.columns}>
        <ConversationPane view={view.conversation} unavailable={unavailable} />
        <section className={styles.panel} aria-label={view.panelTitle}>
          <h2 className={styles.panelTitle}>{view.panelTitle}</h2>
          {editable ? (
            <DraftActions backHref={links.back} unavailable={unavailable} />
          ) : (
            <ArtifactActionBar
              downloadHref={links.download}
              reviseHref={links.revise}
              fileHref={links.file}
              unavailable={unavailable}
            />
          )}
          <SegmentedTabs
            label="Artifact view"
            options={tabs}
            value={tab}
            onChange={setTab}
          />
          {tab === "preview" ? (
            <DocumentSurface
              view={view}
              draft={draft}
              editable={editable}
              editHref={links.edit}
              unavailable={unavailable}
            />
          ) : tab === "versions" ? (
            <>
              <DataTable
                caption="Versions"
                columns={versionColumns}
                rows={view.versions}
              />
              <LinkAction
                variant="outline"
                href={links.versions}
                unavailable={unavailable}
              >
                Compare versions
              </LinkAction>
            </>
          ) : (
            <DetailList
              label="Sources"
              items={view.sources}
              variant="references"
            />
          )}
        </section>
      </div>
    </div>
  );
}
