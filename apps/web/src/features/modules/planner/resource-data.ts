import type { PlannerResource } from "../../../shared/capiro/operations/planner-schemas";
export const resourceSectionKinds: Record<string, PlannerResource["kind"]> = {
  portfolios: "portfolio",
  goals: "goal",
  reporting: "dashboard",
};
export function initialResourceData(
  kind: PlannerResource["kind"],
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
  if (kind === "dashboard") return { ...shared, widgets: [] };
  return {};
}
export function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
