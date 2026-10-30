import { z } from "zod";

// OutreachCampaignService owns captured campaign state and its validation bounds.
const text = (max: number) => z.string().max(max);
export const outreachMember = z
  .object({
    id: z.string().min(1).max(384),
    name: text(240),
    email: text(320).optional(),
    source: text(80).optional(),
    sourceRefId: text(384).optional(),
    role: z.enum(["to", "cc", "bcc"]),
    title: text(240).optional(),
    office: text(240).optional(),
    state: text(80).optional(),
    district: text(80).optional(),
    chamber: text(80).optional(),
    personalNote: text(500).optional(),
    cc: z.array(text(320)).max(25).optional(),
    bcc: z.array(text(320)).max(25).optional(),
    locator: z.record(z.string(), z.json()).optional(),
  })
  .strict();
export const outreachRecipient = outreachMember
  .extend({
    kind: z.enum(["individual", "list", "group"]),
    members: z.array(outreachMember).max(500).optional(),
  })
  .strict();
export const outreachContextItem = z
  .object({
    id: z.string().min(1).max(384),
    kind: z.enum([
      "bill",
      "stateBill",
      "intel",
      "email",
      "meeting",
      "note",
      "document",
      "debrief",
      "prep",
      "programElement",
      "capability",
      "clientOverview",
    ]),
    scope: z.string().min(1).max(768),
    userInstruction: text(2000).optional(),
    customNoteText: text(8000).optional(),
    noteUse: z.enum(["fact", "instruction"]).optional(),
  })
  .strict();
export const outreachCampaignState = z
  .object({
    title: z.string().min(1).max(240),
    direction: z.enum(["on-behalf", "to-clients"]),
    clientId: z.uuid().nullable(),
    templateId: text(384).nullable(),
    templateVersionId: z.uuid().nullable().optional(),
    mainIdea: text(8000),
    decisions: z
      .object({
        goal: text(2000),
        objective: text(4000),
        topic: text(500),
        whyNow: text(2000),
        campaignAngle: text(4000),
      })
      .strict()
      .optional(),
    tone: z.enum(["professional", "friendly", "formal", "concise"]),
    length: z.enum(["short", "standard", "long"]),
    recipients: z.array(outreachRecipient).max(500),
    contextItems: z.array(outreachContextItem).max(500),
    styleSamples: z
      .array(
        z
          .object({
            sampleKey: text(128),
            label: text(240).nullable(),
            subject: text(400).nullable(),
            body: text(12000),
          })
          .strict(),
      )
      .max(10),
    attachmentIds: z.array(z.uuid()).max(30),
    // Historical typed locators remain intact; Core resolves them again before generation.
    contextSelections: z
      .array(z.record(z.string(), z.json()))
      .max(500)
      .optional(),
    contentSkeleton: z
      .object({
        subject: text(400),
        body: text(8000),
        slots: z
          .array(
            z
              .object({
                key: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
                label: text(120),
                instruction: text(1000),
                required: z.boolean(),
              })
              .strict(),
          )
          .max(12),
      })
      .strict()
      .nullable()
      .optional(),
    sender: z
      .object({ connectionId: z.uuid().nullable(), signature: text(20000) })
      .strict(),
    lastStep: z.number().int().min(1).max(7),
  })
  .strict();
const deliverySummary = z.object({
  id: z.uuid(),
  status: z.string(),
  totals: z.record(z.string(), z.number()),
  createdAt: z.string(),
  finishedAt: z.string().nullable(),
});
export const outreachCampaign = z.object({
  id: z.uuid(),
  revision: z.number().int().nonnegative(),
  updatedAt: z.string(),
  status: z.string(),
  state: outreachCampaignState,
  category: z.enum(["drafts", "sent", "attention"]).optional(),
  recordedSendStatus: z.string().nullable().optional(),
  recipientCount: z.number().int().nonnegative().optional(),
  sentAt: z.string().nullable().optional(),
  client: z.object({ id: z.uuid(), name: z.string() }).nullable().optional(),
  delivery: deliverySummary.nullable().optional(),
});
export type OutreachCampaignState = z.infer<typeof outreachCampaignState>;
export type OutreachCampaign = z.infer<typeof outreachCampaign>;
export const outreachCampaignSummary = outreachCampaign.extend({
  category: z.enum(["drafts", "sent", "attention"]),
  recordedSendStatus: z.string().nullable(),
  client: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  type: z.string(),
  hasWorkflow: z.boolean(),
  recipientCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  sentAt: z.string().nullable(),
  draftReadiness: z
    .object({ total: z.number().int(), ready: z.number().int() })
    .nullable(),
  delivery: deliverySummary.nullable(),
});
export const outreachCampaignPage = z.object({
  items: z.array(outreachCampaignSummary),
  nextCursor: z.string().nullable(),
});
export type OutreachCampaignSummary = z.infer<typeof outreachCampaignSummary>;
export type OutreachRecipient = z.infer<typeof outreachRecipient>;
export type OutreachMember = z.infer<typeof outreachMember>;
export type OutreachContextItem = z.infer<typeof outreachContextItem>;

