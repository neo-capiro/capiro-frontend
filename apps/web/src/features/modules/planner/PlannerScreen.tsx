"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { plannerId } from "../../../shared/capiro/operations/planner-schemas";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import { LinkedTaskDetail } from "./LinkedTaskDetail";
import { ObjectivePreparedPlan } from "./ObjectivePreparedPlan";
import { PlannerClientScope } from "./PlannerClientScope";
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
import { canReadCurrentProjectLink } from "./current-project-link";
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
    requestedTask = params.get("task");
  const scope = useSelectedClient();
  const openNewTask = params.get("create") === "task";
  const rawPe = params.get("contextPeCode");
  const initialTaskTitle =
    rawPe && /^[A-Za-z0-9]{1,40}$/.test(rawPe)
      ? `Research PE ${rawPe}`
      : undefined;
  const clientId =
      scope.state === "authorized-client" ? scope.client.id : undefined,
    initialMode = taskViews.includes(requestedView as TaskView)
      ? (requestedView as TaskView)
      : "list";
  const [section, setSection] = useState(() =>
      sections.some((section) => section.id === requestedView)
        ? requestedView!
        : "my-tasks",
    ),
    [projectId, setProjectId] = useState<string | null>(null);
  const linkedProject = params.has("project");
  const bootstrap = useCapiroQuery(
    "planner.bootstrap",
    {},
    { enabled: !linkedProject },
  );
  const clients = useCapiroQuery(
    "clients.list",
    {},
    { enabled: section === "all-tasks" },
  );
  const knownClients = clients.data ?? [];
  const groupClients =
    scope.state === "authorized-client" &&
    !knownClients.some((client) => client.id === scope.client.id)
      ? [...knownClients, scope.client]
      : knownClients;
  const [routeView, setRouteView] = useState(() => requestedView);
  const [planDismissed, setPlanDismissed] = useState(false);
  const planSelector = params.has("materializationRequestId")
    ? params.toString()
    : null;
  const [previousPlan, setPreviousPlan] = useState(planSelector);
  if (previousPlan !== planSelector) {
    setPreviousPlan(planSelector);
    setPlanDismissed(false);
    setProjectId(null);
  }
  if (routeView !== requestedView) {
    setRouteView(requestedView);
    if (sections.some((section) => section.id === requestedView))
      setSection(requestedView!);
  }
  if (linkedProject)
    return (
      <CurrentProjectLink
        key={params.toString()}
        onDismiss={() => {
          setProjectId(null);
          setSection("projects");
        }}
      />
    );
  if (planSelector !== null && !planDismissed)
    return (
      <div className={styles.screen}>
        <PageHeader
          title="Planner"
          description="Review the plan generated from your saved Strategy."
        />
        <ObjectivePreparedPlan
          onOpenProject={(id) => {
            bootstrap.reload();
            setProjectId(id);
            setSection("projects");
            setPlanDismissed(true);
          }}
        />
      </div>
    );
  return (
    <div className={styles.screen}>
      <PageHeader
        title="Planner"
        description="Coordinate tasks, projects and capacity across your permitted work."
        actions={
          <>
            {section === "all-tasks" && (
              <PlannerClientScope clients={clients} section={section} />
            )}
            <ActionButton
              onClick={() => {
                bootstrap.reload();
                clients.reload();
              }}
            >
              Refresh
            </ActionButton>
          </>
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
          <>
            {requestedTask !== null && (
              <LinkedTaskDetail
                key={requestedTask}
                requestedId={requestedTask}
                clientId={clientId}
                people={bootstrap.data.people}
                projects={bootstrap.data.projects}
                onSaved={bootstrap.reload}
              />
            )}
            <PlannerContent
              data={bootstrap.data}
              clients={groupClients}
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
          </>
        )}
      </StatusPanel>
    </div>
  );
}

function CurrentProjectLink({ onDismiss }: { onDismiss: () => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const scope = useSelectedClient();
  const id = params.get("project") ?? "";
  const clientId = params.get("clientId") ?? "";
  const valid =
    params.getAll("project").length === 1 &&
    params.getAll("clientId").length === 1 &&
    params.getAll("view").length === 1 &&
    params.get("view") === "projects" &&
    !params.has("materializationRequestId") &&
    plannerId.safeParse(id).success &&
    plannerId.safeParse(clientId).success;
  const authorized = canReadCurrentProjectLink(scope, clientId);
  const query = useCapiroQuery(
    "planner.bootstrap",
    {},
    { enabled: valid && authorized },
  );
  const matches = query.data?.projects.filter((project) => project.id === id);
  const project =
    matches?.length === 1 &&
    !matches[0]!.archived &&
    matches[0]!.clientId === clientId
      ? matches[0]
      : undefined;
  const error = !valid
    ? "This project link is invalid."
    : !authorized && scope.state !== "loading"
      ? "This project is unavailable in the selected client scope."
      : (query.error ??
        (query.data && !project
          ? "This project is unavailable in the selected client scope."
          : undefined));
  const close = () => {
    onDismiss();
    const next = new URLSearchParams(params.toString());
    next.delete("project");
    router.replace(`/modules/planner${next.size ? `?${next}` : ""}`);
  };
  return (
    <div className={styles.screen}>
      <PageHeader title="Planner" description="Current project work." />
      <ActionButton onClick={close}>Back to Projects</ActionButton>
      <StatusPanel
        loading={(valid && scope.state === "loading") || query.loading}
        error={error}
        onRetry={valid && authorized ? query.reload : undefined}
      >
        {!error && !query.loading && project && query.data && (
          <TaskWorkspace
            key={project.id}
            initialView="list"
            clientId={clientId}
            mine={false}
            projectId={project.id}
            people={query.data.people}
            projects={query.data.projects}
          />
        )}
      </StatusPanel>
    </div>
  );
}
type ContentProps = {
  clients: readonly { id: string; name: string }[];
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
  clients,
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
        clients={clients}
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
