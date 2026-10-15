"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { LinkAction } from "../../ui/LinkAction";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import ui from "../../ui/meri-ui.module.css";
import { ArtifactCard } from "./ArtifactCard";
import type { Heading, WorkspaceFileGroup, WorkspaceFileRow } from "./types";
import { WorkspaceFileTree } from "./WorkspaceFileTree";
import shared from "./artifacts.module.css";
import styles from "./workspace-files.module.css";

export type WorkspaceFilesView = {
  heading: Heading;
  files: readonly WorkspaceFileRow[];
  groups: readonly WorkspaceFileGroup[];
  initialFileId: string;
  versionsHref?: string;
  uploadHref?: string;
  attachHref?: string;
};

const columns: readonly DataColumn<WorkspaceFileRow>[] = [
  { key: "file", label: "File", width: 420, render: (row) => row.name },
  {
    key: "version",
    label: "Version",
    width: 90,
    render: (row) => <span className={shared.mono}>{row.version}</span>,
  },
  { key: "status", label: "Status", width: 318, render: (row) => row.status },
];

function WorkspaceTreePanel({
  view,
  selectedId,
  onSelect,
  unavailable,
}: {
  view: WorkspaceFilesView;
  selectedId: string;
  onSelect: (id: string) => void;
  unavailable: string;
}) {
  return (
    <section className={styles.treePanel} aria-label="Workspace">
      <p className={shared.eyebrow}>Workspace</p>
      <WorkspaceFileTree
        groups={view.groups}
        files={view.files}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <LinkAction
        variant="outline"
        href={view.attachHref}
        unavailable={unavailable}
      >
        <Plus aria-hidden /> Attach an existing file
      </LinkAction>
    </section>
  );
}

function SelectedFileActions({
  versionsHref,
  fileHref,
  unavailable,
}: {
  versionsHref?: string | undefined;
  fileHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <div className={ui.row} role="group" aria-label="Selected file actions">
      <LinkAction
        variant="outline"
        href={versionsHref}
        unavailable={unavailable}
      >
        Versions
      </LinkAction>
      <LinkAction variant="primary" href={fileHref} unavailable={unavailable}>
        File to client
      </LinkAction>
      <button type="button" className={ui.ghost} disabled title={unavailable}>
        Rename
      </button>
      <button type="button" className={ui.ghost} disabled title={unavailable}>
        Delete
      </button>
    </div>
  );
}

/** 03.01 Workspace files: tree of inputs and outputs, searchable versioned file table. */
export function WorkspaceFilesScreen({
  view,
  unavailable,
}: {
  view: WorkspaceFilesView;
  unavailable: string;
}) {
  const [selectedId, setSelectedId] = useState(view.initialFileId);
  const [query, setQuery] = useState("");
  const rows = view.files.filter(
    (file) =>
      file.version &&
      file.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const selected = view.files.find((file) => file.id === selectedId);
  return (
    <div className={`${ui.page} ${shared.screen}`}>
      <MeriPageHeading
        title={view.heading.title}
        description={view.heading.description}
        action={
          <LinkAction
            variant="primary"
            href={view.uploadHref}
            unavailable={unavailable}
          >
            <Plus aria-hidden /> Upload
          </LinkAction>
        }
      />
      <div className={ui.row}>
        <LinkAction variant="outline" unavailable={unavailable}>
          Artifact formats
        </LinkAction>
      </div>
      <div className={`${shared.columns} ${shared.wideGap}`}>
        <WorkspaceTreePanel
          view={view}
          selectedId={selectedId}
          onSelect={setSelectedId}
          unavailable={unavailable}
        />
        <div className={`${shared.stack} ${shared.grow}`}>
          <label className={shared.field}>
            Search files
            <input
              type="search"
              className={shared.input}
              placeholder="Search by filename…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {rows.length ? (
            <DataTable
              caption="Versioned files"
              columns={columns}
              rows={rows}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : (
            <p className={styles.empty} role="status">
              No versioned file matches “{query}”.
            </p>
          )}
          {selected ? (
            <ArtifactCard file={selected} unavailable={unavailable} />
          ) : null}
          <SelectedFileActions
            versionsHref={view.versionsHref}
            fileHref={selected?.fileHref}
            unavailable={unavailable}
          />
        </div>
      </div>
    </div>
  );
}
