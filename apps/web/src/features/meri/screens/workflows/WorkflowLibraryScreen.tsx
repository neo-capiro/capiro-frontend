"use client";
import { useState } from "react";
import { Notice } from "../../ui/Notice";
import { ActionRow } from "./ActionRow";
import { ToolingPage } from "./ToolingPage";
import { WorkflowField } from "./WorkflowField";
import { WorkflowTile, type WorkflowTileView } from "./WorkflowTile";
import type { ActionSpec } from "./types";
import styles from "./screens.module.css";
import tooling from "./tooling.module.css";

export type WorkflowLibraryView = {
  actions: readonly ActionSpec[];
  workflows: readonly WorkflowTileView[];
  /** Canonical empty-search state copy (11.05 "No search results"). */
  noResults: { title: string; explanation: string };
  note: string;
};

const matches = (tile: WorkflowTileView, query: string) =>
  `${tile.title} ${tile.description}`.toLowerCase().includes(query);

/** 12.01 Workflow library: defined workflows, filtered locally, each opening its typed setup. */
export function WorkflowLibraryScreen({
  view,
  backHref,
  unavailable,
}: {
  view: WorkflowLibraryView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = view.workflows.filter((tile) => matches(tile, needle));
  return (
    <ToolingPage
      title="Start with a workflow"
      description="A defined task, a confirmed subject and the sources needed to finish."
      backHref={backHref}
      unavailable={unavailable}
    >
      <div className={styles.librarySearch}>
        <WorkflowField
          field={{
            label: "Find a workflow",
            value: "",
            placeholder: "Search research, relationships, commitments…",
            helper: `${shown.length} named workflows · Your authorized scope`,
          }}
          value={query}
          onChange={setQuery}
          search
        />
        <div className={styles.stack}>
          <ActionRow
            label="Workflow actions"
            actions={view.actions}
            unavailable={unavailable}
          />
        </div>
      </div>
      {shown.length ? (
        <ul className={styles.tileGrid} aria-label="Workflow catalog">
          {shown.map((tile) => (
            <li key={tile.id}>
              <WorkflowTile tile={tile} unavailable={unavailable} />
            </li>
          ))}
        </ul>
      ) : (
        <Notice title={view.noResults.title}>
          {view.noResults.explanation}
        </Notice>
      )}
      <p className={tooling.caption}>{view.note}</p>
    </ToolingPage>
  );
}
