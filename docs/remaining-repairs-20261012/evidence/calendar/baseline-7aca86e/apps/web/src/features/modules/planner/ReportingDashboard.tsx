"use client";
import { useState, type ReactNode } from "react";
import type { PlannerResource } from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Modal,
  Panel,
  StatusPanel,
} from "../../../shared/module-ui";
import { reportWidgets, type ReportWidget } from "./DashboardEditor";
import styles from "./planner.module.css";
export function ReportingDashboard({
  dashboard,
  onBack,
  onEdit,
  editor,
}: {
  dashboard: Extract<PlannerResource, { kind: "dashboard" }>;
  onBack: () => void;
  onEdit: () => void;
  onReload: () => void;
  editor: ReactNode;
}) {
  return (
    <div className={styles.stack}>
      <div className={styles.tools}>
        <ActionButton onClick={onBack}>← All dashboards</ActionButton>
        <ActionButton
          onClick={onEdit}
          disabled={!["admin", "editor"].includes(dashboard.access)}
        >
          Edit dashboard
        </ActionButton>
      </div>
      <div>
        <p className={styles.note}>SAVED DASHBOARD</p>
        <h2>{dashboard.name}</h2>
        <p className={styles.muted}>Charts use your current access.</p>
      </div>
      <div className={styles.cards}>
        {reportWidgets(dashboard.data.widgets).map((widget) =>
          widget.kind === "text" ? (
            <Panel title={widget.title} key={widget.id}>
              <p className={styles.detail}>{widget.text}</p>
            </Panel>
          ) : (
            <ReportChart
              key={widget.id}
              widget={widget}
              dashboard={dashboard}
            />
          ),
        )}
      </div>
      {reportWidgets(dashboard.data.widgets).length === 0 && (
        <Panel>
          <div className={styles.emptyLayout}>
            <h2>No widgets yet</h2>
            <p className={styles.muted}>
              Edit this dashboard to add a chart or text widget.
            </p>
          </div>
        </Panel>
      )}
      {editor}
    </div>
  );
}
function ReportChart({
  widget,
  dashboard,
}: {
  widget: ReportWidget;
  dashboard: Extract<PlannerResource, { kind: "dashboard" }>;
}) {
  const query = useCapiroQuery("planner.report.widget", {
    params: { id: dashboard.id, widgetId: widget.id },
    query: { version: dashboard.version },
  });
  const [drill, setDrill] = useState(false);
  const data = query.data,
    max = Math.max(1, ...(data?.buckets.map((bucket) => bucket.value) ?? [0]));
  return (
    <Panel
      title={widget.title}
      actions={<ActionButton onClick={query.reload}>Refresh</ActionButton>}
    >
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <div className={styles.cardBody}>
          {data && (data.unavailableFields || data.unavailableSources) ? (
            <p className={styles.note}>
              Some saved sources or fields are unavailable. Your current access
              remains in effect.
            </p>
          ) : null}
          <strong style={{ fontSize: 28 }}>
            {data?.total === null
              ? "Unavailable"
              : data?.unit === "minutes"
                ? `${Math.round(((data?.total ?? 0) / 60) * 10) / 10} h`
                : data?.total}
          </strong>
          <p className={styles.muted}>
            {data?.matched === null
              ? "Matching work is unavailable"
              : `${data?.matched ?? 0} matching records`}
          </p>
          {widget.style !== "number" &&
            data?.buckets.map((bucket) => (
              <div key={bucket.key} className={styles.stack} style={{ gap: 4 }}>
                <div className={styles.tools}>
                  <span>{bucket.label}</span>
                  <span className={styles.toolbarEnd}>{bucket.value}</span>
                </div>
                <div className={styles.progress}>
                  <span style={{ width: `${(bucket.value / max) * 100}%` }} />
                </div>
              </div>
            ))}
          {data?.overlapping && (
            <p className={styles.note}>
              An item can appear in several groups. The total counts shared work
              once.
            </p>
          )}
          <ActionButton onClick={() => setDrill(true)} disabled={!data}>
            View matching work
          </ActionButton>
        </div>
      </StatusPanel>
      {drill && data && (
        <ReportDrill
          dashboard={dashboard}
          widget={widget}
          revision={data.revision}
          onClose={() => setDrill(false)}
        />
      )}
    </Panel>
  );
}
function ReportDrill({
  dashboard,
  widget,
  revision,
  onClose,
}: {
  dashboard: Extract<PlannerResource, { kind: "dashboard" }>;
  widget: ReportWidget;
  revision: string;
  onClose: () => void;
}) {
  const [cursor, setCursor] = useState<string>();
  const query = useCapiroQuery("planner.report.widget", {
    params: { id: dashboard.id, widgetId: widget.id },
    query: { rows: "true", version: dashboard.version, revision, cursor },
  });
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={widget.title}
      description="Matching work at the current authorized report revision."
    >
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <DataTable
          rows={query.data?.items ?? []}
          rowKey={(row) => row.id}
          caption="Report matching records"
          columns={[
            { key: "name", label: "Name", render: (row) => row.name },
            {
              key: "status",
              label: "Status",
              render: (row) => row.status ?? "—",
            },
            {
              key: "owner",
              label: "Person",
              render: (row) => row.personName ?? "Unassigned",
            },
            { key: "value", label: "Value", render: (row) => row.value },
          ]}
        />
        {query.data?.nextCursor && (
          <ActionButton onClick={() => setCursor(query.data!.nextCursor!)}>
            Next page
          </ActionButton>
        )}
      </StatusPanel>
    </Modal>
  );
}
