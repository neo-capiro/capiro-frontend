import { z } from "zod";
import { identity, plannerId, role, version } from "./planner-core-schemas";
import { resourceDataSchemas } from "./planner-resource-data";
export * from "./planner-core-schemas";
export const resourceKinds = [
  "portfolio",
  "goal",
  "saved_view",
  "view_preferences",
  "my_tasks",
  "dashboard",
] as const;
const resourceBase = z.object({
  id: plannerId,
  projectId: plannerId.nullable(),
  ownerId: identity,
  name: z.string(),
  version,
  archived: z.boolean(),
  access: role,
  goalProgress: z
    .object({ value: z.number(), percentage: z.number() })
    .optional(),
});
export const resource = z.discriminatedUnion("kind", [
  resourceBase.extend({
    kind: z.literal("portfolio"),
    data: resourceDataSchemas.portfolio,
  }),
  resourceBase.extend({
    kind: z.literal("goal"),
    data: resourceDataSchemas.goal,
  }),
  resourceBase.extend({
    kind: z.literal("saved_view"),
    data: resourceDataSchemas.saved_view,
  }),
  resourceBase.extend({
    kind: z.literal("view_preferences"),
    data: resourceDataSchemas.view_preferences,
  }),
  resourceBase.extend({
    kind: z.literal("my_tasks"),
    data: resourceDataSchemas.my_tasks,
  }),
  resourceBase.extend({
    kind: z.literal("dashboard"),
    data: resourceDataSchemas.dashboard,
  }),
]);
export type PlannerResource = z.infer<typeof resource>;
