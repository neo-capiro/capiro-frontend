"use client";
import { FileText } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import ui from "../../ui/meri-ui.module.css";
import {
  RoutineStateNotice,
  type RoutineHistoryState,
} from "./RoutineStateNotice";

export type RoutineRun = {
  id: string;
  status: string;
  /** Each historical output is identified by its run date and version. */
  output: string;
  usage: string;
  started: string;
};

export type RoutineHistoryView = {
  title: string;
  description: string;
  routine: string;
  runs: readonly RoutineRun[];
  state: RoutineHistoryState;
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

/**
 * 08.04 Routine history (active) and its separate Paused (08.04A), Automatically
 * disabled (08.04B) and Cancelled (08.04C) views.
 */
export function RoutineHistoryScreen({
  view,
  unavailable,
}: {
  view: RoutineHistoryView;
  unavailable: string;
}) {
  const disabled = { disabled: true, title: unavailable } as const;
  return (
    <div className={ui.page}>
      <MeriPageHeading title={view.title} description={view.description} />
      <DataTable
        caption={`${view.routine} runs`}
        columns={columns}
        rows={view.runs}
      />
      <div className={ui.row}>
        <button type="button" className={ui.primary} {...disabled}>
          <FileText aria-hidden /> Open output
        </button>
        <button type="button" className={ui.outline} {...disabled}>
          View failed run
        </button>
      </div>
      <RoutineStateNotice state={view.state} unavailable={unavailable} />
    </div>
  );
}
