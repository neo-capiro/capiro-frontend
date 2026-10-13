"use client";
import { useState } from "react";
import type {
  PlannerPerson,
  PlannerProject,
} from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Panel,
  StatusPanel,
  Tabs,
  TextInput,
} from "../../../shared/module-ui";
import { AllocationDialog } from "./AllocationDialog";
import { CapacityRecordDialog } from "./CapacityRecordDialog";
import styles from "./planner.module.css";
type Props = { people: PlannerPerson[]; projects: PlannerProject[] };
export function CapacityView({ people, projects }: Props) {
  const model = useCapacity();
  const {
    catalog,
    planId,
    setPlanId,
    tab,
    setTab,
    search,
    setSearch,
    dialog,
    setDialog,
    query,
    data,
    rows,
  } = model;
  return (
    <div className={styles.stack}>
      <CapacityToolbar model={model} />
      <StatusPanel
        loading={catalog.loading}
        error={catalog.error}
        onRetry={catalog.reload}
      >
        {!planId ? (
          <Panel>
            <div className={styles.emptyLayout}>
              <h2>Choose a capacity plan</h2>
              <p className={styles.muted}>
                Plans bring people, teams and projects into one staffing view.
              </p>
              <ActionButton onClick={() => setDialog("plan")}>
                Create a plan
              </ActionButton>
            </div>
          </Panel>
        ) : (
          <StatusPanel
            loading={query.loading}
            error={query.error}
            onRetry={query.reload}
          >
            {data && (
              <>
                <Tabs
                  items={[
                    { id: "people", label: "People" },
                    { id: "projects", label: "Projects" },
                  ]}
                  value={tab}
                  onChange={setTab}
                  label="Capacity perspective"
                />
                <div className={styles.tools}>
                  <TextInput
                    type="search"
                    aria-label="Search staffing"
                    placeholder={`Search ${tab}…`}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <Badge>{data.matched} allocations</Badge>
                  <Badge>
                    {data.plan.access === "admin"
                      ? "Can manage staffing"
                      : "View only"}
                  </Badge>
                </div>
                <CapacityTable model={model} people={people} />
                {data.nextCursor && (
                  <p className={styles.note}>
                    The current allocation page is incomplete. Stored total:{" "}
                    {data.matched} allocations.
                  </p>
                )}
              </>
            )}
          </StatusPanel>
        )}
      </StatusPanel>
      <CapacityRecordDialog
        kind={
          dialog === "plan"
            ? "plan"
            : dialog === "team"
              ? "team"
              : "placeholder"
        }
        open={
          dialog === "plan" || dialog === "team" || dialog === "placeholder"
        }
        onClose={() => setDialog(null)}
        onSaved={catalog.reload}
        people={people}
        projects={projects}
        teams={catalog.data?.teams ?? []}
      />
      {data && (
        <AllocationDialog
          open={dialog === "allocation"}
          onClose={() => setDialog(null)}
          onSaved={query.reload}
          plan={{ id: data.plan.id, version: data.plan.version }}
          people={people.filter((person) => data.personIds.includes(person.id))}
          projects={projects.filter((project) =>
            data.projectIds.includes(project.id),
          )}
        />
      )}
    </div>
  );
}

function useCapacity() {
  const catalog = useCapiroQuery("planner.capacity", {});
  const [planId, setPlanId] = useState(""),
    [tab, setTab] = useState("people"),
    [search, setSearch] = useState(""),
    [dialog, setDialog] = useState<
      "plan" | "team" | "placeholder" | "allocation" | null
    >(null);
  const query = useCapiroQuery(
    "planner.capacity.plan",
    { params: { id: planId } },
    { enabled: !!planId },
  );
  const data = query.data;
  const rows =
    data?.allocations.filter((item) =>
      (tab === "people" ? item.personName : item.projectName)
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) ?? [];
  return {
    catalog,
    planId,
    setPlanId,
    tab,
    setTab,
    search,
    setSearch,
    dialog,
    setDialog,
    query,
    data,
    rows,
  };
}

function CapacityToolbar({ model }: { model: ReturnType<typeof useCapacity> }) {
  const { planId, setPlanId, catalog, setDialog, data } = model;
  return (
    <div className={styles.tools}>
      <select
        className={styles.select}
        aria-label="Capacity plan"
        value={planId}
        onChange={(event) => setPlanId(event.target.value)}
      >
        <option value="">Select a capacity plan</option>
        {catalog.data?.plans
          .filter((plan) => !plan.archived)
          .map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
      </select>
      <ActionButton onClick={() => setDialog("plan")}>+ New plan</ActionButton>
      <ActionButton onClick={() => setDialog("team")}>
        Manage teams
      </ActionButton>
      <ActionButton onClick={() => setDialog("placeholder")}>
        Add placeholder
      </ActionButton>
      {data && (
        <ActionButton
          primary
          className={styles.toolbarEnd}
          disabled={data.plan.access !== "admin"}
          onClick={() => setDialog("allocation")}
        >
          Allocate project work
        </ActionButton>
      )}
    </div>
  );
}

function CapacityTable({
  model,
  people,
}: {
  model: ReturnType<typeof useCapacity>;
  people: PlannerPerson[];
}) {
  const { rows, tab } = model;
  return (
    <DataTable
      rows={rows}
      rowKey={(row) => row.id}
      caption="Staffing allocations"
      columns={[
        {
          key: "person",
          label: tab === "people" ? "Person" : "Project",
          render: (row) =>
            tab === "people"
              ? (people.find((person) => person.id === row.data.userId)?.name ??
                row.personName)
              : row.projectName,
        },
        {
          key: "project",
          label: tab === "people" ? "Project" : "Person",
          render: (row) =>
            tab === "people"
              ? row.projectName
              : (people.find((person) => person.id === row.data.userId)?.name ??
                row.personName),
        },
        { key: "start", label: "Start", render: (row) => row.data.startOn },
        { key: "end", label: "Through", render: (row) => row.data.endOn },
        {
          key: "effort",
          label: "Allocation",
          render: (row) =>
            `${row.data.effort.value}${row.data.effort.unit === "percent" ? "%" : " h"}`,
        },
        {
          key: "capacity",
          label: "Weekly capacity",
          render: (row) => `${row.weeklyMinutes / 60} h`,
        },
      ]}
    />
  );
}
