"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { Notice } from "../../ui/Notice";
import { LinkAction } from "../../ui/LinkAction";
import styles from "../../ui/meri-ui.module.css";

export type RoutineRow = {
  id: string;
  name: string;
  client: string;
  nextRun: string;
  status: string;
  lastOutcome: string;
};

const columns: readonly DataColumn<RoutineRow>[] = [
  { key: "name", label: "Routine", width: 29, render: (row) => row.name },
  { key: "client", label: "Client", width: 12.5, render: (row) => row.client },
  { key: "next", label: "Next run", width: 21.5, render: (row) => row.nextRun },
  { key: "status", label: "Status", width: 14, render: (row) => row.status },
  {
    key: "outcome",
    label: "Last outcome",
    width: 23,
    render: (row) => row.lastOutcome,
  },
];

/** 08.01 Routines: recurring research and drafting within current permissions. */
export function RoutinesScreen({
  routines,
  createHref,
  routineHref,
  unavailable,
}: {
  routines: readonly RoutineRow[];
  createHref?: string | undefined;
  routineHref?: ((id: string) => string) | undefined;
  unavailable: string;
}) {
  const [selected, setSelected] = useState(routines[0]?.id);
  const current = routines.find((row) => row.id === selected);
  return (
    <div className={styles.page}>
      <MeriPageHeading
        title="Routines"
        description="Recurring research and drafting within your permissions"
        action={
          <LinkAction
            variant="primary"
            href={createHref}
            unavailable={unavailable}
          >
            <Plus aria-hidden /> New routine
          </LinkAction>
        }
      />
      <DataTable
        caption="Routines"
        columns={columns}
        rows={routines}
        selectedId={selected}
        onSelect={setSelected}
      />
      <div className={styles.row} aria-label="Selected routine actions">
        <LinkAction
          variant="primary"
          href={current && routineHref?.(current.id)}
          unavailable={unavailable}
        >
          Open routine
        </LinkAction>
        <button
          type="button"
          className={styles.outline}
          disabled
          title={unavailable}
        >
          Pause
        </button>
        <button
          type="button"
          className={styles.outline}
          disabled
          title={unavailable}
        >
          Resume
        </button>
        <button
          type="button"
          className={styles.ghost}
          disabled
          title={unavailable}
        >
          Cancel routine
        </button>
      </div>
      <Notice
        tone="success"
        title="Routine drafting stays within the defined scope"
      >
        Outputs are saved to Meri. Any governed action still follows its review
        rules.
      </Notice>
    </div>
  );
}
