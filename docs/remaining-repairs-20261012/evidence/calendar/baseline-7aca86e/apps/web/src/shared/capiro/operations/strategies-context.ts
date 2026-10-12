import { z } from "zod";
import { defineOperation } from "../contracts";
import { strategyId, strategyParams } from "./strategies-schemas";

const source =
  "capirov2@4be13b0 apps/api-strategy/src/context/{context.controller,context-documents.service,steward.controller,steward.service}.ts; context DTOs and Prisma models";
const read = z.object({ params: strategyParams }).strict();
export const contextDocument = z.object({
  id: strategyId,
  clientId: strategyId.nullable(),
  scope: z.enum(["once", "node", "strategy", "client", "firm"]),
  scopeRef: strategyId.nullable(),
  templateKey: z.string(),
  title: z.string(),
  state: z.enum(["draft", "active", "superseded", "archived"]),
  content: z.string(),
  checksum: z.string(),
  validUntil: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  stale: z.boolean().optional(),
});
export const contextFact = z.object({
  id: strategyId,
  documentId: strategyId,
  clientId: strategyId.nullable(),
  fact: z.string(),
  sourceRef: z.string(),
  authority: z.string().nullable(),
  asOf: z.string().nullable(),
  confidence: z.number().nullable(),
  state: z.enum(["active", "superseded", "stale", "rejected"]),
  citation: z.string().nullable(),
  document: z.object({ title: z.string(), templateKey: z.string() }).optional(),
});
const conflictSide = z.object({
  id: strategyId,
  fact: z.string(),
  documentTitle: z.string(),
  authority: z.string().nullable(),
  asOf: z.string().nullable(),
  clientId: strategyId.nullable(),
});
export const contextConflict = z.object({
  id: strategyId,
  factAId: strategyId,
  factBId: strategyId,
  material: z.boolean(),
  state: z.enum(["open", "resolved", "dismissed"]),
  resolutionNote: z.string().nullable(),
  factA: conflictSide.nullable().optional(),
  factB: conflictSide.nullable().optional(),
  clientId: strategyId.nullable().optional(),
});
const contextQuery = z
  .object({
    clientId: strategyId.optional(),
    includeFirm: z.enum(["true", "false"]).optional(),
    firmOnly: z.enum(["true", "false"]).optional(),
  })
  .strict();
export const strategiesContextOperations = {
  "strategies.context.documents": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/context/documents",
    request: z
      .object({
        query: contextQuery
          .extend({
            templateKey: z.string().max(200).optional(),
            state: z
              .enum(["draft", "active", "superseded", "archived"])
              .optional(),
            includeStale: z.enum(["true", "false"]).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.array(contextDocument),
    source,
  }),
  "strategies.context.document": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/context/documents/:id",
    request: read,
    response: contextDocument,
    source,
  }),
  "strategies.context.upload": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/context/documents",
    request: z
      .object({
        body: z
          .object({
            content: z.string().max(300000),
            clientId: strategyId.optional(),
            scopeRef: strategyId.optional(),
            title: z.string().max(300).optional(),
          })
          .strict(),
      })
      .strict(),
    response: contextDocument,
    source,
  }),
  "strategies.context.approve": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/context/documents/:id/approve",
    request: z
      .object({
        params: strategyParams,
        body: z
          .object({ expectedChecksum: z.string().regex(/^[a-f0-9]{64}$/) })
          .strict(),
      })
      .strict(),
    response: contextDocument,
    source,
  }),
  "strategies.context.reassign": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/context/documents/:id/reassign",
    request: z
      .object({
        params: strategyParams,
        body: z
          .object({
            expectedChecksum: z.string().regex(/^[a-f0-9]{64}$/),
            strategyId,
          })
          .strict(),
      })
      .strict(),
    response: contextDocument,
    source,
  }),
  "strategies.context.archive": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/context/documents/:id/archive",
    request: read,
    response: contextDocument,
    source,
  }),
  "strategies.context.facts": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/context/facts",
    request: z
      .object({
        query: contextQuery
          .extend({
            documentId: strategyId.optional(),
            state: z
              .enum(["active", "superseded", "stale", "rejected"])
              .optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.array(contextFact),
    source,
  }),
  "strategies.context.conflicts": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/context/conflicts",
    request: z
      .object({
        query: contextQuery
          .extend({
            state: z.enum(["open", "resolved", "dismissed"]).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.array(contextConflict),
    source,
  }),
  "strategies.context.fact.reject": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/context/facts/:id/reject",
    request: read,
    response: contextFact,
    source,
  }),
  "strategies.context.conflict.resolve": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/context/conflicts/:id/resolve",
    request: z
      .object({
        params: strategyParams,
        body: z
          .object({
            note: z.string().trim().min(1).max(2000),
            controllingFactId: strategyId.optional(),
          })
          .strict(),
      })
      .strict(),
    response: contextConflict,
    source,
  }),
  "strategies.context.conflict.dismiss": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/context/conflicts/:id/dismiss",
    request: read,
    response: contextConflict,
    source,
  }),
  "strategies.context.health": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/context/health",
    request: z
      .object({
        query: z
          .object({ clientId: strategyId.optional() })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.object({
      assessment: z.enum([
        "missing",
        "not_assessed",
        "stale",
        "conflicted",
        "assessed",
      ]),
      status: z.enum(["ok", "degraded", "conflicted"]),
      factCounts: z.object({
        active: z.number(),
        superseded: z.number(),
        stale: z.number(),
        rejected: z.number(),
      }),
      openConflicts: z.number(),
      missingRequired: z.array(z.string()),
      staleDocs: z.array(
        z.object({
          id: strategyId,
          title: z.string(),
          templateKey: z.string(),
          validUntil: z.string().nullable(),
        }),
      ),
    }),
    source,
  }),
};
export type StrategyContextDocument = z.infer<typeof contextDocument>;
export type StrategyContextFact = z.infer<typeof contextFact>;
export type StrategyContextConflict = z.infer<typeof contextConflict>;
