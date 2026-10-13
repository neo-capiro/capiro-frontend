"use client";
import { useState } from "react";
import type { PlannerPerson } from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Panel,
  StatusPanel,
} from "../../../shared/module-ui";
import { BudgetDialog } from "./BudgetDialog";
import styles from "./planner.module.css";
import { minutesLabel } from "./task-presentation";
export function currencyLabel(value: string, currency: string) {
  const amount = BigInt(value);
  return `${currency} ${(amount / 100n).toLocaleString("en-US")}.${(amount % 100n).toString().padStart(2, "0")}`;
}
export function ProjectBudget({
  projectId,
  people,
}: {
  projectId: string;
  people: PlannerPerson[];
}) {
  const query = useCapiroQuery("planner.project.budget", {
    params: { id: projectId },
  });
  const [dialog, setDialog] = useState<"budget" | "rates" | "alert" | null>(
    null,
  );
  const data = query.data;
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
    >
      {data && (
        <div className={styles.stack}>
          <div className={styles.tools}>
            <ActionButton onClick={() => setDialog("budget")}>
              Set project budget
            </ActionButton>
            <ActionButton onClick={() => setDialog("rates")}>
              Project rates
            </ActionButton>
            <ActionButton onClick={() => setDialog("alert")}>
              My budget alert
            </ActionButton>
          </div>
          <BudgetMetrics data={data} />
          <Panel
            title="Budget and costs"
            description="Financial data is restricted to project administrators."
          >
            <DataTable
              rows={data.people}
              rowKey={(row) => row.userId ?? "unassigned"}
              caption="Project effort and rates"
              columns={[
                { key: "person", label: "Person", render: (row) => row.name },
                {
                  key: "rate",
                  label: "Hourly rate",
                  render: (row) =>
                    row.hourlyMinor === null
                      ? "Not set"
                      : currencyLabel(row.hourlyMinor, data.data.currency),
                },
                {
                  key: "estimated",
                  label: "Estimated time",
                  render: (row) => minutesLabel(row.estimatedMinutes),
                },
                {
                  key: "actual",
                  label: "Actual time",
                  render: (row) => minutesLabel(row.actualMinutes),
                },
                {
                  key: "cost",
                  label: "Actual cost",
                  render: (row) =>
                    row.actualMinor === null
                      ? "Unrated"
                      : currencyLabel(row.actualMinor, data.data.currency),
                },
              ]}
            />
          </Panel>
          {data.unratedActualMinutes > 0 && (
            <p className={styles.note}>
              {minutesLabel(data.unratedActualMinutes)} of actual time has no
              rate; it is excluded from cost totals.
            </p>
          )}
          {dialog && (
            <BudgetDialog
              kind={dialog}
              budget={data}
              people={people}
              onClose={() => setDialog(null)}
              onSaved={query.reload}
            />
          )}
        </div>
      )}
    </StatusPanel>
  );
}

function BudgetMetrics({
  data,
}: {
  data: NonNullable<
    ReturnType<typeof useCapiroQuery<"planner.project.budget">>["data"]
  >;
}) {
  return (
    <div className={styles.cards}>
      {[
        [
          "Budget",
          data.data.measurement === "time"
            ? data.data.budgetMinutes === null
              ? "Not set"
              : minutesLabel(data.data.budgetMinutes)
            : data.data.budgetMinor === null
              ? "Not set"
              : currencyLabel(data.data.budgetMinor, data.data.currency),
        ],
        [
          "Estimated",
          data.data.measurement === "time"
            ? minutesLabel(data.estimatedMinutes)
            : currencyLabel(data.estimatedMinor, data.data.currency),
        ],
        [
          "Actual",
          data.data.measurement === "time"
            ? minutesLabel(data.actualMinutes)
            : currencyLabel(data.actualMinor, data.data.currency),
        ],
      ].map(([label, value]) => (
        <Panel key={label}>
          <div className={styles.metric}>
            <p className={styles.muted}>{label}</p>
            <strong>{value}</strong>
          </div>
        </Panel>
      ))}
    </div>
  );
}
