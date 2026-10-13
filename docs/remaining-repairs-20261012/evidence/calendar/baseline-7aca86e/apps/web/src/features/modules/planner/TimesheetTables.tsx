"use client";
import type { z } from "zod";
import type { timesheet } from "../../../shared/capiro/operations/planner-time";
import { ActionButton, DataTable, Panel } from "../../../shared/module-ui";
import styles from "./planner.module.css";
import { minutesLabel } from "./task-presentation";
export type Timesheet = z.infer<typeof timesheet>;
export function WeeklyTotals({ sheet }: { sheet: Timesheet }) {
  const rows = [
    {
      id: "all",
      label: "All time",
      values: sheet.days.map((day) => day.totalMinutes),
      total: sheet.totalMinutes,
    },
    {
      id: "billable",
      label: "Billable",
      values: sheet.days.map((day) => day.billableMinutes),
      total: sheet.billableMinutes,
    },
  ];
  return (
    <Panel title="Weekly time totals">
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        caption="Weekly time totals"
        columns={[
          { key: "type", label: "Time", render: (row) => row.label },
          ...sheet.days.map((day, index) => ({
            key: day.date,
            label: day.date.slice(5),
            render: (row: { values: number[] }) =>
              minutesLabel(row.values[index] ?? 0),
          })),
          {
            key: "total",
            label: "Total",
            render: (row) => minutesLabel(row.total),
          },
        ]}
      />
    </Panel>
  );
}
export function WeeklyWork({
  sheet,
  onAdd,
  onPreferences,
  onRemove,
  busy,
}: {
  sheet: Timesheet;
  onAdd: () => void;
  onPreferences: () => void;
  onRemove: (work: { taskId: string | null; projectId: string | null }) => void;
  busy: boolean;
}) {
  return (
    <Panel
      title="Work this week"
      actions={
        <div className={styles.tools}>
          <ActionButton onClick={onAdd} disabled={!sheet.canLogTime}>
            Add work to timesheet
          </ActionButton>
          <ActionButton onClick={onPreferences}>
            My timesheet settings
          </ActionButton>
        </div>
      }
    >
      <DataTable
        rows={sheet.workRows ?? []}
        rowKey={(row) => row.key}
        caption="Timesheet work"
        columns={[
          {
            key: "work",
            label: "Work",
            render: (row) =>
              row.taskName ??
              `General project work · ${row.projectName ?? "Personal"}`,
          },
          ...sheet.days.map((day) => ({
            key: day.date,
            label: day.date.slice(5),
            render: (row: { days: { date: string; totalMinutes: number }[] }) =>
              minutesLabel(
                row.days.find((item) => item.date === day.date)?.totalMinutes ??
                  0,
              ),
          })),
          {
            key: "total",
            label: "Total",
            render: (row) => minutesLabel(row.totalMinutes),
          },
          {
            key: "action",
            label: "Actions",
            render: (row) => (
              <ActionButton
                disabled={busy || !row.canRemove}
                onClick={() => onRemove(row)}
              >
                Remove work row
              </ActionButton>
            ),
          },
        ]}
      />
      {sheet.nextWorkCursor && (
        <p className={styles.note}>
          More work rows are available. Service totals cover the entire week.
        </p>
      )}
    </Panel>
  );
}
export function TimeMetrics({ sheet }: { sheet: Timesheet }) {
  return (
    <div className={styles.cards}>
      {[
        ["Total time", sheet.totalMinutes],
        ["Billable time", sheet.billableMinutes],
        ["Non-billable time", sheet.totalMinutes - sheet.billableMinutes],
      ].map(([label, value]) => (
        <Panel key={String(label)}>
          <div className={styles.metric}>
            <p className={styles.muted}>{label}</p>
            <strong>{minutesLabel(Number(value))}</strong>
          </div>
        </Panel>
      ))}
    </div>
  );
}
