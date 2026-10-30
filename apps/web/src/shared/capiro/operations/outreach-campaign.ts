import { z } from "zod";
import { defineOperation } from "../contracts";
import * as s from "./outreach-campaign-schemas";

const source =
  "Core OutreachCampaignController/Service, OutreachDraftService, OutreachJobService and OutreachSendIntentService";
const params = z.object({ id: z.uuid() }).strict();
const generate = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
    requestKey: z.uuid(),
    generationKeys: z.array(z.string().min(1).max(768)).min(1).max(500),
    mode: z.enum(["generate", "regenerate", "improve"]),
    instruction: z.string().max(2000).optional(),
  })
  .strict();
export const outreachCampaignOperations = {
  "engagement.campaigns": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/outreach/campaigns",
    request: z
      .object({
        query: z.object({ clientId: z.uuid().optional() }).strict().optional(),
      })
      .strict(),
    response: z.array(s.outreachCampaign),
    source,
  }),
  "engagement.campaign.request": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/outreach/campaigns",
    request: z
      .object({ query: z.object({ requestKey: z.uuid() }).strict() })
      .strict(),
    response: z.array(s.outreachCampaign).max(1),
    source,
  }),
  "engagement.campaign": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/outreach/campaigns/:id",
    request: z.object({ params }).strict(),
    response: s.outreachCampaign,
    source,
  }),
  "engagement.campaign.create": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/outreach/campaigns",
    request: z
      .object({
        body: z
          .object({ requestKey: z.uuid(), state: s.outreachCampaignState })
          .strict(),
      })
      .strict(),
    response: s.outreachCampaign,
    requestLimitBytes: 1024 * 1024,
    source,
  }),
  "engagement.campaign.save": defineOperation({
    service: "core",
    method: "PUT",
    path: "/engagement/outreach/campaigns/:id",
    request: z
      .object({
        params,
        body: z
          .object({
            expectedRevision: z.number().int().nonnegative(),
            state: s.outreachCampaignState,
          })
          .strict(),
      })
      .strict(),
    response: s.outreachCampaign,
    requestLimitBytes: 1024 * 1024,
    source,
  }),
  "engagement.campaign.generate": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/outreach/campaigns/:id/generate",
    request: z.object({ params, body: generate }).strict(),
    response: s.outreachGenerationReceipt,
    source,
  }),
  "engagement.campaign.generationRequest": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/outreach/campaigns/:id/jobs",
    request: z
      .object({ params, query: z.object({ requestKey: z.uuid() }).strict() })
      .strict(),
    response: s.outreachGenerationReceipt.nullable(),
    source,
  }),
  "engagement.campaign.job": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/outreach/jobs/:id",
    request: z.object({ params }).strict(),
    response: s.outreachJob,
    source,
  }),
  "engagement.campaign.cancelGeneration": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/outreach/jobs/:id/cancel",
    request: z.object({ params }).strict(),
    response: z.unknown(),
    source,
  }),
  "engagement.campaign.drafts": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/outreach/:id/draft-artifacts",
    request: z.object({ params }).strict(),
    response: z.array(s.outreachDraftArtifact),
    source,
  }),
  "engagement.campaign.editDraft": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/outreach/draft-artifacts/:id/versions",
    request: z
      .object({
        params,
        body: z
          .object({
            baseVersionId: z.uuid(),
            subject: z.string().max(300),
            body: z.string().max(40000),
            editKind: z.enum(["manual", "improve", "revert"]),
          })
          .strict(),
      })
      .strict(),
    response: s.outreachDraftVersion,
    source,
  }),
  "engagement.campaign.draftVersion": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/outreach/draft-versions/:id",
    request: z.object({ params }).strict(),
    response: s.outreachDraftVersion,
    source,
  }),
  "engagement.campaign.send": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/outreach/send-intents",
    request: z
      .object({
        body: z
          .object({
            outreachRecordId: z.uuid(),
            requestKey: z.string().min(8).max(128),
            senderConnectionId: z.uuid(),
            draftVersionIds: z.array(z.uuidv4()).min(1).max(500),
            attachmentIds: z.array(z.uuidv4()).max(25).optional(),
            appendSignature: z.boolean().optional(),
            testMode: z.boolean().optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({ intentId: z.uuid(), deduped: z.boolean() }),
    source,
  }),
  "engagement.campaign.sendStatus": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/outreach/send-intents/:id",
    request: z.object({ params }).strict(),
    response: s.outreachSendIntent,
    source,
  }),
  "engagement.campaign.sendRequest": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/outreach/campaigns/:id/send-intents",
    request: z
      .object({ params, query: z.object({ requestKey: z.uuid() }).strict() })
      .strict(),
    response: s.outreachSendIntent.nullable(),
    source,
  }),
  "engagement.campaign.cancelSend": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/outreach/send-intents/:id/cancel",
    request: z.object({ params }).strict(),
    response: z.unknown(),
    source,
  }),
} as const;
