"use client";
import type { EngagementMeeting } from "../../../shared/capiro/operations/engagement";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Panel,
  StatusPanel,
} from "../../../shared/module-ui";
import styles from "./engagement.module.css";
type Query = {
  data?: EngagementMeeting[];
  loading: boolean;
  error?: Error;
  reload: () => void;
};
export function EngagementOverview({
  clientId,
  meetings,
  onView,
}: {
  clientId: string;
  meetings: Query;
  onView: (view: string) => void;
}) {
  const outreach = useCapiroQuery("engagement.outreach", {
    query: { clientId: clientId || undefined, limit: 500 },
  });
  const tasks = useOverviewTasks(clientId);
  const report = useOverviewReport(clientId);
  const clients = new Map<
    string,
    {
      id: string;
      name: string;
      meetings: number;
      open: number;
      next: string | null;
    }
  >();
  for (const meeting of meetings.data ?? []) {
    if (!meeting.client) continue;
    const row = clients.get(meeting.client.id) ?? {
      ...meeting.client,
      meetings: 0,
      open: 0,
      next: null,
    };
    row.meetings++;
    if (
      Date.parse(meeting.startsAt) > Date.now() &&
      (!row.next || meeting.startsAt < row.next)
    )
      row.next = meeting.startsAt;
    clients.set(row.id, row);
  }
  for (const task of tasks.data ?? []) {
    if (!task.client) continue;
    const row = clients.get(task.client.id) ?? {
      ...task.client,
      meetings: 0,
      open: 0,
      next: null,
    };
    if (!["done", "canceled"].includes(task.status)) row.open++;
    clients.set(row.id, row);
  }
  const summary = report.data?.summary;
  return (
    <div className={styles.stack}>
      <OverviewStats
        meetings={meetings}
        outreachCount={outreach.data?.length}
        openCount={
          tasks.data?.filter(
            (task) => !["done", "canceled"].includes(task.status),
          ).length
        }
        targetCount={summary?.targetOffices}
      />
      <StatusPanel
        loading={meetings.loading || tasks.loading}
        error={meetings.error ?? tasks.error}
        onRetry={() => {
          meetings.reload();
          tasks.reload();
        }}
      >
        <div className={styles.split}>
          <Panel
            title="Across clients"
            description="Meetings and open work returned for your current access."
          >
            <DataTable
              rows={Array.from(clients.values())}
              rowKey={(row) => row.id}
              caption="Client engagement activity"
              columns={[
                { key: "client", label: "Client", render: (row) => row.name },
                {
                  key: "meetings",
                  label: "Meetings",
                  render: (row) => row.meetings,
                },
                { key: "open", label: "Open", render: (row) => row.open },
                {
                  key: "next",
                  label: "Next meeting",
                  render: (row) =>
                    row.next
                      ? new Date(row.next).toLocaleDateString()
                      : "None scheduled",
                },
              ]}
            />
            <p className={`${styles.note} ${styles.body}`}>
              Private notes and unshared mail remain visible only to their
              owner.
            </p>
          </Panel>
          <OverviewSidebar report={report} tasks={tasks} onView={onView} />
        </div>
      </StatusPanel>
      <Panel
        title="Team workload"
        description="Review follow-up ownership across visible work."
        actions={
          <ActionButton onClick={() => onView("team")}>
            Open team workload →
          </ActionButton>
        }
      >
        <div />
      </Panel>
      {outreach.data?.length === 500 && (
        <p className={styles.note}>
          The outreach counter shows the most recent 500 returned records.
        </p>
      )}
    </div>
  );
}

function OverviewStats({
  meetings,
  outreachCount,
  openCount,
  targetCount,
}: {
  meetings: Query;
  outreachCount?: number;
  openCount?: number;
  targetCount?: number;
}) {
  return (
    <div className={styles.stats}>
      {[
        ["Visible meetings", meetings.data?.length],
        ["Outreach records", outreachCount],
        ["Open commitments", openCount],
        ["Target offices", targetCount],
      ].map(([label, value]) => (
        <div key={String(label)} className={styles.stat}>
          <p>{label}</p>
          <strong>{value === undefined ? "—" : value}</strong>
          <span>Current scope</span>
        </div>
      ))}
    </div>
  );
}

function OverviewSidebar({
  report,
  tasks,
  onView,
}: {
  report: ReturnType<typeof useOverviewReport>;
  tasks: ReturnType<typeof useOverviewTasks>;
  onView: (view: string) => void;
}) {
  return (
    <div className={styles.stack}>
      <Panel
        title="Target offices"
        description="Review coordination before the next ask."
      >
        <StatusPanel
          loading={report.loading}
          error={report.error}
          onRetry={report.reload}
        >
          <div className={styles.body}>
            {report.data?.rows.slice(0, 5).map((row) => (
              <div key={`${row.officeKey}:${row.clientName}`}>
                <strong>{row.memberPrincipal}</strong>
                <p className={styles.muted}>
                  {row.clientName ?? "Unassigned"} ·{" "}
                  {row.outreachStatus.replaceAll("_", " ")}
                </p>
              </div>
            ))}
          </div>
          <ActionButton onClick={() => onView("reports")}>
            Open reports →
          </ActionButton>
        </StatusPanel>
      </Panel>
      <Panel title="Follow-ups needing attention">
        <div className={styles.body}>
          {tasks.data
            ?.filter((task) => !["done", "canceled"].includes(task.status))
            .slice(0, 3)
            .map((task) => (
              <div key={task.id}>
                <strong>{task.title}</strong>
                <p className={styles.muted}>
                  {task.client?.name ?? "Unassigned"} ·{" "}
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString()
                    : "No due date"}
                </p>
              </div>
            ))}
        </div>
        <ActionButton onClick={() => onView("commitments")}>
          Open commitments →
        </ActionButton>
      </Panel>
    </div>
  );
}
function useOverviewReport(clientId: string) {
  return useCapiroQuery("engagement.report", {
    query: { clientId: clientId || undefined },
  });
}
function useOverviewTasks(clientId: string) {
  return useCapiroQuery("engagement.tasks", {
    query: { clientId: clientId || undefined },
  });
}
