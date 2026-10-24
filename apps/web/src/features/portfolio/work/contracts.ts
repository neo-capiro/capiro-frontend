import { z } from "zod";
export const strategySummarySchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  title: z.string(),
  type: z.string(),
  ownerUserId: z.string(),
  nodeCount: z.number().int(),
});
export const strategyNodeSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  kind: z.string(),
  status: z.string(),
  startsOn: z.string(),
  endsOn: z.string().nullable(),
  openEnded: z.boolean(),
  ownerUserId: z.string().nullable(),
  note: z.string().nullable(),
});
export const strategyDetailSchema = strategySummarySchema
  .omit({ nodeCount: true })
  .extend({
    goal: z.string().nullable(),
    targetDate: z.string().nullable(),
    draftedByMeri: z.boolean(),
    nodes: z.array(strategyNodeSchema),
    artifacts: z.array(z.object({ id: z.string().uuid() })),
  });
export function strategyDetailFor(strategyId: string, clientId: string) {
  return strategyDetailSchema.refine(
    (strategy) => strategy.id === strategyId && strategy.clientId === clientId,
    {
      message:
        "The strategy response does not match the requested client and strategy.",
    },
  );
}
export const workspaceDraftSchema = z.object({
  id: z.string().uuid(),
  prospectId: z.uuid().nullable().optional(),
  docTitle: z.string(),
  client: z.string().nullable(),
  clientId: z.uuid().nullable().optional(),
  product: z.string().nullable(),
  ownerId: z.string(),
  status: z.enum(["draft", "complete"]),
  updatedAt: z.string(),
});
export type StrategyDetail = z.infer<typeof strategyDetailSchema>;
export type WorkspaceDraft = z.infer<typeof workspaceDraftSchema>;

// Client names are presentation only; held legacy rows never infer association.
export function clientDrafts(
  drafts: WorkspaceDraft[],
  client: { id: string; name: string },
  _clients: { id: string; name: string }[],
) {
  return drafts.filter(
    (draft) => !draft.prospectId && draft.clientId === client.id,
  );
}
export function workProjection(strategies: StrategyDetail[], today: string) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 30);
  const end = date.toISOString().slice(0, 10);
  const nodes = strategies.flatMap((strategy) =>
    strategy.nodes.map((node) => ({
      ...node,
      strategyId: strategy.id,
      strategyTitle: strategy.title,
    })),
  );
  const live = nodes.filter(
    (node) => node.status === "active" || node.status === "in_progress",
  );
  const upcoming = live
    .filter(
      (node) =>
        node.startsOn.slice(0, 10) >= today && node.startsOn.slice(0, 10) < end,
    )
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  return {
    live,
    upcoming,
    risks: nodes.filter(
      (node) => node.kind === "risk" && node.status !== "completed",
    ),
    artifacts: strategies.reduce(
      (total, strategy) => total + strategy.artifacts.length,
      0,
    ),
  };
}
