import type {
  PlannerProject,
  PlannerResource,
} from "../../../shared/capiro/operations/planner-schemas";
export const resourceSectionKinds: Record<string, PlannerResource["kind"]> = {
  portfolios: "portfolio",
  goals: "goal",
  templates: "template",
  rules: "rule",
  forms: "form",
  reporting: "dashboard",
};
export function initialResourceData(
  kind: PlannerResource["kind"],
  name: string,
  project?: PlannerProject,
): Record<string, unknown> {
  const shared = { description: "", privacy: "private", members: [] };
  if (kind === "portfolio") return { ...shared, projectIds: [] };
  if (kind === "goal")
    return {
      ...shared,
      projectIds: [],
      ownerId: null,
      dueOn: null,
      status: "on_track",
      progress: "manual",
      current: 0,
      target: 100,
      unit: "%",
      startValue: 0,
      direction: "increase",
    };
  if (kind === "rule")
    return {
      enabled: true,
      trigger: "status_changed",
      conditions: {},
      actions: { notify: true },
    };
  if (kind === "form")
    return {
      description: "",
      enabled: true,
      fields: [
        {
          id: crypto.randomUUID(),
          label: "Task name",
          type: "text",
          required: true,
          options: [],
          taskField: "name",
        },
      ],
      defaults: {
        assigneeId: null,
        priority: "none",
        status: "todo",
        estimateMinutes: 0,
      },
      confirmationMessage: "Your request has been submitted.",
      audience: "organization",
    };
  if (kind === "dashboard") return { ...shared, widgets: [] };
  if (kind === "template")
    return {
      ...shared,
      project: project
        ? {
            name: project.name,
            description: project.description,
            color: project.color,
            privacy: project.privacy,
            defaultView: project.defaultView,
            sections: project.sections,
            fields: project.fields,
            members: project.members,
            startOn: project.startOn,
            dueOn: project.dueOn,
            health: project.health,
            clientId: project.clientId,
          }
        : {
            name,
            description: "",
            color: "#3a6364",
            privacy: "private",
            defaultView: "list",
            sections: [],
            fields: [],
            members: [],
            startOn: null,
            dueOn: null,
            health: "on_track",
            clientId: null,
          },
      tasks: [],
    };
  return {};
}
export function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
