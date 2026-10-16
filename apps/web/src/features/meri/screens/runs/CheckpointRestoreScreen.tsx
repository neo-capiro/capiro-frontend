"use client";
import { Checkpoint, CheckpointIcon } from "@capiro/ui/checkpoint";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { Notice } from "../../ui/Notice";
import { Panel } from "../../ui/Panel";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import styles from "./runs.module.css";

export type SavedItem = {
  id: string;
  item: string;
  /** Workspace files render in the monospace file style. */
  file: boolean;
  verification: string;
};
export type CheckpointRestoreView = {
  context: string;
  /** Present only when the projected run events include a verified checkpoint. */
  restored?: { title: string; detail: string };
  checkpoint: string;
  items: readonly SavedItem[];
  forkHref?: string;
};

const columns: readonly DataColumn<SavedItem>[] = [
  {
    key: "item",
    label: "Saved item",
    width: 1,
    render: (row) =>
      row.file ? <span className={styles.fileName}>{row.item}</span> : row.item,
  },
  {
    key: "verification",
    label: "Verification",
    width: 1,
    render: (row) => row.verification,
  },
];

/** 02.06 Checkpoint and verified restore: what the checkpoint preserved and how to continue. */
export function CheckpointRestoreScreen({
  view,
  unavailable,
}: {
  view: CheckpointRestoreView;
  unavailable: string;
}) {
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Continue your interrupted work"
        description={view.context}
      />
      {view.restored ? (
        <Notice tone="success" title={view.restored.title}>
          {view.restored.detail}
        </Notice>
      ) : null}
      <Panel label={view.checkpoint}>
        <Checkpoint className={styles.checkpoint}>
          <CheckpointIcon aria-hidden />
          <h2>{view.checkpoint}</h2>
        </Checkpoint>
        <div className={styles.fill}>
          <DataTable
            caption={`${view.checkpoint} saved items`}
            columns={columns}
            rows={view.items}
          />
        </div>
        <div className={ui.row}>
          <button
            type="button"
            className={ui.primary}
            disabled
            title={unavailable}
          >
            Resume this run
          </button>
          <LinkAction
            variant="outline"
            href={view.forkHref}
            unavailable={unavailable}
          >
            Fork into a new conversation
          </LinkAction>
        </div>
      </Panel>
      <p className={ui.muted}>
        Resuming continues this run. Forking starts new work from this
        checkpoint. Completed external actions remain recorded.
      </p>
    </div>
  );
}
