"use client";

import { useState, type ReactNode } from "react";
import type {
  SavedVersion,
  WorkspaceDraftDocument,
} from "../../../../shared/capiro/operations/workspace-documents";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { ActionButton, Modal, StatusPanel } from "../../../../shared/module-ui";
import { SavedVersionDetail } from "./SavedVersionDetail";
import styles from "../workspace.module.css";
import presentation from "../ordinary-presentation.module.css";
import {
  admitSavedVersions,
  chronologicalPair,
  compareSavedVersions,
  hasShownChanges,
} from "./version-history";

/**
 * Read-only saved-version history for a draft. The list is the existing
 * authorized `workspace.draft.versions` read; opening, selecting and comparing
 * never write and never substitute the live editor state for a saved snapshot.
 * Selecting a version only shows its own saved snapshot, and a row that does
 * not belong to this draft/client association is refused rather than shown.
 */
export function VersionHistory({
  draft,
  renderSelected,
}: {
  draft: WorkspaceDraftDocument;
  renderSelected?: (version: SavedVersion) => ReactNode;
}) {
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
  return (
    <>
      <ActionButton onClick={() => setOpen(true)}>History</ActionButton>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Version history"
        description={draft.docTitle}
        className={presentation.historyModal}
        footer={
          <ActionButton onClick={() => setOpen(false)}>Close</ActionButton>
        }
      >
        <StatusPanel
          loading={query.loading}
          error={
            query.error ??
            (admitted.refusal ? new Error(admitted.refusal) : undefined)
          }
          onRetry={query.reload}
        >
          <p className={presentation.qualifier}>
            {renderSelected
              ? "Select a saved version to inspect its content and publication options."
              : "Read-only saved versions. Opening or comparing never changes the document."}
          </p>
          {versions.length ? (
            <ul
              className={presentation.versionRows}
              aria-label="Saved versions"
            >
              {versions.map((version) => (
                <li
                  key={version.id}
                  data-selected={selected?.id === version.id || undefined}
                >
                  <ActionButton
                    className={presentation.versionSelect}
                    aria-label={`View ${version.label ?? "Saved version"} · ${new Date(version.createdAt).toLocaleDateString()}`}
                    aria-pressed={selected?.id === version.id}
                    onClick={() => {
                      setSelectedId(version.id);
                      setCompareId(undefined);
                    }}
                  >
                    {version.label ?? "Saved version"} ·{" "}
                    <time dateTime={version.createdAt}>
                      {new Date(version.createdAt).toLocaleDateString()}
                    </time>
                  </ActionButton>
                  {versions.length > 1 && (
                    <ActionButton
                      aria-label={`Compare with ${version.label ?? "saved version"}`}
                      disabled={!selected || selected.id === version.id}
                      onClick={() => setCompareId(version.id)}
                    >
                      Compare
                    </ActionButton>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No saved versions yet.</p>
          )}
          {selected && !other && <SavedVersionDetail version={selected} />}
          {selected && !other && !query.loading && renderSelected?.(selected)}
          {selected && other && selected.id === other.id && (
            <p>Choose two different saved versions to compare.</p>
          )}
          {selected && other && selected.id !== other.id && (
            <SavedVersionComparison left={selected} right={other} />
          )}
        </StatusPanel>
      </Modal>
    </>
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
  const changed = hasShownChanges(diff);
  return (
    <section
      className={presentation.versionComparison}
      aria-label="Saved version comparison"
    >
      <h3>{`Comparing ${older.label ?? "saved version"} → ${newer.label ?? "saved version"}`}</h3>
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
          {diff.titleChanged ? (
            <span className={presentation.beforeAfter}>
              <span>{older.snapshot?.docTitle ?? "Title unavailable"}</span>
              <span role="img" aria-label="changed to">
                →
              </span>
              <span>{newer.snapshot?.docTitle ?? "Title unavailable"}</span>
            </span>
          ) : (
            "Unchanged"
          )}
        </dd>
      </dl>
      {changed && (
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
      )}
      {!changed && diff.otherContentChanged && (
        <p>
          Saved content that this comparison does not show — the saved ask,
          section ordering or other preserved fields — differs between these
          versions, so they are not identical.
        </p>
      )}
      {!changed && !diff.otherContentChanged && (
        <p>No differences between these saved versions.</p>
      )}
    </section>
  );
}
