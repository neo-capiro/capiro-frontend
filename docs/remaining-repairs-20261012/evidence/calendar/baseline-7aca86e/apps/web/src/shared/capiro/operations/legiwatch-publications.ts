import { z } from "zod";
import { defineOperation } from "../contracts";
import { hearingIdParams } from "./legiwatch-calendar-schemas";
import {
  hearingSmsSettingsSchema,
  publicationAudienceSchema,
  publicationCompositionSchema,
  publicationCreateBodySchema,
  publicationDeliveryBodySchema,
  publicationDeliveryHistorySchema,
  publicationEvidenceSchema,
  publicationKindSchema,
  publicationScopeBodySchema,
  publicationVersionSchema,
} from "./legiwatch-publication-schemas";
const sessionParams = z
    .object({ sessionId: z.string().min(1).max(200) })
    .strict(),
  versionParams = sessionParams
    .extend({ id: z.string().min(1).max(200) })
    .strict();
const base = "/hearings/:sessionId/publications",
  source =
    "apps/intel-api/src/hearing/hearing-publication.controller.ts; hearing-publication.service.ts; publication-domain.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const sms =
    "apps/intel-api/src/hearing/hearing-sms.controller.ts; tracker/sms/sms-verification.service.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace",
  clientParams = z.object({ clientId: z.uuid() }).strict();
export const legiwatchPublicationOperations = {
  "legiwatch.publicReview.open": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/public-hearings/:id/review-context",
    request: z
      .object({
        params: hearingIdParams,
        body: z.object({ kind: publicationKindSchema }).strict(),
      })
      .strict(),
    response: z.object({
      sessionId: z.string(),
      hearingId: z.string(),
      title: z.string(),
      captureId: z.string(),
    }),
    source:
      "apps/intel-api/src/hearing/public-hearing-review.controller.ts; hearing-publication.service.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace",
  }),
  "legiwatch.publications": defineOperation({
    service: "intelligence",
    method: "GET",
    path: base,
    request: z
      .object({
        params: sessionParams,
        query: z.object({ kind: publicationKindSchema }).strict(),
      })
      .strict(),
    response: z.array(
      publicationVersionSchema.extend({
        seriesId: z.string(),
        createdAt: z.string(),
        approvedAt: z.string().nullable(),
        supersedesId: z.string().nullable(),
      }),
    ),
    source,
  }),
  "legiwatch.publication.candidates": defineOperation({
    service: "intelligence",
    method: "GET",
    path: `${base}/candidates`,
    request: z
      .object({
        params: sessionParams,
        query: z.object({ kind: publicationKindSchema }).strict(),
      })
      .strict(),
    response: z.object({
      evidence: z.array(publicationEvidenceSchema),
      candidates: z.array(
        z.object({
          id: z.string(),
          kind: z.literal("analysis"),
          title: z.string(),
          text: z.string(),
          evidenceIds: z.array(z.string().nullable()),
          startMs: z.number().nullable(),
        }),
      ),
      selection: z.string(),
    }),
    source,
  }),
  "legiwatch.publication.version": defineOperation({
    service: "intelligence",
    method: "GET",
    path: `${base}/:id`,
    request: z.object({ params: versionParams }).strict(),
    response: publicationVersionSchema,
    source,
  }),
  "legiwatch.publication.create": defineOperation({
    service: "intelligence",
    method: "POST",
    path: base,
    request: z
      .object({ params: sessionParams, body: publicationCreateBodySchema })
      .strict(),
    response: publicationVersionSchema,
    source,
    requestLimitBytes: 300000,
  }),
  "legiwatch.publication.generate": defineOperation({
    service: "intelligence",
    method: "POST",
    path: `${base}/generate`,
    request: z
      .object({ params: sessionParams, body: publicationScopeBodySchema })
      .strict(),
    response: publicationVersionSchema,
    source,
    timeoutMs: 420000,
  }),
  "legiwatch.publication.approve": defineOperation({
    service: "intelligence",
    method: "POST",
    path: `${base}/:id/approve`,
    request: z
      .object({
        params: versionParams,
        body: z
          .object({
            contentHash: z.string().min(1),
            attestSupported: z.literal(true),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      id: z.string(),
      status: z.literal("approved"),
      contentHash: z.string(),
    }),
    source,
  }),
  "legiwatch.publication.document": defineOperation({
    service: "intelligence",
    method: "GET",
    path: `${base}/:id/approved-document`,
    request: z
      .object({
        params: versionParams,
        query: z.object({ contentHash: z.string().min(1) }).strict(),
      })
      .strict(),
    response: z.object({
      schema: z.literal("legiwatch.approved-recap-document.v1"),
      tenantId: z.string(),
      sessionId: z.string(),
      clientId: z.string(),
      publicationId: z.string(),
      contentHash: z.string(),
      version: z.number(),
      title: z.string(),
      approvedAt: z.string(),
      markdown: z.string(),
    }),
    source,
  }),
  "legiwatch.publication.preview": defineOperation({
    service: "intelligence",
    method: "POST",
    path: `${base}/:id/delivery-preview`,
    request: z
      .object({ params: versionParams, body: publicationAudienceSchema })
      .strict(),
    response: publicationCompositionSchema,
    source,
  }),
  "legiwatch.publication.deliver": defineOperation({
    service: "intelligence",
    method: "POST",
    path: `${base}/:id/deliveries`,
    request: z
      .object({ params: versionParams, body: publicationDeliveryBodySchema })
      .strict(),
    response: z.object({
      id: z.string(),
      state: z.enum(["queued", "already_queued"]),
      publicationId: z.string().optional(),
    }),
    source,
  }),
  "legiwatch.publication.deliveries": defineOperation({
    service: "intelligence",
    method: "GET",
    path: `${base}/:id/deliveries`,
    request: z.object({ params: versionParams }).strict(),
    response: publicationDeliveryHistorySchema,
    source,
  }),
  "legiwatch.sms.settings": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/clients/:clientId/hearing-sms",
    request: z.object({ params: clientParams }).strict(),
    response: hearingSmsSettingsSchema,
    source: sms,
  }),
  "legiwatch.sms.start": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/clients/:clientId/hearing-sms/verify/start",
    request: z
      .object({
        params: clientParams,
        body: z
          .object({
            phone: z.string().min(1).max(30),
            consentVersion: z.string().min(1).max(60),
            contactId: z.string().min(1).max(100),
          })
          .strict(),
      })
      .strict(),
    response: z.object({ dormant: z.boolean(), masked: z.string() }),
    source: sms,
  }),
  "legiwatch.sms.confirm": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/clients/:clientId/hearing-sms/verify/confirm",
    request: z
      .object({
        params: clientParams,
        body: z
          .object({
            phone: z.string().min(1).max(30),
            code: z.string().regex(/^\d{6}$/),
          })
          .strict(),
      })
      .strict(),
    response: z.object({ verified: z.literal(true), phone: z.string() }),
    source: sms,
  }),
  "legiwatch.sms.revoke": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/clients/:clientId/hearing-sms/:id/revoke",
    request: z
      .object({
        params: clientParams
          .extend({ id: z.string().min(1).max(200) })
          .strict(),
      })
      .strict(),
    response: z.object({ revoked: z.literal(true) }),
    source: sms,
  }),
} as const;
