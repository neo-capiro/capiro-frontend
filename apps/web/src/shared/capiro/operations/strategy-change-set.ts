import { z } from "zod";
import { strategyId } from "./strategies-schemas";

export const planEditSchema = z.object({
  op: z.enum(["add", "update", "remove", "retime"]),
  nodeId: z.string().optional(),
  kind: z.string().optional(),
  subject: z.string().optional(),
  title: z.string().optional(),
  note: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  ownerUserId: z.string().nullable().optional(),
  startsOn: z.string().optional(),
  endsOn: z.string().nullable().optional(),
  openEnded: z.boolean().optional(),
  dependsOn: z.array(z.string()).optional(),
  sources: z
    .array(z.object({ section: z.string(), ref: z.string().optional() }))
    .optional(),
});
// JSON is retained losslessly and remains opaque until operation classification.
const storedOperation: z.ZodType<unknown> = z.json();

export const strategyChangeSet = z.object({
  id: strategyId,
  strategyId,
  summary: z.string(),
  ops: z.array(storedOperation),
  approvedOps: z.array(storedOperation).nullable().optional(),
  risk: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum([
    "proposed",
    "approved",
    "rejected",
    "applied",
    "undone",
    "stale",
    "superseded",
  ]),
  strategyVersionId: strategyId,
  appliedVersionId: strategyId.nullable(),
  createdAt: z.string(),
  appliedAt: z.string().nullable(),
  approvedAt: z.string().nullable(),
});
export type PlanEdit = z.infer<typeof planEditSchema>;
export type StrategyChangeSet = z.infer<typeof strategyChangeSet>;
