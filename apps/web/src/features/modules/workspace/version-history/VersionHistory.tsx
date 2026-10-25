"use client";

import { useState } from "react";
import type {
  SavedVersion,
  WorkspaceDraftDocument,
} from "../../../../shared/capiro/operations/workspace-documents";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Modal,
  Panel,
  StatusPanel,
  Tabs,
} from "../../../../shared/module-ui";
import { SectionPreview } from "../rich-document/SectionPreview";
import styles from "../workspace.module.css";
import {
  admitSavedVersions,
  chronologicalPair,
  compareSavedVersions,
  safeDocumentLines,
  unknownContentExplanations,
  versionParentClient,
} from "./version-history";

/**
 * Read-only saved-version history for a draft. The list is the existing
 * authorized `workspace.draft.versions` read; opening, selecting and comparing
 * never write and never substitute the live editor state for a saved snapshot.
 * Selecting a version only shows its own saved snapshot, and a row that does
 * not belong to this draft/client association is refused rather than shown.
 */
export function VersionHistory({ draft }: { draft: WorkspaceDraftDocument }) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [compareId, setCompareId] = useState<string>();
  const query = useCapiroQuery(
    "workspace.draft.versions",
    { params: { draftId: draft.id } },
    { enabled: open },
  );
  const admitted = admitSavedVersions(query.data ?? [], draft);
  const refused = Boolean(query.error) || Boolean(admitted.refusal);
  const versions = refused ? [] : admitted.versions;
  // Admission is the single source for what may be shown: on denial, a foreign
  // parent or a stale id the derived selection is empty, so no detail or compare
  // is retained. A client/resource switch remounts this view (parent key).
  const selected = versions.find((version) => version.id === selectedId);
  const other = versions.find((version) => version.id === compareId);
  const items = versions.map((version) => ({
    id: version.id,
    label: version.label ?? "Saved version",
  }));

  return (
    <>
      <ActionButton onClick={() => setOpen(true)}>History</ActionButton>
      <Modal open={open} onOpenChange={setOpen} title="Document history">
        <StatusPanel
          loading={query.loading}
          error={
            query.error ??
            (admitted.refusal ? new Error(admitted.refusal) : undefined)
          }
          onRetry={query.reload}
        >
          <p className={styles.secondary}>
            Read-only saved versions. Opening or comparing never changes the
            document.
          </p>
          {versions.length ? (
            <Tabs
              items={items}
              value={selectedId ?? ""}
              onChange={setSelectedId}
              label="Saved versions"
            />
          ) : (
            <p>No saved versions yet.</p>
          )}
          {selected && <SavedVersionDetail version={selected} />}
          {versions.length > 1 && selectedId && (
            <Tabs
              items={items}
              value={compareId ?? ""}
              onChange={setCompareId}
              label="Compare with"
            />
          )}
          {selected && other && selected.id !== other.id && (
            <SavedVersionComparison left={selected} right={other} />
          )}
          {selected && other && selected.id === other.id && (
            <p role="status">Choose two different saved versions to compare.</p>
          )}
        </StatusPanel>
      </Modal>
    </>
  );
}

