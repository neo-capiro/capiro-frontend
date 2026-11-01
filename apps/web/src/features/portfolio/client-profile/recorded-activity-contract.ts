import { z } from "zod";
import type { CurrentActor } from "@/shared/portfolio/auth/current-actor";

const counts = z.object({
  meetings: z.number().int().nonnegative().safe(),
  emails: z.number().int().nonnegative().safe(),
  tasksCompleted: z.number().int().nonnegative().safe(),
  debriefs: z.number().int().nonnegative().safe(),
  outreachSent: z.number().int().nonnegative().safe(),
});
const windowSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});
const common = {
  version: z.literal(1),
  measure: z.literal("recorded_activity_index"),
  basis: z.literal("Recorded activity index"),
  disclosure: z.literal(
    "Measures internal logging, not relationship quality or effectiveness.",
  ),
  scope: z.object({
    tenantId: z.string().min(1),
    actorUserId: z.string().min(1),
    clientId: z.string().min(1),
  }),
  asOf: z.string().datetime(),
  period: z.literal("7d"),
  window: windowSchema,
  comparisonWindow: windowSchema,
  timestampBasis: z.object({
    meetings: z.literal("startsAt"),
    emails: z.literal("mailThread.lastMessageAt"),
    tasksCompleted: z.literal("doneTask.updatedAt"),
    debriefs: z.literal("createdAt"),
    outreachSent: z.literal("sentAt"),
  }),
};
const response = z.discriminatedUnion("status", [
  z.object({
    ...common,
    status: z.literal("complete"),
    reason: z.null(),
    score: z.number().int().min(0).max(100),
    priorScore: z.number().int().min(0).max(100),
    breakdown: counts,
    priorBreakdown: counts,
    trend: z.enum(["improving", "stable", "declining"]),
  }),
  z.object({
    ...common,
    status: z.literal("incomplete"),
    reason: z.enum(["capacity", "changed"]),
    score: z.null(),
    priorScore: z.null(),
    breakdown: z.null(),
    priorBreakdown: z.null(),
    trend: z.null(),
  }),
]);
export type RecordedActivityResponse = z.infer<typeof response>;
// Verify the producer's versioned semantics; the UI never substitutes a computed score.
const expectedScore = (value: z.infer<typeof counts>) =>
  Math.min(
    100,
    15 * value.meetings +
      2 * value.emails +
      10 * value.tasksCompleted +
      20 * value.debriefs +
      5 * value.outreachSent,
  );
export function recordedActivitySchema(clientId: string, actor: CurrentActor) {
  return response.refine((value) => {
    const end = Date.parse(value.asOf);
    const week = 7 * 24 * 60 * 60 * 1000;
    if (
      value.scope.clientId !== clientId ||
      value.scope.tenantId !== actor.tenantId ||
      value.scope.actorUserId !== actor.userId ||
      Date.parse(value.window.to) !== end ||
      Date.parse(value.window.from) !== end - week ||
      Date.parse(value.comparisonWindow.to) !== end - week ||
      Date.parse(value.comparisonWindow.from) !== end - 2 * week
    )
      return false;
    if (value.status === "incomplete") return true;
    const trend =
      value.score > value.priorScore + 5
        ? "improving"
        : value.score < value.priorScore - 5
          ? "declining"
          : "stable";
    return (
      value.score === expectedScore(value.breakdown) &&
      value.priorScore === expectedScore(value.priorBreakdown) &&
      value.trend === trend
    );
  }, "Recorded activity scope or versioned semantics do not match.");
}
