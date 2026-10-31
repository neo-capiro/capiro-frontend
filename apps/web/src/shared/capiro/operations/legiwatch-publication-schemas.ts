import { z } from "zod";
import {
  recipientSchema,
  recipientSelectionSchema,
} from "./legiwatch-delivery-schemas";
export const publicationKindSchema = z.enum(["live_update", "hearing_recap"]);
export const publicationEvidenceSchema = z.object({
  segmentId: z.string(),
  hash: z.string(),
  startMs: z.number(),
  endMs: z.number(),
  text: z.string(),
  speakerLabel: z.string().nullable(),
});
export type PublicationEvidence = z.infer<typeof publicationEvidenceSchema>;
export const publicationClaimSchema = z
  .object({
    id: z.string().min(1).max(100),
    kind: z.enum(["quote", "observation", "analysis"]),
    text: z.string().trim().min(1).max(2500),
    evidenceIds: z.array(z.string().min(1).max(200)).min(1).max(20),
  })
  .strict();
export type PublicationClaim = z.infer<typeof publicationClaimSchema>;
export const publicationPayloadSchema = z.object({
  schema: z.literal("legiwatch.hearing-publication.v1"),
  kind: publicationKindSchema,
  title: z.string(),
  label: z.string(),
  sessionId: z.string(),
  hearingId: z.string().nullable(),
  clientId: z.string().nullable(),
  jurisdiction: z.string().nullable(),
  legislativeSession: z.string().nullable(),
  folders: z.array(
    z.object({
      id: z.string(),
      version: z.number(),
      clientId: z.string().nullable(),
      assignments: z
        .array(z.object({ id: z.string(), version: z.number() }))
        .optional(),
    }),
  ),
  bills: z.array(
    z.object({
      id: z.string(),
      number: z.string(),
      jurisdiction: z.string(),
      sessionKey: z.string(),
    }),
  ),
  claims: z.array(publicationClaimSchema),
  evidence: z.array(publicationEvidenceSchema),
  coverage: z.object({
    transcript: z.string(),
    audio: z.string(),
    recordingId: z.string().nullable(),
    captureId: z.string().optional(),
    missing: z.array(z.string()),
  }),
  provenance: z.object({
    tool: z.string(),
    promptVersion: z.string(),
    model: z.string().nullable(),
    clientContext: z.enum(["applied", "unavailable", "none"]).optional(),
    folderContextHash: z.string().optional(),
  }),
});
export const publicationVersionSchema = z.object({
  id: z.string(),
  kind: publicationKindSchema.optional(),
  version: z.number(),
  status: z.string(),
  contentHash: z.string(),
  payload: publicationPayloadSchema,
});
export type PublicationVersion = z.infer<typeof publicationVersionSchema>;
export const publicationScopeBodySchema = z
  .object({
    kind: publicationKindSchema,
    clientId: z.string().min(1).max(100).optional(),
    folderIds: z.array(z.string().min(1).max(200)).max(20).optional(),
    evidenceIds: z.array(z.string().min(1).max(200)).min(1).max(500),
    supersedesId: z.string().min(1).max(200).optional(),
  })
  .strict();
export const publicationCreateBodySchema = publicationScopeBodySchema
  .extend({
    title: z.string().trim().min(1).max(200),
    claims: z.array(publicationClaimSchema).min(1).max(100),
  })
  .strict();
const email = z
    .object({
      channel: z.literal("email"),
      selection: z.array(recipientSelectionSchema).min(1).max(500),
    })
    .strict(),
  inbox = z.object({ channel: z.literal("in_app") }).strict(),
  sms = z
    .object({
      channel: z.literal("sms"),
      consentIds: z.array(z.string().min(1).max(200)).min(1).max(25),
    })
    .strict();
export const publicationAudienceSchema = z.discriminatedUnion("channel", [
  email,
  inbox,
  sms,
]);
export const publicationDeliveryBodySchema = z.discriminatedUnion("channel", [
  email.extend({ approvalHash: z.string().min(1) }).strict(),
  inbox.extend({ approvalHash: z.string().min(1) }).strict(),
  sms.extend({ approvalHash: z.string().min(1) }).strict(),
]);
export type PublicationAudience = z.infer<typeof publicationAudienceSchema>;
export const publicationCompositionSchema = z.object({
  approvalHash: z.string(),
  composition: z.object({
    publicationId: z.string(),
    contentHash: z.string(),
    subject: z.string(),
    plainText: z.string(),
    html: z.string(),
    recipients: z.array(
      recipientSchema.extend({
        phone: z.string().optional(),
        consentId: z.string().optional(),
        verificationId: z.string().optional(),
        userId: z.string().optional(),
      }),
    ),
    channel: z.enum(["email", "sms", "in_app"]),
    smsText: z.string().nullable(),
    smsSize: z
      .object({ encoding: z.string(), units: z.number(), segments: z.number() })
      .nullable(),
  }),
});
export const publicationDeliveryHistorySchema = z.array(
  z.object({
    id: z.string(),
    approvedAt: z.string(),
    contentHash: z.string(),
    recipients: z.array(
      z.object({
        id: z.string(),
        channel: z.string(),
        state: z.string(),
        name: z.string(),
        destination: z.string(),
        providerId: z.string().nullable(),
        acceptedAt: z.string().nullable(),
        error: z.string().nullable(),
      }),
    ),
  }),
);
export const hearingSmsSettingsSchema = z.object({
  consents: z.array(
    z.object({
      id: z.string(),
      clientId: z.string(),
      phone: z.string(),
      purpose: z.string(),
      contactId: z.string().nullable(),
      verificationId: z.string(),
      consentVersion: z.string(),
      consentedAt: z.string(),
      revokedAt: z.string().nullable(),
    }),
  ),
  consentText: z.string(),
  consentVersion: z.string(),
  providerConfigured: z.boolean(),
  dispatchEnabled: z.boolean(),
});
