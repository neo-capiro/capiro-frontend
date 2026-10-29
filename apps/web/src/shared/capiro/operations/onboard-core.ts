import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  importCandidatesSchema,
  importChunkResultSchema,
  registrantHitSchema,
  tenantRegistrantSchema,
} from "./onboard-core-schemas";

const firmSource =
  "apps/api/src/intelligence/firm-onboarding.controller.ts + firm-onboarding.service.ts @7b5a9644d30d22389b23f0e07f923c8925682047";
const empty = z.object({}).strict();
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
} as const;
