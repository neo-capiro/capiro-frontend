"use client";
import { useState } from "react";
import type {
  EngagementMeeting,
  EngagementTask,
} from "../../../shared/capiro/operations/engagement";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Panel,
  StatusPanel,
} from "../../../shared/module-ui";
import styles from "./engagement.module.css";
import overviewStyles from "./engagement-overview.module.css";
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
  onClientOutreach,
}: {
  clientId: string;
  meetings: Query;
  onView: (view: string) => void;
  onClientOutreach: (clientId: string) => void;
}) {
  const [now] = useState(() => Date.now());
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
      next: EngagementMeeting | null;
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
      Date.parse(meeting.startsAt) > now &&
      (!row.next ||
        Date.parse(meeting.startsAt) < Date.parse(row.next.startsAt))
    )
      row.next = meeting;
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
  return (
    <div className={`${styles.stack} ${overviewStyles.overview}`}>
      <OverviewStats
        meetings={meetings}
        outreach={outreach}
        tasks={tasks}
        report={report}
      />
      <div className={`${styles.split} ${overviewStyles.content}`}>
        <StatusPanel
          loading={meetings.loading || tasks.loading}
          error={meetings.error ?? tasks.error}
          onRetry={() => {
            meetings.reload();
            tasks.reload();
          }}
        >
          <Panel
            title="Across clients"
            description="Open a client’s Outreach view. Meetings and open work reflect your current access."
          >
            <DataTable
              rows={Array.from(clients.values())}
              rowKey={(row) => row.id}
              caption="Client engagement activity"
              columns={[
                {
                  key: "client",
                  label: "Client",
                  render: (row) => (
                    <ActionButton
                      className={styles.clientLink}
                      onClick={() => onClientOutreach(row.id)}
                    >
                      {row.name}
                    </ActionButton>
                  ),
                },
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
                      ? `${new Date(row.next.startsAt).toLocaleDateString()} · ${row.next.subject}`
                      : "None scheduled",
                },
              ]}
            />
            <p className={`${styles.note} ${styles.body}`}>
              Private notes and unshared mail remain visible only to their
              owner.
            </p>
          </Panel>
        </StatusPanel>
        <OverviewSidebar report={report} tasks={tasks} onView={onView} />
      </div>
      <Panel
        title="Team workload"
        description="Review follow-up ownership across visible work."
        actions={
          <ActionButton onClick={() => onView("team")}>
            Open team workload →
          </ActionButton>
        }
      >
        <StatusPanel
          loading={tasks.loading}
          error={tasks.error}
          onRetry={tasks.reload}
        >
          <WorkloadSummary tasks={tasks.data ?? []} />
        </StatusPanel>
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
  outreach,
  tasks,
  report,
}: {
  meetings: Query;
  outreach: ReturnType<typeof useCapiroQuery<"engagement.outreach">>;
  tasks: ReturnType<typeof useOverviewTasks>;
  report: ReturnType<typeof useOverviewReport>;
}) {
  const cards = [
    {
      label: "Visible meetings",
      query: meetings,
      value: meetings.data?.length,
    },
    {
      label: "Outreach records",
      query: outreach,
      value: outreach.data?.length,
    },
    {
      label: "Open commitments",
      query: tasks,
      value: tasks.data?.filter(
        (task) => !["done", "canceled"].includes(task.status),
      ).length,
    },
    {
      label: "Target offices",
      query: report,
      value: report.data?.summary.targetOffices,
    },
  ];
  return (
    <div className={`${styles.stats} ${overviewStyles.stats}`}>
      {cards.map(({ label, query, value }) => (
        <div key={label} className={styles.stat}>
          <p>{label}</p>
          <StatusPanel
            loading={query.loading}
            error={query.error}
            onRetry={query.reload}
          >
            <strong>{value === undefined ? "—" : value}</strong>
            <span>Current scope</span>
          </StatusPanel>
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
        <StatusPanel
          loading={tasks.loading}
          error={tasks.error}
          onRetry={tasks.reload}
          empty={
            tasks.data?.every((task) =>
              ["done", "canceled"].includes(task.status),
            )
              ? "No open follow-ups"
              : undefined
          }
        >
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
        </StatusPanel>
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

function WorkloadSummary({ tasks }: { tasks: EngagementTask[] }) {
  const open = tasks.filter(
    (task) => !["done", "canceled"].includes(task.status),
  );
  const assigned = open.filter((task) => task.ownerUserId !== null).length;
  return (
    <p className={styles.body}>
      {open.length} returned open follow-ups · {assigned} assigned ·{" "}
      {open.length - assigned} unassigned
    </p>
  );
}
