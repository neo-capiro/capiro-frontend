"use client";
import { ChevronDown, FileText, Search } from "lucide-react";
import { CollapsibleTrigger } from "@capiro/ui/collapsible";
import { Tool, ToolContent } from "@capiro/ui/tool";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { LinkAction } from "../../ui/LinkAction";
import { StatusPill, type StatusTone } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import styles from "./run-progress.module.css";

type ToolRecord = {
  id: string;
  record: string;
  type: string;
  result: string;
};
export type ToolActivityView = {
  tool: {
    title: string;
    /** Tool state projected from accepted public tool events. */
    status: { label: string; tone: StatusTone };
    request: string;
    records: readonly ToolRecord[];
    coverage: string;
  };
  receipt?: { title: string; detail: string };
  /** 02.07A expanded receipt of the same tool activity. */
  expandedHref?: string;
};

const columns: readonly DataColumn<ToolRecord>[] = [
  { key: "record", label: "Record", width: 1, render: (row) => row.record },
  { key: "type", label: "Type", width: 1, render: (row) => row.type },
  { key: "result", label: "Result", width: 1, render: (row) => row.result },
];

/** 02.07 Tool activity and receipts: one tool's request, result coverage and the file receipt. */
export function ToolActivityScreen({
  view,
  unavailable,
}: {
  view: ToolActivityView;
  unavailable: string;
}) {
  const { tool, receipt } = view;
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Run activity"
        description="Concise progress, evidence and outputs"
      />
      <Tool defaultOpen className={styles.toolCard}>
        <h2 className={styles.toolHeading}>
          <CollapsibleTrigger className={styles.toolTrigger}>
            <Search aria-hidden className={styles.cardIcon} />
            <span className={styles.toolTitle}>{tool.title}</span>
            <StatusPill tone={tool.status.tone}>{tool.status.label}</StatusPill>
            <ChevronDown aria-hidden className={styles.chevron} />
          </CollapsibleTrigger>
        </h2>
        <ToolContent className={styles.toolContent}>
          <h3 className={styles.label}>Request</h3>
          <p className={styles.request}>{tool.request}</p>
          <h3 className={styles.label}>Result</h3>
          <DataTable
            caption={`${tool.title} result`}
            columns={columns}
            rows={tool.records}
          />
          <p className={styles.caption}>{tool.coverage}</p>
          <LinkAction variant="outline" unavailable={unavailable}>
            Open source evidence
          </LinkAction>
        </ToolContent>
      </Tool>
      {receipt ? (
        <section className={styles.panel} aria-labelledby="action-receipt">
          <h2 id="action-receipt" className={styles.panelTitle}>
            {receipt.title}
          </h2>
          <p className={styles.body}>{receipt.detail}</p>
          <LinkAction variant="ghost" unavailable={unavailable}>
            <FileText aria-hidden /> Open file
          </LinkAction>
        </section>
      ) : null}
      <div className={ui.row}>
        <LinkAction
          variant="ghost"
          href={view.expandedHref}
          unavailable={unavailable}
        >
          View expanded tool activity
        </LinkAction>
      </div>
    </div>
  );
}
