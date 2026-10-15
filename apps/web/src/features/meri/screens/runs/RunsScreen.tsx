"use client";
import { useState } from "react";
import { FileText, X } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { Notice } from "../../ui/Notice";
import { LinkAction } from "../../ui/LinkAction";
import styles from "../../ui/meri-ui.module.css";

export type RunRow = {
  id: string;
  title: string;
  client: string;
  status: string;
  updated: string;
  output: string;
};
export type RunsView = {
  active: readonly RunRow[];
  recent: readonly RunRow[];
  completion?: { title: string; detail: string; outputsHref?: string };
};

const columns: readonly DataColumn<RunRow>[] = [
  { key: "run", label: "Run", width: 30, render: (row) => row.title },
  { key: "client", label: "Client", width: 16, render: (row) => row.client },
  { key: "status", label: "Status", width: 18, render: (row) => row.status },
  {
    key: "updated",
    label: "Last update",
    width: 16,
    render: (row) => row.updated,
  },
  { key: "output", label: "Output", width: 20, render: (row) => row.output },
];
const views = [
  { id: "active", label: "Active" },
  { id: "recent", label: "Recent" },
] as const;

/** 02.04 Background runs: work continues while another conversation is open. */
export function RunsScreen({
  view,
  runHref,
  unavailable,
}: {
  view: RunsView;
  runHref?: ((id: string) => string) | undefined;
  unavailable: string;
}) {
  const [tab, setTab] = useState<"active" | "recent">("active");
  const rows = view[tab];
  const [selected, setSelected] = useState(rows[0]?.id);
  const current = rows.find((row) => row.id === selected) ?? rows[0];
  return (
    <div className={styles.page}>
      <MeriPageHeading
        title="Runs"
        description="Your work can continue while you use another conversation."
      />
      <SegmentedTabs
        label="Run list"
        options={views}
        value={tab}
        onChange={(id) => {
          setTab(id);
          setSelected(view[id][0]?.id);
        }}
      />
      <DataTable
        caption={`${tab === "active" ? "Active" : "Recent"} runs`}
        columns={columns}
        rows={rows}
        selectedId={current?.id}
        onSelect={setSelected}
      />
      <div className={styles.row} aria-label="Selected run actions">
        <LinkAction
          variant="primary"
          href={current && runHref?.(current.id)}
          unavailable={unavailable}
        >
          Open run
        </LinkAction>
        <button
          type="button"
          className={styles.outline}
          disabled
          title={unavailable}
        >
          <X aria-hidden /> Stop selected run
        </button>
        <button
          type="button"
          className={styles.outline}
          disabled
          title={unavailable}
        >
          <FileText aria-hidden /> Open completed work
        </button>
      </div>
      {view.completion ? (
        <Notice
          tone="success"
          title={view.completion.title}
          action={
            <LinkAction
              variant="outline"
              href={view.completion.outputsHref}
              unavailable={unavailable}
            >
              View outputs
            </LinkAction>
          }
        >
          {view.completion.detail}
        </Notice>
      ) : null}
    </div>
  );
}
