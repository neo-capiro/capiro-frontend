import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  importCandidatesSchema,
  importChunkResultSchema,
  importJobPageSchema,
  importJobStatusViewSchema,
  importJobViewSchema,
  registrantHitSchema,
  tenantRegistrantSchema,
} from "./onboard-core-schemas";

/**
 * Existing Core owner at the accepted SCRUM-173 commit: POST /firm/import and
 * the additive durable job read routes in the same controller/store.
 */
const firmSource =
  "apps/api/src/intelligence/firm-onboarding.controller.ts + firm-onboarding.service.ts + firm-import-job.{contracts,store}.ts @ed56e53e3d4ae8fa2a1cc6107c0a269038d509b6";
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
  /**
   * Existing importer, extended: a stable client-supplied requestId binds the
   * durable job identity. A replay of the same identity/selection reconciles
   * the same job; a changed selection is a Core 409.
   */
  "onboard.core.import": defineOperation({
    service: "core",
    method: "POST",
    path: "/firm/import",
    source: firmSource,
    request: z
      .object({
        body: z
          .object({
            ldaClientIds: z.array(z.number().int()).min(1).max(100),
            requestId: z.uuid().optional(),
          })
          .strict(),
      })
      .strict(),
    response: importChunkResultSchema,
  }),
  "onboard.core.importJobs": defineOperation({
    service: "core",
    method: "GET",
    path: "/firm/import-jobs",
    source: firmSource,
    request: z
      .object({
        query: z
          .object({
            limit: z.number().int().min(1).max(50).optional(),
            cursor: z.string().min(1).max(512).optional(),
            requestId: z.uuid().optional(),
          })
          .strict(),
      })
      .strict(),
    response: importJobPageSchema,
  }),
  "onboard.core.importJob": defineOperation({
    service: "core",
    method: "GET",
    path: "/firm/import-jobs/:jobId",
    source: firmSource,
    request: z
      .object({ params: z.object({ jobId: z.uuid() }).strict() })
      .strict(),
    response: importJobViewSchema,
  }),
  "onboard.core.importJobStatus": defineOperation({
    service: "core",
    method: "GET",
    path: "/firm/import-jobs/:jobId/status",
    source: firmSource,
    request: z
      .object({ params: z.object({ jobId: z.uuid() }).strict() })
      .strict(),
    response: importJobStatusViewSchema,
  }),
} as const;
