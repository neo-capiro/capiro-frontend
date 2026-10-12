import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  emptyStrategyRequest,
  firmPhase,
  firmPhaseFields,
  strategyDetail,
  strategyId,
  strategyMetadata,
  strategyNodeFields,
  strategyParams,
  strategySummary,
  strategyVersion,
} from "./strategies-schemas";

const source =
  "capirov2@4be13b0 apps/api-strategy/src/strategy/{strategy,node,version}.service.ts and DTOs; firm-phases service and DTO";
const read = z.object({ params: strategyParams }).strict();
const nodeParams = strategyParams.extend({ nodeId: strategyId }).strict();
export const strategiesPlanOperations = {
  "strategies.list": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/strategies",
    request: emptyStrategyRequest,
    response: z.array(strategySummary),
    source,
  }),
  "strategies.detail": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/strategies/:id",
    request: read,
    response: strategyDetail,
    source,
  }),
  "strategies.create": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/strategies",
    request: z.object({ body: strategyMetadata }).strict(),
    response: strategyDetail,
    source,
  }),
  "strategies.update": defineOperation({
    service: "strategy",
    method: "PATCH",
    path: "/strategies/:id",
    request: z
      .object({
        params: strategyParams,
        body: strategyMetadata
          .omit({ clientId: true })
          .partial()
          .extend({
            ownerUserId: z.string().trim().min(1).max(120).optional(),
            goal: z.string().max(4000).nullable().optional(),
            meriContext: z.string().max(8000).nullable().optional(),
            targetDate: z.iso.date().nullable().optional(),
            changeNote: z.string().max(200).optional(),
          })
          .strict(),
      })
      .strict(),
    response: strategyDetail,
    source,
  }),
  "strategies.archive": defineOperation({
    service: "strategy",
    method: "DELETE",
    path: "/strategies/:id",
    request: read,
    response: z.object({ id: strategyId, archivedAt: z.string() }),
    source,
  }),
  "strategies.step.create": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/strategies/:id/nodes",
    request: z
      .object({ params: strategyParams, body: strategyNodeFields })
      .strict(),
    response: strategyDetail,
    source,
  }),
  "strategies.step.update": defineOperation({
    service: "strategy",
    method: "PATCH",
    path: "/strategies/:id/nodes/:nodeId",
    request: z
      .object({
        params: nodeParams,
        body: strategyNodeFields
          .partial()
          .extend({
            expectedUpdatedAt: z.iso.datetime({ offset: true }).optional(),
            changeNote: z.string().max(200).optional(),
            targetRef: strategyNodeFields.shape.targetRef
              .unwrap()
              .nullable()
              .optional(),
          })
          .strict(),
      })
      .strict(),
    response: strategyDetail,
    source,
  }),
  "strategies.step.delete": defineOperation({
    service: "strategy",
    method: "DELETE",
    path: "/strategies/:id/nodes/:nodeId",
    request: z.object({ params: nodeParams }).strict(),
    response: strategyDetail,
    source,
  }),
  "strategies.phases": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/firm-phases",
    request: emptyStrategyRequest,
    response: z.array(firmPhase),
    source,
  }),
  "strategies.phases.replace": defineOperation({
    service: "strategy",
    method: "PUT",
    path: "/firm-phases",
    request: z
      .object({
        body: z.object({ rows: z.array(firmPhaseFields).max(40) }).strict(),
      })
      .strict(),
    response: z.array(firmPhase),
    source,
  }),
  "strategies.versions": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/strategies/:id/versions",
    request: z
      .object({
        params: strategyParams,
        query: z
          .object({
            take: z.number().int().min(1).max(100).optional(),
            cursor: strategyId.optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.object({
      items: z.array(strategyVersion),
      nextCursor: strategyId.nullable(),
    }),
    source,
  }),
  "strategies.version.restore": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/strategies/:id/versions/:versionId/restore",
    request: z
      .object({
        params: strategyParams.extend({ versionId: strategyId }).strict(),
      })
      .strict(),
    response: strategyDetail,
    source,
  }),
  "strategies.step.link": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/strategies/:id/nodes/:nodeId/artifacts",
    request: z
      .object({
        params: nodeParams,
        body: z
          .object({
            artifactType: z.enum(["workspace_draft", "outreach_record"]),
            artifactRef: z.string().trim().min(1).max(200),
          })
          .strict(),
      })
      .strict(),
    response: strategyDetail,
    source,
  }),
};
