"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type {
  PlannerPerson,
  PlannerProject,
  PlannerTask,
} from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  SelectInput,
  StatusPanel,
  Tabs,
  TextInput,
} from "../../../shared/module-ui";
import { ImportTasks } from "./ImportTasks";
import { PersonalViewDialog } from "./PersonalViewDialog";
import styles from "./planner.module.css";
import { ProjectBudget } from "./ProjectBudget";
import {
  filterTasks,
  statuses,
  taskViews,
  type TaskView,
} from "./task-presentation";
import { TaskDetail } from "./TaskDetail";
import { TaskEditor } from "./TaskEditor";
import { TaskViews } from "./TaskViews";
type Props = {
  mine: boolean;
  initialView?: TaskView;
  openNewTask?: boolean;
  initialTaskTitle?: string;
  clientId?: string;
  projectId: string | null;
  people: PlannerPerson[];
  projects: PlannerProject[];
};
type Model = ReturnType<typeof useTaskWorkspace>;
function useTaskWorkspace({
  mine,
  projectId,
  projects,
  initialView = "list",
  clientId,
  openNewTask,
}: Props) {
  const api = useCapiro();
  const [view, setView] = useState<TaskView>(initialView),
    [budget, setBudget] = useState(false);
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("open"),
    [priority, setPriority] = useState("all"),
    [assignee, setAssignee] = useState("all");
  const [cursor, setCursor] = useState<string>(),
    [selected, setSelected] = useState(new Set<string>()),
    [task, setTask] = useState<PlannerTask | null>(null),
    [dialog, setDialog] = useState<
      "task" | "import" | "save-view" | "settings" | null
    >(openNewTask ? "task" : null),
    [failure, setFailure] = useState<string>(),
    [busy, setBusy] = useState(false);
  const query = useCapiroQuery("planner.tasks", {
    query: {
      mine: mine ? "true" : undefined,
      projectId: projectId ?? undefined,
      search: search || undefined,
      cursor,
    },
  });
  const scoped = (query.data?.items ?? []).filter(
    (task) =>
      !clientId ||
      task.clientId === clientId ||
      task.memberships.some((membership) =>
        projects.some(
          (project) =>
            project.id === membership.projectId &&
            project.clientId === clientId,
        ),
      ),
  );
  const visible = filterTasks(scoped, status, priority, assignee);
  const toggleSelection = (id: string) =>
    setSelected((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const changeStatus = async (
    tasks: PlannerTask[],
    nextStatus: PlannerTask["status"],
  ) => {
    setBusy(true);
    setFailure(undefined);
    try {
      for (const item of tasks)
        await api.request("planner.task.update", {
          params: { id: item.id },
          body: { version: item.version, data: { status: nextStatus } },
        });
      setSelected(new Set());
      query.reload();
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "Task update failed.",
      );
      query.reload();
    } finally {
      setBusy(false);
    }
  };
  return {
    view,
    setView,
    budget,
    setBudget,
    search,
    setSearch,
    status,
    setStatus,
    priority,
    setPriority,
    assignee,
    setAssignee,
    cursor,
    setCursor,
    selected,
    setSelected,
    task,
    setTask,
    dialog,
    setDialog,
    failure,
    busy,
    query,
    visible,
    toggleSelection,
    changeStatus,
  };
}
export function TaskWorkspace(props: Props) {
  const model = useTaskWorkspace(props);
  return (
    <div className={styles.stack}>
      {props.projectId && (
        <h2>
          {props.projects.find((project) => project.id === props.projectId)
            ?.name ?? "Project"}
        </h2>
      )}
      <TaskFilters props={props} model={model} />
      <TaskSelection model={model} />
      {model.failure && (
        <p className={styles.error} role="alert">
          {model.failure}
        </p>
      )}
      <p className={styles.note}>
        Time is shown as hours:minutes. This page includes only work you can
        access.
        {props.clientId ? " Client scope filters the current task page." : ""}
      </p>
      {model.budget && props.projectId ? (
        <ProjectBudget projectId={props.projectId} people={props.people} />
      ) : (
        <TaskResults props={props} model={model} />
      )}
      <TaskDialogs props={props} model={model} />
    </div>
  );
}
function TaskFilters({ props, model: m }: { props: Props; model: Model }) {
  return (
    <>
      <div className={styles.tools}>
        <Tabs
          items={[
            ...taskViews.map((id) => ({
              id,
              label: id[0]!.toUpperCase() + id.slice(1),
            })),
            ...(props.projectId
              ? [{ id: "budget", label: "Budget and costs" }]
              : []),
          ]}
          value={m.budget ? "budget" : m.view}
          onChange={(id) => {
            m.setBudget(id === "budget");
            if (id !== "budget") m.setView(id as TaskView);
          }}
          label="Task display"
        />
        <ActionButton
          primary
          className={styles.toolbarEnd}
          onClick={() => m.setDialog("task")}
        >
          + New task
        </ActionButton>
      </div>
      <div className={styles.tools}>
        <TextInput
          type="search"
          aria-label="Search tasks"
          placeholder="Search tasks…"
          value={m.search}
          onChange={(event) => {
            m.setSearch(event.target.value);
            m.setCursor(undefined);
          }}
        />
        <SelectInput
          aria-label="Status"
          value={m.status}
          onValueChange={m.setStatus}
          options={[
            { value: "open", label: "Status · Open" },
            { value: "all", label: "All statuses" },
            ...statuses.map((status) => ({
              value: status.id,
              label: status.label,
            })),
          ]}
        />
        <SelectInput
          aria-label="Assignee"
          value={m.assignee}
          onValueChange={m.setAssignee}
          options={[
            { value: "all", label: "All assignees" },
            { value: "unassigned", label: "Unassigned" },
            ...props.people.map((person) => ({
              value: person.id,
              label: person.name,
            })),
          ]}
        />
        <SelectInput
          aria-label="Priority"
          value={m.priority}
          onValueChange={m.setPriority}
          options={["all", "none", "low", "medium", "high"].map((value) => ({
            value,
            label: value === "all" ? "Priority · All" : value,
          }))}
        />
        <ActionButton onClick={() => m.setDialog("import")}>
          Import CSV
        </ActionButton>
        <ActionButton onClick={() => m.setDialog("save-view")}>
          Save view
        </ActionButton>
        {props.mine && (
          <ActionButton onClick={() => m.setDialog("settings")}>
            My tasks settings
          </ActionButton>
        )}
      </div>
    </>
  );
}
function TaskSelection({ model: m }: { model: Model }) {
  if (!m.selected.size) return null;
  return (
    <div className={styles.tools}>
      <Badge>{m.selected.size} selected</Badge>
      <ActionButton
        disabled={m.busy}
        onClick={() =>
          void m.changeStatus(
            m.visible.filter(
              (item) =>
                m.selected.has(item.id) &&
                ["admin", "editor"].includes(item.access),
            ),
            "done",
          )
        }
      >
        Mark complete
      </ActionButton>
      <ActionButton onClick={() => m.setSelected(new Set())}>
        Clear selection
      </ActionButton>
    </div>
  );
}
function TaskResults({ props, model: m }: { props: Props; model: Model }) {
  return (
    <>
      <StatusPanel
        loading={m.query.loading}
        error={m.query.error}
        onRetry={m.query.reload}
        empty={
          m.query.data && m.visible.length === 0
            ? "No tasks match this view"
            : undefined
        }
      >
        <TaskViews
          tasks={m.visible}
          people={props.people}
          view={m.view}
          selected={m.selected}
          onSelect={m.toggleSelection}
          onOpen={m.setTask}
          onComplete={(item) =>
            void m.changeStatus(
              [item],
              item.status === "done" ? "todo" : "done",
            )
          }
          onMove={(item, status) => void m.changeStatus([item], status)}
        />
      </StatusPanel>
      <div className={styles.tools}>
        {m.cursor && (
          <ActionButton onClick={() => m.setCursor(undefined)}>
            First page
          </ActionButton>
        )}
        {m.query.data?.nextCursor && (
          <ActionButton
            onClick={() => {
              m.setCursor(m.query.data!.nextCursor!);
              m.setSelected(new Set());
            }}
          >
            Next 100 tasks
          </ActionButton>
        )}
      </div>
    </>
  );
}
function TaskDialogs({ props, model: m }: { props: Props; model: Model }) {
  return (
    <>
      <TaskEditor
        open={m.dialog === "task"}
        initialTitle={props.initialTaskTitle}
        onClose={() => m.setDialog(null)}
        people={props.people}
        projects={props.projects}
        projectId={props.projectId}
        onSaved={m.query.reload}
      />
      {m.task && (
        <TaskDetail
          key={m.task.id}
          task={m.task}
          people={props.people}
          projects={props.projects}
          onClose={() => m.setTask(null)}
          onSaved={() => {
            m.setTask(null);
            m.query.reload();
          }}
        />
      )}
      <ImportTasks
        open={m.dialog === "import"}
        onClose={() => m.setDialog(null)}
        projectId={props.projectId}
        onImported={m.query.reload}
      />
      <PersonalViewDialog
        open={m.dialog === "save-view" || m.dialog === "settings"}
        kind={m.dialog === "settings" ? "my_tasks" : "saved_view"}
        view={m.view}
        mine={props.mine}
        projectId={props.projectId}
        filters={{
          search: m.search,
          status: m.status,
          assigneeId: m.assignee,
          priority: m.priority,
        }}
        onClose={() => m.setDialog(null)}
      />
    </>
  );
}
