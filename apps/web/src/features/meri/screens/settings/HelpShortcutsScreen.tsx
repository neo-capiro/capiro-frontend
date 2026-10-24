"use client";
import { useState, type ReactNode } from "react";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { FormField } from "../../ui/FormField";
import panel from "../../ui/panel.module.css";
import surfaces from "../../ui/surfaces.module.css";
import ui from "../../ui/meri-ui.module.css";
import { ToggleChip } from "./SettingsControls";
import { SettingsCard } from "./SettingsCard";
import { SettingsCallout } from "./SettingsCallout";
import { SettingsLayout } from "./SettingsLayout";
import type {
  SettingsChrome,
  SettingsField,
  SettingsHeading,
  SettingsNotice,
  SettingsOutcome,
} from "./settings-view";
import styles from "./settings.module.css";

export type ShortcutRow = { id: string; action: string; keys: string };

export type HelpShortcutsView = {
  heading: SettingsHeading;
  shortcuts: { title: string; rows: readonly ShortcutRow[]; footnote: string };
  supported: { title: string; work: string };
  report: {
    title: string;
    summary: SettingsField;
    detail: SettingsField;
    toggle: string;
    runReference: { label: string; placeholder: string };
    footnote: string;
  };
  unavailable: SettingsNotice;
};

const columns: readonly DataColumn<ShortcutRow>[] = [
  { key: "action", label: "Action", width: 350, render: (row) => row.action },
  { key: "keys", label: "Shortcut", width: 260, render: (row) => row.keys },
];

/** 09.07 Help, shortcuts and feedback (the Keyboard shortcuts destination). */
export function HelpShortcutsScreen({
  chrome,
  view,
  outcome,
  reportContent,
}: {
  chrome: SettingsChrome;
  view: HelpShortcutsView;
  outcome?: SettingsOutcome | undefined;
  reportContent?: ReactNode;
}) {
  const { shortcuts, supported } = view;
  return (
    <SettingsLayout
      chrome={chrome}
      heading={view.heading}
      outcome={outcome}
      primary={
        <>
          <SettingsCard title={shortcuts.title}>
            <DataTable
              caption={shortcuts.title}
              columns={columns}
              rows={shortcuts.rows}
            />
            <p className={surfaces.caption}>{shortcuts.footnote}</p>
          </SettingsCard>
          <SettingsCard title={supported.title}>
            <p className={panel.context}>{supported.work}</p>
          </SettingsCard>
        </>
      }
      supporting={
        reportContent ?? (
          <>
            <ReportProblem
              report={view.report}
              unavailable={chrome.unavailable}
              drafts={chrome.localDrafts}
            />
            <SettingsCallout notice={view.unavailable} />
          </>
        )
      }
    />
  );
}

/** Problem report draft: fields edit locally when drafts are allowed; the run reference only when included. */
function ReportProblem({
  report,
  unavailable,
  drafts,
}: {
  report: HelpShortcutsView["report"];
  unavailable: string;
  drafts: boolean;
}) {
  const [summary, setSummary] = useState(report.summary.value);
  const [detail, setDetail] = useState(report.detail.value);
  const [includeRun, setIncludeRun] = useState(false);
  const [runReference, setRunReference] = useState("");
  return (
    <SettingsCard title={report.title}>
      <FormField
        className={styles.field}
        label={report.summary.label}
        value={summary}
        onChange={drafts ? setSummary : undefined}
        placeholder={report.summary.placeholder}
      />
      <FormField
        className={styles.field}
        label={report.detail.label}
        value={detail}
        onChange={drafts ? setDetail : undefined}
        multiline
      />
      <ToggleChip
        label={report.toggle}
        pressed={includeRun}
        onChange={setIncludeRun}
        disabled={!drafts}
        unavailable={unavailable}
      />
      <FormField
        className={styles.field}
        label={report.runReference.label}
        value={includeRun ? runReference : ""}
        onChange={drafts && includeRun ? setRunReference : undefined}
        placeholder={report.runReference.placeholder}
        disabled={!drafts || !includeRun}
      />
      <p className={ui.muted}>{report.footnote}</p>
      <button type="button" className={ui.primary} disabled title={unavailable}>
        Submit feedback
      </button>
    </SettingsCard>
  );
}
