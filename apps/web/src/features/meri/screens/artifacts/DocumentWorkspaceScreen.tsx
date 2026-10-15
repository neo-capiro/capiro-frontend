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
import type { DocumentOpening, DocumentWorkspaceView } from "./types";
import { versionColumns } from "./VersionsScreen";
import { useCommentThread } from "./useCommentThread";
import { useDocumentDraft } from "./useDocumentDraft";
import { WorkspacePanes } from "./WorkspacePanes";
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

/** Versions tab: the artifact's versions and the route to compare them. */
function VersionsTab({
  view,
  compareHref,
  unavailable,
}: {
  view: DocumentWorkspaceView;
  compareHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <>
      <DataTable
        caption="Versions"
        columns={versionColumns}
        rows={view.versions}
      />
      <LinkAction
        variant="outline"
        href={compareHref}
        unavailable={unavailable}
      >
        Compare versions
      </LinkAction>
    </>
  );
}

/**
 * 03.02 Word document workspace (read-only Viewing) and the document working draft
 * (Editing): conversation beside the artifact, with in-screen document overlays.
 * `opening` starts at another page (03.02A to C) or with the comment overlay open (13.24 to 13.26).
 */
export function DocumentWorkspaceScreen({
  view,
  editable,
  links,
  unavailable,
  opening,
}: {
  view: DocumentWorkspaceView;
  editable: boolean;
  links: DocumentWorkspaceLinks;
  unavailable: string;
  opening?: DocumentOpening | undefined;
}) {
  const draft = useDocumentDraft(view.pages, view.suggestion, opening);
  const thread = useCommentThread(view.commentThread, opening?.comments);
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
      <WorkspacePanes
        artifactLabel={editable ? "Draft" : "Document"}
        conversation={
          <ConversationPane
            view={view.conversation}
            unavailable={unavailable}
          />
        }
        artifact={
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
                thread={thread}
                editable={editable}
                editHref={links.edit}
                unavailable={unavailable}
              />
            ) : tab === "versions" ? (
              <VersionsTab
                view={view}
                compareHref={links.versions}
                unavailable={unavailable}
              />
            ) : (
              <DetailList
                label="Sources"
                items={view.sources}
                variant="references"
              />
            )}
          </section>
        }
      />
    </div>
  );
}
