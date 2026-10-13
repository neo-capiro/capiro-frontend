import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  firmMemoryTypeSchema,
  importCandidatesSchema,
  importChunkResultSchema,
  memoryFileDefSchema,
  memoryReviewReceiptSchema,
  memorySectionsFileSchema,
  registrantHitSchema,
  tenantRegistrantSchema,
} from "./onboard-core-schemas";

const firmSource =
  "apps/api/src/intelligence/firm-onboarding.controller.ts + firm-onboarding.service.ts @7b5a9644d30d22389b23f0e07f923c8925682047";
const memorySource =
  "apps/api/src/memory/memory.controller.ts @7b5a9644d30d22389b23f0e07f923c8925682047";
const empty = z.object({}).strict();
const memoryParams = z.object({ type: firmMemoryTypeSchema }).strict();
export const onboardCoreOperations = {
  "onboard.core.registrants": defineOperation({
    service: "core",
    method: "GET",
    path: "/firm/lda-registrants",
    source: firmSource,
    request: z
      .object({ query: z.object({ q: z.string().min(2).max(200) }).strict() })
      .strict(),
    response: z.array(registrantHitSchema),
  }),
  "onboard.core.registrant": defineOperation({
    service: "core",
    method: "GET",
    path: "/firm/registrant",
    source: firmSource,
    request: empty,
    response: tenantRegistrantSchema,
  }),
  "onboard.core.setRegistrant": defineOperation({
    service: "core",
    method: "PUT",
    path: "/firm/registrant",
    source: firmSource,
    request: z
      .object({
        body: z.object({ registrantId: z.number().int().min(1) }).strict(),
      })
      .strict(),
    response: tenantRegistrantSchema.extend({
      ldaRegistrantId: z.number(),
      ldaRegistrantName: z.string(),
    }),
  }),
  "onboard.core.importCandidates": defineOperation({
    service: "core",
    method: "GET",
    path: "/firm/import-candidates",
    source: firmSource,
    request: empty,
    response: importCandidatesSchema,
  }),
  "onboard.core.import": defineOperation({
    service: "core",
    method: "POST",
    path: "/firm/import",
    source: firmSource,
    request: z
      .object({
        body: z
          .object({ ldaClientIds: z.array(z.number().int()).min(1).max(100) })
          .strict(),
      })
      .strict(),
    response: importChunkResultSchema,
  }),
  "onboard.core.memoryCatalog": defineOperation({
    service: "core",
    method: "GET",
    path: "/memory/catalog",
    source: memorySource,
    request: empty,
    response: z.array(memoryFileDefSchema),
  }),
  "onboard.core.memoryRead": defineOperation({
    service: "core",
    method: "GET",
    path: "/memory/items/:type/firm/sections",
    source: memorySource,
    request: z.object({ params: memoryParams }).strict(),
    response: memorySectionsFileSchema,
  }),
  "onboard.core.memoryWrite": defineOperation({
    service: "core",
    method: "PUT",
    path: "/memory/items/:type/firm/sections",
    source: memorySource,
    request: z
      .object({
        params: memoryParams,
        body: z
          .object({
            sections: z.array(
              z.object({ key: z.string(), body: z.string() }).strict(),
            ),
          })
          .strict(),
      })
      .strict(),
    response: memoryReviewReceiptSchema,
  }),
} as const;
