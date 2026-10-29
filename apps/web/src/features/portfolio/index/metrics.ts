import { z } from "zod";
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const group = <T extends z.ZodType>(counts: T) =>
  z.discriminatedUnion("status", [
    z.object({
      status: z.literal("available"),
      coverage: z.literal("complete"),
      counts,
    }),
    z.object({ status: z.literal("unavailable") }),
  ]);
export const portfolioMetricsSchema = z
  .object({
    definition: z.literal("portfolio-recorded-baseline-v1"),
    tenantId: z.uuid(),
    observedAt: z.iso.datetime(),
    activityWindow: z.object({
      start: z.iso.datetime(),
      end: z.iso.datetime(),
      timezone: z.literal("UTC"),
    }),
    clients: group(z.object({ activeClients: count })),
    objectives: group(
      z
        .object({ objectives: count, awaitingReview: count, ready: count })
        .refine((v) => v.awaitingReview + v.ready <= v.objectives),
    ),
    activity: group(
      z.object({
        recordedActivities: count,
        overdueRequests: count,
        overdueCommitments: count,
      }),
    ),
    billWatch: group(
      z
        .object({
          activeClients: count,
          clientsWithWatches: count,
          clientBillWatches: count,
          distinctBills: count,
        })
        .refine(
          (v) =>
            v.clientsWithWatches <= v.activeClients &&
            v.clientsWithWatches <= v.clientBillWatches &&
            v.distinctBills <= v.clientBillWatches,
        ),
    ),
  })
  .refine(
    (v) =>
      v.activityWindow.end === v.observedAt &&
      Date.parse(v.activityWindow.end) - Date.parse(v.activityWindow.start) ===
        30 * 86400000,
  );
export type PortfolioMetrics = z.infer<typeof portfolioMetricsSchema>;
export const portfolioMetricsFor = (tenantId: string) =>
  portfolioMetricsSchema.refine(
    (v) => v.tenantId === tenantId,
    "Metrics belong to another tenant",
  );
export const portfolioMetricFreshness = (
  data: PortfolioMetrics,
  now: number,
) =>
  Math.abs(now - Date.parse(data.observedAt)) > 120000 ? "stale" : "current";
