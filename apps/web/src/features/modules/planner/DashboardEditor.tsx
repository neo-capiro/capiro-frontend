"use client";
import {
  ActionButton,
  Field,
  Panel,
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./planner.module.css";
export type ReportWidget = {
  id: string;
  kind: "chart" | "text";
  title: string;
  text?: string;
  style?: "bar" | "donut" | "line" | "number";
  labels?: boolean;
  chart?: Record<string, unknown>;
};
export function reportWidgets(value: unknown): ReportWidget[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is ReportWidget =>
          !!item &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          typeof item.title === "string" &&
          (item.kind === "chart" || item.kind === "text"),
      )
    : [];
}
function defaultChart() {
  return {
    entity: "tasks",
    metric: "count",
    group: "status",
    groupFieldId: null,
    metricFieldId: null,
    granularity: "month",
    filters: {
      source: { kind: "all", ids: [] },
      statuses: [],
      personIds: [],
      priorities: [],
      types: [],
      tags: [],
      includeSubtasks: true,
      dateField: "due",
      from: null,
      through: null,
      timeZone: "UTC",
      custom: [],
    },
  };
}
export function DashboardEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  const widgets = reportWidgets(data.widgets);
  const setWidgets = (next: ReportWidget[]) =>
    onChange({ ...data, widgets: next });
  const update = (id: string, patch: Partial<ReportWidget>) =>
    setWidgets(
      widgets.map((widget) =>
        widget.id === id ? { ...widget, ...patch } : widget,
      ),
    );
  return (
    <div className={styles.stack}>
      {widgets.map((widget) => (
        <Panel
          key={widget.id}
          title={widget.kind === "text" ? "Text widget" : "Chart widget"}
          actions={
            <ActionButton
              type="button"
              onClick={() =>
                setWidgets(widgets.filter((item) => item.id !== widget.id))
              }
            >
              Remove
            </ActionButton>
          }
        >
          <div className={styles.cardBody}>
            <Field label="Title" htmlFor={`widget-${widget.id}`}>
              <TextInput
                id={`widget-${widget.id}`}
                value={widget.title}
                required
                onChange={(event) =>
                  update(widget.id, { title: event.target.value })
                }
              />
            </Field>
            {widget.kind === "text" ? (
              <Field label="Text" htmlFor={`widget-text-${widget.id}`}>
                <TextArea
                  id={`widget-text-${widget.id}`}
                  value={widget.text ?? ""}
                  onChange={(event) =>
                    update(widget.id, { text: event.target.value })
                  }
                />
              </Field>
            ) : (
              <ChartFields widget={widget} update={update} />
            )}
          </div>
        </Panel>
      ))}
      <div className={styles.tools}>
        <ActionButton
          type="button"
          onClick={() =>
            setWidgets([
              ...widgets,
              {
                id: crypto.randomUUID(),
                kind: "chart",
                title: "Tasks by status",
                style: "bar",
                labels: true,
                chart: defaultChart(),
              },
            ])
          }
        >
          + Chart widget
        </ActionButton>
        <ActionButton
          type="button"
          onClick={() =>
            setWidgets([
              ...widgets,
              {
                id: crypto.randomUUID(),
                kind: "text",
                title: "Notes",
                text: "",
              },
            ])
          }
        >
          + Text widget
        </ActionButton>
      </div>
    </div>
  );
}

function ChartFields({
  widget,
  update,
}: {
  widget: ReportWidget;
  update: (id: string, patch: Partial<ReportWidget>) => void;
}) {
  return (
    <div className={styles.form}>
      <Field label="Chart style" htmlFor={`widget-style-${widget.id}`}>
        <select
          id={`widget-style-${widget.id}`}
          className={styles.select}
          value={widget.style}
          onChange={(event) =>
            update(widget.id, {
              style: event.target.value as ReportWidget["style"],
            })
          }
        >
          {["bar", "donut", "line", "number"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
      <Field label="Metric" htmlFor={`widget-metric-${widget.id}`}>
        <select
          id={`widget-metric-${widget.id}`}
          className={styles.select}
          value={String(widget.chart?.metric)}
          onChange={(event) =>
            update(widget.id, {
              chart: { ...widget.chart, metric: event.target.value },
            })
          }
        >
          {["count", "estimated_minutes", "actual_minutes"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
      <Field label="Group by" htmlFor={`widget-group-${widget.id}`}>
        <select
          id={`widget-group-${widget.id}`}
          className={styles.select}
          value={String(widget.chart?.group)}
          onChange={(event) =>
            update(widget.id, {
              chart: { ...widget.chart, group: event.target.value },
            })
          }
        >
          {[
            "none",
            "status",
            "assignee",
            "owner",
            "priority",
            "project",
            "created",
            "due",
            "completed",
          ].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
    </div>
  );
}
