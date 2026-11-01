import { z } from "zod";
import type { TrackerBackend } from "@/shared/portfolio/config/config";
const count = z.number().int().nonnegative().safe();
const time = z.string().datetime();
const family = z.enum([
  "bill",
  "hearing",
  "regulation",
  "program_element",
  "state_bill",
]);
const status = z.enum([
  "COVERED",
  "PARTIAL",
  "UNSUPPORTED",
  "STALE",
  "UNAVAILABLE",
]);
const material = z.object({
  metric: z.literal("tracker.material_changes"),
  version: z.literal(1),
  backend: z.enum(["core", "intelligence"]),
  clientId: z.string().min(1),
  window: z.object({
    start: time,
    end: time,
    bounds: z.literal("[start,end)"),
    days: z.literal(21),
  }),
  asOf: time,
  observedAt: time,
  sourceObservedAt: time.nullable(),
  count,
  complete: z.literal(true),
  capped: z.literal(false),
});
export type MaterialChanges = z.infer<typeof material>;
export function materialChangesSchema(
  clientId: string,
  backend: TrackerBackend,
) {
  return material.refine((value) => {
    const start = Date.parse(value.window.start),
      end = Date.parse(value.window.end);
    const source =
      value.sourceObservedAt === null
        ? null
        : Date.parse(value.sourceObservedAt);
    return (
      value.clientId === clientId &&
      value.backend === backend &&
      end - start === 21 * 86400000 &&
      Date.parse(value.asOf) === end &&
      Date.parse(value.observedAt) >= end &&
      (value.count === 0
        ? source === null
        : source !== null && source >= start && source < end)
    );
  }, "Material-change scope or fixed window does not match.");
}
const coverage = z.object({
  clientId: z.string().min(1),
  backend: z.enum(["core", "intelligence"]),
  asOf: time,
  configuration: z.object({
    model: z.enum(["client_watchlist", "intel_watchlist"]),
    configured: z.boolean(),
    complete: z.boolean(),
    topicCount: count,
    tagCount: count,
    flatTermCount: count,
    issueAreaCount: count,
    reason: z
      .enum([
        "CORE_WATCHLIST_MODEL_UNSUPPORTED",
        "UNMAPPED_WATCHLIST_CONFIGURATION",
      ])
      .nullable(),
  }),
  overall: z.object({
    coveredConcepts: count,
    totalConcepts: count,
    percentage: z.number().int().min(0).max(100).nullable(),
    status: z.enum([
      "COVERED",
      "PARTIAL",
      "UNSUPPORTED",
      "STALE",
      "UNAVAILABLE",
      "NOT_CONFIGURED",
    ]),
  }),
  concepts: z.array(
    z.object({
      conceptId: z.string().min(1),
      label: z.string(),
      signalFamilies: z.array(family),
      status,
      supportingSources: z.array(z.string()),
      gaps: z.array(z.string()),
      lastObservedAt: time.nullable(),
    }),
  ),
  signalFamilies: z.array(
    z.object({
      family,
      configuredConcepts: count,
      coveredConcepts: count,
      status,
    }),
  ),
  sourceHealth: z.object({
    healthy: count,
    degraded: count,
    failing: count,
    stale: count,
    acceptedExceptions: count,
  }),
  recommendations: z.array(z.string()),
});
export type WatchCoverage = z.infer<typeof coverage>;
function validConfiguration(value: WatchCoverage) {
  const config = value.configuration;
  if (value.backend === "core")
    return (
      config.model === "client_watchlist" &&
      config.topicCount === 0 &&
      config.flatTermCount === 0 &&
      config.configured === config.tagCount + config.issueAreaCount > 0 &&
      config.complete === !config.configured &&
      config.reason ===
        (config.configured ? "CORE_WATCHLIST_MODEL_UNSUPPORTED" : null)
    );
  const complete = config.flatTermCount === 0 && config.issueAreaCount === 0;
  return (
    config.model === "intel_watchlist" &&
    config.tagCount === 0 &&
    config.configured ===
      config.topicCount + config.flatTermCount + config.issueAreaCount > 0 &&
    config.complete === complete &&
    config.reason === (complete ? null : "UNMAPPED_WATCHLIST_CONFIGURATION")
  );
}
export function watchCoverageSchema(clientId: string, backend: TrackerBackend) {
  return coverage.refine((value) => {
    const { overall, configuration: config, concepts } = value;
    if (
      value.clientId !== clientId ||
      value.backend !== backend ||
      !validConfiguration(value) ||
      config.topicCount !== concepts.length ||
      overall.totalConcepts !== concepts.length ||
      new Set(concepts.map((concept) => concept.conceptId)).size !==
        concepts.length ||
      overall.coveredConcepts !==
        concepts.filter((concept) => concept.status === "COVERED").length
    )
      return false;
    const percentage =
      config.complete && concepts.length > 0
        ? Math.round((overall.coveredConcepts / concepts.length) * 100)
        : null;
    if (overall.percentage !== percentage) return false;
    if (!concepts.length)
      return (
        overall.status ===
        (config.configured ? "UNSUPPORTED" : "NOT_CONFIGURED")
      );
    if (!config.complete) return overall.status === "PARTIAL";
    const rank = {
      COVERED: 0,
      PARTIAL: 1,
      STALE: 2,
      UNSUPPORTED: 3,
      UNAVAILABLE: 4,
    };
    const worst = concepts.reduce(
      (prior, concept) =>
        rank[concept.status] > rank[prior] ? concept.status : prior,
      "COVERED" as z.infer<typeof status>,
    );
    const expectedStatus =
      overall.coveredConcepts === concepts.length
        ? "COVERED"
        : overall.coveredConcepts > 0
          ? "PARTIAL"
          : worst;
    return overall.status === expectedStatus;
  }, "Watchlist coverage scope or configuration is inconsistent.");
}