export const outreachGenerationReceipt = z.object({
  jobId: z.uuid(),
  deduped: z.boolean(),
  items: z.array(
    z.object({ id: z.uuid(), generationKey: z.string(), status: z.string() }),
  ),
});
export const outreachJob = z.object({
  job: z.object({
    id: z.uuid(),
    status: z.string(),
    outreachRecordId: z.uuid().nullish(),
    params: z.record(z.string(), z.unknown()).nullish(),
  }),
  items: z.array(
    z.object({
      id: z.uuid(),
      recipientKey: z.string(),
      status: z.string(),
      result: z.unknown(),
      error: z.unknown(),
      attempt: z.number().int(),
    }),
  ),
});
export const outreachDraftVersion = z.object({
  id: z.uuid(),
  artifactId: z.uuid(),
  outreachRecordId: z.uuid(),
  version: z.number().int().positive(),
  sourceVersionId: z.uuid().nullable(),
  generationKey: z.string(),
  recipientKey: z.string(),
  audienceKind: z.string(),
  subject: z.string(),
  body: z.string(),
  contentHash: z.string(),
  generationStatus: z.enum([
    "generated",
    "manually_authored",
    "generation_failed",
  ]),
  auditStatus: z.enum([
    "not_required",
    "pending",
    "passed",
    "warning",
    "held",
    "unavailable",
  ]),
  approvalStatus: z.enum(["not_required", "pending", "approved", "rejected"]),
  auditDecision: z.string().nullable(),
  auditChecks: z.array(z.object({ code: z.string(), severity: z.string() })),
  reviewRequestId: z.uuid().nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  promptSpecVersion: z.string().nullable(),
  sendable: z.boolean(),
  createdAt: z.string(),
  contextNote: z.string().optional(),
});
export const outreachDraftArtifact = z.object({
  recipientSnapshot: z.record(z.string(), z.json()),
  id: z.uuid(),
  outreachRecordId: z.uuid(),
  generationKey: z.string(),
  recipientKey: z.string(),
  audienceKind: z.string(),
  currentVersion: z.number().int().nonnegative(),
  current: outreachDraftVersion.nullable(),
  history: z.array(
    z.object({
      id: z.uuid(),
      version: z.number().int(),
      generationStatus: z.string(),
      auditStatus: z.string(),
      approvalStatus: z.string(),
      createdAt: z.string(),
    }),
  ),
});
export const outreachSendIntent = z.object({
  id: z.uuid(),
  outreachRecordId: z.uuid(),
  status: z.string(),
  testMode: z.boolean(),
  requestKey: z.string(),
  totals: z.record(z.string(), z.number()),
  error: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  createdAt: z.string(),
  deliveries: z.array(
    z.object({
      id: z.uuid(),
      generationKey: z.string(),
      recipientKey: z.string(),
      status: z.string(),
      attempt: z.number().int(),
      provider: z.string(),
      correlationId: z.string(),
      to: z.array(z.object({ email: z.string(), name: z.string().nullish() })),
      cc: z.array(z.string()),
      bcc: z.array(z.string()),
      subject: z.string(),
      providerMessageId: z.string().nullable(),
      providerThreadId: z.string().nullable(),
      providerDraftId: z.string().nullable(),
      errorCode: z.string().nullable(),
      errorMessage: z.string().nullable(),
      acceptedAt: z.string().nullable(),
    }),
  ),
});
export type OutreachDraftArtifact = z.infer<typeof outreachDraftArtifact>;
export type OutreachDraftVersion = z.infer<typeof outreachDraftVersion>;
export type OutreachGenerationReceipt = z.infer<
  typeof outreachGenerationReceipt
>;
export type OutreachJob = z.infer<typeof outreachJob>;
export type OutreachSendIntent = z.infer<typeof outreachSendIntent>;
