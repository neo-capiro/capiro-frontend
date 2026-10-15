"use client";
import { FileText } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { LinkAction } from "../../ui/LinkAction";
import { Notice } from "../../ui/Notice";
import { OutcomeToast } from "../../ui/OutcomeToast";
import { Panel } from "../../ui/Panel";
import ui from "../../ui/meri-ui.module.css";
import styles from "./routines.module.css";

export type RoutineRun = {
  id: string;
  status: string;
  output: string;
  usage: string;
  started: string;
};

const columns: readonly DataColumn<RoutineRun>[] = [
  { key: "run", label: "Run", width: 160, render: (row) => row.id },
  { key: "status", label: "Status", width: 170, render: (row) => row.status },
  { key: "output", label: "Output", width: 380, render: (row) => row.output },
  { key: "usage", label: "Usage", width: 150, render: (row) => row.usage },
  {
    key: "started",
    label: "Started",
    width: 292,
    render: (row) => row.started,
  },
];

/** 08.04 Routine history and authority changes, with the paused-routine outcome overlay. */
export function RoutineHistoryScreen({
  runs,
  routine,
  unavailable,
}: {
  runs: readonly RoutineRun[];
  routine: string;
  unavailable: string;
}) {
  const disabled = { disabled: true, title: unavailable } as const;
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Routine history"
        description="Every run keeps its own evidence, output and usage record."
      />
      <DataTable caption={`${routine} runs`} columns={columns} rows={runs} />
      <div className={ui.row}>
        <button type="button" className={ui.primary} {...disabled}>
          <FileText aria-hidden /> Open output
        </button>
        <button type="button" className={ui.outline} {...disabled}>
          View failed run
        </button>
      </div>
      <Notice
        tone="warning"
        title="Paused · No future run is queued"
        action={
          <button type="button" className={ui.outline} {...disabled}>
            Resume routine
          </button>
        }
      >
        You can resume this routine while your current authority remains valid.
      </Notice>
      <Notice
        tone="danger"
        title="Automatically disabled after access changed"
        action={
          <LinkAction variant="outline" unavailable={unavailable}>
            Review current access
          </LinkAction>
        }
      >
        A routine cannot continue using revoked sources or connections. Update
        its authorized scope before re-enabling.
      </Notice>
      <Panel label="Cancel routine confirmation" tone="muted">
        <h2 className={styles.confirmTitle}>Cancel future runs?</h2>
        <p className={ui.muted}>
          Past outputs remain available subject to current access and retention
          rules.
        </p>
        <button type="button" className={ui.outline} {...disabled}>
          Confirm cancellation
        </button>
      </Panel>
      <OutcomeToast
        title="Routine paused"
        detail="No future run is queued. Past outputs remain available."
        status="Paused"
        tone="warning"
        dismissLabel="Keep paused"
        action={
          <button type="button" className={ui.primary} {...disabled}>
            Resume routine
          </button>
        }
      />
    </div>
  );
}
