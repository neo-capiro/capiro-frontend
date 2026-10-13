"use client";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { DataTable, Panel, StatusPanel } from "../../../shared/module-ui";
import styles from "./engagement.module.css";
export function TeamView({ clientId }: { clientId: string }) {
  const people = useCapiroQuery("settings.tenantMembers", {});
  const tasks = useCapiroQuery("engagement.tasks", {
    query: { clientId: clientId || undefined },
  });
  const rows = Array.from(
    new Set(tasks.data?.map((task) => task.ownerUserId ?? "unassigned") ?? []),
  ).map((id) => ({
    id,
    work:
      tasks.data?.filter(
        (task) =>
          (task.ownerUserId ?? "unassigned") === id &&
          !["done", "canceled"].includes(task.status),
      ) ?? [],
  }));
  return (
    <Panel
      title="Team ownership and workload"
      description="Open follow-ups grouped by the owner identity returned by the engagement service."
    >
      <StatusPanel
        loading={tasks.loading}
        error={tasks.error}
        onRetry={tasks.reload}
      >
        <DataTable
          rows={rows}
          rowKey={(row) => row.id}
          caption="Engagement follow-up owners"
          columns={[
            {
              key: "owner",
              label: "Owner",
              render: (row) =>
                row.id === "unassigned"
                  ? "Unassigned"
                  : (people.data?.find((person) => person.id === row.id)
                      ?.name ?? "Team member"),
            },
            {
              key: "clients",
              label: "Visible clients",
              render: (row) =>
                Array.from(
                  new Set(
                    row.work.map((task) => task.client?.name).filter(Boolean),
                  ),
                ).join(" · ") || "Unassigned",
            },
            {
              key: "open",
              label: "Open follow-ups",
              render: (row) => row.work.length,
            },
            {
              key: "attention",
              label: "Attention",
              render: (row) =>
                `${row.work.filter((task) => task.dueDate && Date.parse(task.dueDate) < Date.now()).length} overdue`,
            },
          ]}
        />
        <p className={`${styles.note} ${styles.body}`}>
          Client account responsibility requires its authoritative plan
          contract. Private notes and mail are excluded from these follow-up
          counts.
        </p>
      </StatusPanel>
    </Panel>
  );
}
