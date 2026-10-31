import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  aggregateClientId,
  aggregateRequest,
} from "./domain-aggregate-schemas";

export const workspaceMetrics = z
  .object({
    metric: z.literal("workspace.saved-work-products"),
    version: z.literal(1),
    scope: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("actor"), clientId: z.null() }).strict(),
      z
        .object({ kind: z.literal("client"), clientId: aggregateClientId })
        .strict(),
    ]),
    count: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    observationStartedAt: z.iso.datetime(),
    observedAt: z.iso.datetime(),
    complete: z.literal(true),
    capped: z.literal(false),
  })
  .refine(
    (data) =>
      Date.parse(data.observedAt) >= Date.parse(data.observationStartedAt),
  );
export const workspaceMetricOperations = {
  "workspace.metrics.savedWork": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/saved-work-count",
    request: aggregateRequest,
    response: workspaceMetrics,
    source:
      "Core344 600ed8c3de029e768d84a44a83eacf821cd00a85 / DraftsController.savedWorkCount",
  }),
} as const;
