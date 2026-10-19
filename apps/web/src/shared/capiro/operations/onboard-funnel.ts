import { z } from "zod";
import { binaryDownloadSchema, defineOperation } from "../contracts";
import {
  funnelRegisterBodySchema,
  funnelSessionSchema,
  funnelStatusSchema,
  importModeSchema,
  legalAcceptBodySchema,
  legalDocSchema,
  onboardOkSchema,
  orgProfileSchema,
  planChoiceSchema,
  roleDesignationSchema,
  roleModeSchema,
  subscribeBodySchema,
  subscribeResultSchema,
  trialCompleteBodySchema,
} from "./onboard-funnel-schemas";

const source =
  "apps/onboard-api/src/funnel/funnel.controller.ts + funnel.service.ts @7b5a9644d30d22389b23f0e07f923c8925682047";
const purchaser = {
  service: "onboard",
  authentication: "clerk-session",
  source,
} as const;
const empty = z.object({}).strict();

export const onboardFunnelOperations = {
  "onboard.funnel.register": defineOperation({
    ...purchaser,
    method: "POST",
    path: "/funnel/register",
    request: z.object({ body: funnelRegisterBodySchema }).strict(),
    response: funnelSessionSchema,
  }),
  "onboard.funnel.session": defineOperation({
    ...purchaser,
    method: "GET",
    path: "/funnel/session",
    request: empty,
    response: funnelSessionSchema,
  }),
  "onboard.funnel.verify": defineOperation({
    ...purchaser,
    method: "POST",
    path: "/funnel/verify-check",
    request: empty,
    response: z.object({ verified: z.boolean() }),
  }),
  "onboard.funnel.plan": defineOperation({
    ...purchaser,
    method: "POST",
    path: "/funnel/plan",
    request: z
      .object({ body: z.object({ plan: planChoiceSchema }).strict() })
      .strict(),
    response: onboardOkSchema,
  }),
  "onboard.funnel.legal": defineOperation({
    ...purchaser,
    method: "GET",
    path: "/funnel/legal",
    request: empty,
    response: z.array(legalDocSchema),
  }),
  "onboard.funnel.legalAccept": defineOperation({
    ...purchaser,
    method: "POST",
    path: "/funnel/legal-accept",
    request: z.object({ body: legalAcceptBodySchema }).strict(),
    response: onboardOkSchema,
  }),
  // Two concrete downloads keep filename policy fixed; no untrusted disposition is used.
  "onboard.funnel.signedTos": defineOperation({
    ...purchaser,
    method: "GET",
    path: "/funnel/legal/signed/tos",
    request: empty,
    response: binaryDownloadSchema,
    responseMode: "binary",
    binary: {
      contentTypes: ["application/pdf"],
      maxBytes: 30_000_000,
      filename: "Capiro-Terms-of-Service-signed.pdf",
    },
  }),
  "onboard.funnel.signedSa": defineOperation({
    ...purchaser,
    method: "GET",
    path: "/funnel/legal/signed/sa",
    request: empty,
    response: binaryDownloadSchema,
    responseMode: "binary",
    binary: {
      contentTypes: ["application/pdf"],
      maxBytes: 30_000_000,
      filename: "Capiro-Subscription-Agreement-signed.pdf",
    },
  }),
  "onboard.funnel.setupIntent": defineOperation({
    ...purchaser,
    method: "POST",
    path: "/funnel/payment/setup-intent",
    request: z
      .object({ body: z.object({ method: z.enum(["card", "ach"]) }).strict() })
      .strict(),
    response: z.object({ clientSecret: z.string().nullable() }),
  }),
  "onboard.funnel.trialComplete": defineOperation({
    ...purchaser,
    method: "POST",
    path: "/funnel/payment/trial-complete",
    request: z.object({ body: trialCompleteBodySchema }).strict(),
    response: onboardOkSchema.extend({
      method: z.string(),
      setupIntentStatus: z.string().optional(),
    }),
  }),
  "onboard.funnel.subscribe": defineOperation({
    ...purchaser,
    method: "POST",
    path: "/funnel/payment/subscribe",
    request: z.object({ body: subscribeBodySchema }).strict(),
    response: subscribeResultSchema,
  }),
  "onboard.funnel.paidStatus": defineOperation({
    ...purchaser,
    method: "POST",
    path: "/funnel/payment/paid-status",
    request: empty,
    response: z.object({ status: z.string(), advanced: z.boolean() }),
  }),
  "onboard.funnel.roles": defineOperation({
    ...purchaser,
    method: "POST",
    path: "/funnel/roles",
    request: z
      .object({
        body: z
          .object({
            roleMode: roleModeSchema,
            designations: z.array(roleDesignationSchema).optional(),
          })
          .strict(),
      })
      .strict(),
    response: onboardOkSchema,
  }),
  "onboard.funnel.importPref": defineOperation({
    ...purchaser,
    method: "POST",
    path: "/funnel/import-pref",
    request: z
      .object({ body: z.object({ importMode: importModeSchema }).strict() })
      .strict(),
    response: onboardOkSchema,
  }),
  "onboard.funnel.org": defineOperation({
    ...purchaser,
    method: "POST",
    path: "/funnel/org",
    request: z
      .object({
        body: z
          .object({
            orgProfile: orgProfileSchema,
            itAdminEmail: z.email().optional(),
          })
          .strict(),
      })
      .strict(),
    response: onboardOkSchema,
  }),
  "onboard.funnel.provision": defineOperation({
    ...purchaser,
    method: "POST",
    path: "/funnel/provision",
    request: empty,
    response: funnelStatusSchema.extend({
      failureReason: z.string().nullable().optional(),
    }),
  }),
  "onboard.funnel.status": defineOperation({
    ...purchaser,
    method: "GET",
    path: "/funnel/status",
    request: empty,
    response: funnelStatusSchema,
  }),
} as const;
