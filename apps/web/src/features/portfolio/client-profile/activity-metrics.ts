import { z } from "zod";
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const activityMetricsSchema = z
  .object({
    definition: z.literal("client-recorded-activity-v1"),
    tenantId: z.uuid(),
    clientId: z.uuid(),
    observedAt: z.iso.datetime(),
    window: z.object({
      start: z.iso.datetime(),
      end: z.iso.datetime(),
      timezone: z.literal("UTC"),
    }),
    coverage: z.literal("complete"),
    counts: z.object({
      recordedActivities: count,
      openRequests: count,
      overdueRequests: count,
      openCommitments: count,
      overdueCommitments: count,
    }),
  })
  .refine(
    (value) =>
      value.window.end === value.observedAt &&
      Date.parse(value.window.end) - Date.parse(value.window.start) ===
        30 * 86400000 &&
      value.counts.overdueRequests <= value.counts.openRequests &&
      value.counts.overdueCommitments <= value.counts.openCommitments,
    "Activity metric definitions do not match the reported population",
  );
export type ActivityMetrics = z.infer<typeof activityMetricsSchema>;
export const scopedActivityMetrics = (tenantId: string, clientId: string) =>
  activityMetricsSchema.refine(
    (value) => value.tenantId === tenantId && value.clientId === clientId,
    "Activity metrics do not match the current profile",
  );
export function activityMetricsFreshness(
  metrics: ActivityMetrics,
  now: number,
) {
  const age = now - Date.parse(metrics.observedAt);
  return age > 120000 || age < -120000 ? "stale" : "current";
}
