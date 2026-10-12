"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { plannerId } from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  PageHeader,
  StatusPanel,
  Tabs,
} from "../../../shared/module-ui";
import { CapacityView } from "./CapacityView";
import styles from "./planner.module.css";
import { PlannerInbox } from "./PlannerInbox";
import { ProjectCatalog } from "./ProjectCatalog";
import { ResourceCatalog } from "./ResourceCatalog";
import { taskViews, type TaskView } from "./task-presentation";
import { TaskWorkspace } from "./TaskWorkspace";
import { TimesheetsView } from "./TimesheetsView";
import { WorkloadView } from "./WorkloadView";
const sections = [
  "My tasks",
  "All tasks",
  "Projects",
  "Inbox",
  "Portfolios",
  "Goals",
  "Workload",
  "Capacity",
  "Reporting",
  "Timesheets",
  "Templates",
  "Rules",
  "Forms",
].map((label) => ({ id: label.toLowerCase().replaceAll(" ", "-"), label }));
export function PlannerScreen() {
  const params = useSearchParams(),
    requestedView = params.get("view"),
    requestedClient = params.get("clientId");
  const openNewTask = params.get("create") === "task";
  const rawPe = params.get("contextPeCode");
  const initialTaskTitle =
    rawPe && /^[A-Za-z0-9]{1,40}$/.test(rawPe)
      ? `Research PE ${rawPe}`
      : undefined;
  const clientId = plannerId.safeParse(requestedClient).success
      ? requestedClient!
      : undefined,
    initialMode = taskViews.includes(requestedView as TaskView)
      ? (requestedView as TaskView)
      : "list";
  const [section, setSection] = useState(() =>
      sections.some((section) => section.id === requestedView)
        ? requestedView!
        : "my-tasks",
    ),
    [projectId, setProjectId] = useState<string | null>(null);
  const bootstrap = useCapiroQuery("planner.bootstrap", {});
  const [routeView, setRouteView] = useState(() => (requestedView));
  if (routeView !== (requestedView)) {
    setRouteView(requestedView);
    if (sections.some((section) => section.id === requestedView))
      setSection(requestedView!);

  }
  return (
    <div className={styles.screen}>
      <PageHeader
        title="Planner"
        description="Coordinate tasks, projects and capacity across your permitted work."
        actions={
          <ActionButton onClick={bootstrap.reload}>Refresh</ActionButton>
        }
      />
      <Tabs
        items={sections}
        value={section}
        onChange={(value) => {
          setSection(value);
          setProjectId(null);
        }}
        label="Planner sections"
      />
      <StatusPanel
        loading={bootstrap.loading}
        error={bootstrap.error}
        onRetry={bootstrap.reload}
      >
        {bootstrap.data && (
          <PlannerContent
            data={bootstrap.data}
            section={section}
            setSection={setSection}
            projectId={projectId}
            setProjectId={setProjectId}
            initialMode={initialMode}
            clientId={clientId}
            onReload={bootstrap.reload}
            openNewTask={openNewTask}
            initialTaskTitle={initialTaskTitle}
          />
        )}
      </StatusPanel>
    </div>
  );
}
type ContentProps = {
  data: NonNullable<
    ReturnType<typeof useCapiroQuery<"planner.bootstrap">>["data"]
  >;
  section: string;
  setSection: (section: string) => void;
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  initialMode: TaskView;
  clientId?: string;
  onReload: () => void;
  openNewTask: boolean;
  initialTaskTitle?: string;
};
function PlannerContent({
  data,
  section,
  setSection,
  projectId,
  setProjectId,
  initialMode,
  clientId,
  onReload,
  openNewTask,
  initialTaskTitle,
}: ContentProps) {
  if (section === "my-tasks" || section === "all-tasks")
    return (
      <TaskWorkspace
        key={`${section}:${projectId}:${openNewTask}:${initialTaskTitle}`}
        openNewTask={openNewTask}
        initialTaskTitle={initialTaskTitle}
        initialView={initialMode}
        clientId={clientId}
        mine={section === "my-tasks"}
        projectId={projectId}
        people={data.people}
        projects={data.projects}
      />
    );
  if (section === "projects")
    return projectId ? (
      <>
        <ActionButton onClick={() => setProjectId(null)}>
          ← All projects
        </ActionButton>
        <TaskWorkspace
          initialView={initialMode}
          clientId={clientId}
          mine={false}
          projectId={projectId}
          people={data.people}
          projects={data.projects}
        />
      </>
    ) : (
      <ProjectCatalog
        projects={data.projects.filter(
          (project) => !clientId || project.clientId === clientId,
        )}
        onOpen={setProjectId}
        onReload={onReload}
      />
    );
  if (section === "inbox") return <PlannerInbox />;
  if (section === "workload") return <WorkloadView people={data.people} />;
  if (section === "capacity")
    return <CapacityView people={data.people} projects={data.projects} />;
  if (section === "timesheets")
    return (
      <TimesheetsView
        people={data.people}
        projects={data.projects}
        me={data.me}
        timeAdmin={data.timeAdmin ?? false}
      />
    );
  return (
    <ResourceCatalog
      section={section}
      people={data.people}
      projects={data.projects}
      onOpenProject={(id) => {
        setSection("projects");
        setProjectId(id);
      }}
    />
  );
}