function SavedVersionDetail({ version }: { version: SavedVersion }) {
  const sections = version.snapshot?.config?.sectionContent ?? {};
  const documents = version.snapshot?.documents ?? [];
  const unknown = unknownContentExplanations(version);
  return (
    <Panel title={version.label ?? "Saved version"}>
      <dl className={styles.versionFacts}>
        <dt>Saved</dt>
        <dd>{new Date(version.createdAt).toLocaleString()}</dd>
        <dt>Author</dt>
        <dd>{version.authorKind}</dd>
        <dt>Parent document</dt>
        <dd>{version.draftId}</dd>
        <dt>Client association</dt>
        <dd>
          {versionParentClient(version.snapshot) ?? "No client association"}
        </dd>
      </dl>
      <h3>{version.snapshot?.docTitle ?? "Untitled saved version"}</h3>
      {Object.entries(sections).map(([name, content]) => (
        <section key={name} aria-label={name}>
          <h4>{name}</h4>
          <SectionPreview value={content} />
        </section>
      ))}
      {documents.map((document) => {
        const lines = safeDocumentLines(document.body);
        return (
          <article key={document.id}>
            <h4>{document.name ?? "Untitled tab"}</h4>
            {lines ? (
              lines.map((line, index) => <p key={index}>{line}</p>)
            ) : (
              <p className={styles.secondary}>
                Unrecognised saved content is preserved read-only and is not
                rendered.
              </p>
            )}
          </article>
        );
      })}
      {unknown.length > 0 && (
        <details>
          <summary>Unrecognised saved content</summary>
          <ul>
            {unknown.map((item) => (
              <li key={item.label}>
                <strong>{item.label}</strong>: {item.detail}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Panel>
  );
}

function SavedVersionComparison({
  left,
  right,
}: {
  left: SavedVersion;
  right: SavedVersion;
}) {
  const [older, newer] = chronologicalPair(left, right);
  const diff = compareSavedVersions(older, newer);
  const changed =
    diff.titleChanged ||
    diff.tabsAdded.length > 0 ||
    diff.tabsRemoved.length > 0 ||
    diff.tabsReordered.length > 0 ||
    diff.tabsRenamed.length > 0 ||
    diff.bodiesChanged.length > 0 ||
    diff.sectionsAdded.length > 0 ||
    diff.sectionsRemoved.length > 0 ||
    diff.sectionsChanged.length > 0;
  return (
    <Panel
      title={`Comparing ${older.label ?? "saved version"} → ${newer.label ?? "saved version"}`}
    >
      <dl className={styles.versionFacts}>
        <dt>Earlier</dt>
        <dd>
          {new Date(older.createdAt).toLocaleString()} ·{" "}
          {older.label ?? "Saved version"}
        </dd>
        <dt>Later</dt>
        <dd>
          {new Date(newer.createdAt).toLocaleString()} ·{" "}
          {newer.label ?? "Saved version"}
        </dd>
        <dt>Title</dt>
        <dd>
          {diff.titleChanged
            ? `${older.snapshot?.docTitle ?? "Untitled"} → ${newer.snapshot?.docTitle ?? "Untitled"}`
            : "Unchanged"}
        </dd>
      </dl>
      {changed ? (
        <ul>
          {diff.tabsAdded.length > 0 && (
            <li>
              Tabs added: {diff.tabsAdded.map((tab) => tab.name).join(", ")}
            </li>
          )}
          {diff.tabsRemoved.length > 0 && (
            <li>
              Tabs removed: {diff.tabsRemoved.map((tab) => tab.name).join(", ")}
            </li>
          )}
          {diff.tabsReordered.length > 0 && (
            <li>
              Tabs reordered to:{" "}
              {diff.tabsReordered.map((tab) => tab.name).join(", ")}
            </li>
          )}
          {diff.tabsRenamed.map((tab) => (
            <li key={tab.id}>
              Tab renamed: {tab.from} → {tab.to}
            </li>
          ))}
          {diff.bodiesChanged.length > 0 && (
            <li>Tabs with new content: {diff.bodiesChanged.join(", ")}</li>
          )}
          {diff.sectionsAdded.length > 0 && (
            <li>Sections added: {diff.sectionsAdded.join(", ")}</li>
          )}
          {diff.sectionsRemoved.length > 0 && (
            <li>Sections removed: {diff.sectionsRemoved.join(", ")}</li>
          )}
          {diff.sectionsChanged.length > 0 && (
            <li>Sections changed: {diff.sectionsChanged.join(", ")}</li>
          )}
        </ul>
      ) : (
        <p>No differences between these saved versions.</p>
      )}
    </Panel>
  );
}
