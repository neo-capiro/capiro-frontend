import { z } from "zod";

const nullable = (max: number) => z.string().max(max).nullable();
export const templateId = z.uuid();
export const templateScope = z.enum(["private", "firm", "client"]);
export const defaultPolicyFields = [
  "goal",
  "objective",
  "topic",
  "desiredOutcome",
  "ask",
  "whyNow",
  "sponsorScope",
  "audience",
  "delivery",
  "personalization",
  "contextPolicy",
  "campaignAngle",
  "tone",
  "length",
  "subjectStyle",
  "ctaStyle",
  "senderPolicy",
  "signaturePolicy",
  "schedulingPolicy",
  "attachmentPolicy",
  "followUpPolicy",
] as const;
export const resolutionModes = [
  "fixed",
  "suggested",
  "ask_each_campaign",
  "meri_determines_user_confirms",
  "required_unresolved",
  "not_applicable",
] as const;
export const variableFields = [
  "goal",
  "objective",
  "topic",
  "desiredOutcome",
  "ask",
  "whyNow",
  "campaignAngle",
] as const;
export const templateVariable = z
  .object({
    key: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
    label: z.string().max(120),
    question: nullable(500),
    type: z.enum(["text", "number", "date", "url", "email", "choice"]),
    choices: z.array(z.string().max(120)).max(20).nullable(),
    required: z.boolean(),
    defaultValue: nullable(500),
    resolutionPolicy: z.enum([
      "meri_can_determine",
      "user_must_confirm",
      "always_ask",
    ]),
    scope: z.enum(["public", "client_confidential"]),
    appliesTo: z.array(z.enum(variableFields)).max(7),
  })
  .strict();
export const templateGuardrails = z
  .object({
    editAuthority: z.enum(["owner_only", "managers", "firm_admins"]),
    publishAuthority: z.enum([
      "owner_only",
      "tenant_admin",
      "independent_reviewer",
    ]),
    sendAuthority: z.enum([
      "owner_only",
      "any_authorized_sender",
      "tenant_admin",
    ]),
    approvalMode: z.enum(["individual", "bulk_allowed"]),
    partialSendAllowed: z.boolean(),
    requiredContextClasses: z.array(z.string().max(80)).max(20),
    requiredPreflightChecks: z.array(z.string().max(80)).max(20),
    senderRequirement: z.enum([
      "any_authorized",
      "specific_role_required",
      "not_applicable",
    ]),
    attachmentRequirement: z.enum(["none", "optional", "required"]),
    followUpRequired: z.boolean(),
    variablesAutoResolveAllowed: z.boolean(),
    allowSkipValidPlanDecision: z.boolean(),
  })
  .strict();
export const templateGuidance = z
  .object({
    audienceRule: nullable(2000),
    contextPolicy: nullable(2000),
    subjectStyle: nullable(500),
    ctaStyle: nullable(500),
    senderPolicy: nullable(1000),
    signaturePolicy: nullable(1000),
    schedulingPolicy: nullable(1000),
    attachmentPolicy: nullable(1000),
    followUpPolicy: nullable(1000),
  })
  .strict();
const targetCriteria = z
  .object({
    notes: nullable(4000),
    governmentLevels: z
      .array(z.enum(["federal", "state", "local", "agency", "mixed"]))
      .max(20),
    chambers: z
      .array(z.enum(["house", "senate", "state_house", "state_senate"]))
      .max(20),
    committees: z.array(z.string()).max(100),
    agencies: z.array(z.string()).max(100),
    states: z.array(z.string()).max(100),
    relationshipPreference: z.enum(["any", "existing", "new", "mixed"]),
    includeStaff: z.boolean(),
    includePrincipals: z.boolean(),
  })
  .strict();
export const templateSpec = z
  .object({
    schemaVersion: z.literal("outreach_v3_template_v1"),
    goal: z
      .object({
        goal: nullable(2000),
        objective: nullable(4000),
        topic: nullable(500),
        desiredOutcome: nullable(2000),
        ask: z
          .object({
            mode: z.enum(["undecided", "explicit", "none"]),
            text: nullable(2000),
          })
          .strict(),
        whyNow: nullable(2000),
      })
      .strict(),
    sponsor: z
      .object({
        kind: z.enum([
          "undecided",
          "firm",
          "client",
          "coalition",
          "internal_team",
          "none",
        ]),
        label: nullable(240),
      })
      .strict(),
    targeting: z.object({ criteria: targetCriteria.nullable() }).strict(),
    delivery: z
      .object({
        pattern: z.enum([
          "undecided",
          "personalized_separate",
          "uniform_separate",
          "shared_thread",
        ]),
        personalization: z.enum(["undecided", "high", "light", "none"]),
      })
      .strict(),
    strategy: z
      .object({
        campaignAngle: nullable(4000),
        tone: nullable(120),
        length: z.enum(["undecided", "short", "medium", "long", "custom"]),
        customLengthInstruction: nullable(1000),
      })
      .strict(),
    styleSamples: z
      .array(
        z
          .object({
            label: nullable(160),
            subject: nullable(500),
            body: z.string().min(1).max(20000),
          })
          .strict(),
      )
      .max(5),
    contentSkeleton: z
      .object({
        subject: z.string().max(400),
        body: z.string().min(1).max(8000),
        slots: z
          .array(
            z
              .object({
                key: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
                label: z.string().min(1).max(120),
                instruction: z.string().min(1).max(1000),
                required: z.boolean(),
              })
              .strict(),
          )
          .max(12),
      })
      .strict()
      .nullable()
      .optional(),
    variables: z.array(templateVariable).max(20),
    defaultsPolicy: z.record(
      z.enum(defaultPolicyFields),
      z.enum(resolutionModes),
    ),
    guidance: templateGuidance,
    guardrails: templateGuardrails,
  })
  .strict();
export const templateCapabilities = z.object({
  canUse: z.boolean(),
  canDuplicate: z.boolean(),
  canInspect: z.boolean(),
  canEdit: z.boolean(),
  canCreateVersion: z.boolean(),
  canPublish: z.boolean(),
  canArchive: z.boolean(),
  canRestore: z.boolean(),
});
export const templateBase = z.object({
  id: templateId,
  ownerUserId: z.string(),
  clientId: templateId.nullable(),
  scope: templateScope,
  name: z.string(),
  description: z.string().nullable(),
  campaignType: z.string().nullable(),
  status: z.enum(["active", "archived"]),
  currentDraftVersionId: templateId.nullable(),
  publishedVersionId: templateId.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().nullable(),
});
export const templateSummary = templateBase.extend({
  draftVersionNumber: z.number().nullable(),
  publishedVersionNumber: z.number().nullable(),
  usageCount: z.number().int(),
  lastUsedAt: z.string().nullable(),
  capabilities: templateCapabilities,
  previewSummary: z
    .object({
      topic: z.string().nullable(),
      tone: z.string().nullable(),
      length: templateSpec.shape.strategy.shape.length,
      variableCount: z.number(),
      requiredVariableCount: z.number(),
    })
    .nullable(),
});
export const templateVersion = z.object({
  id: templateId,
  templateId,
  versionNumber: z.number().int(),
  lifecycle: z.enum(["draft", "published", "superseded"]),
  contentHash: z.string(),
  sourceSessionId: templateId.nullable(),
  createdByUserId: z.string(),
  createdAt: z.string(),
  publishedAt: z.string().nullable(),
  spec: templateSpec,
});
export const templateDetail = z.object({
  template: templateBase,
  versions: z.array(templateVersion),
  capabilities: templateCapabilities,
});
export const templateCreationReceipt = z.object({
  template: templateBase,
  version: templateVersion,
  published: z.literal(false),
});
const receiptItem = z.object({
  field: z.string(),
  label: z.string(),
  detail: z.string().nullable(),
});
export const templateApplicationReceipt = z.object({
  templateId,
  templateName: z.string(),
  templateVersionId: templateId,
  templateVersionNumber: z.number(),
  templateContentHash: z.string(),
  inherited: z.array(receiptItem),
  refreshed: z.array(receiptItem),
  unresolved: z.array(receiptItem),
  unavailable: z.array(receiptItem),
  nextRequiredStep: z.string().nullable(),
  requiresLiveTargets: z.boolean(),
  requiresLiveContext: z.boolean(),
});
export const templateUseReceipt = z.object({
  sessionId: templateId,
  stateVersion: z.number(),
  templateId,
  templateVersionId: templateId,
  replayed: z.boolean(),
  receipt: templateApplicationReceipt,
});
export type OutreachTemplate = z.infer<typeof templateSummary>;
export type OutreachTemplateDetail = z.infer<typeof templateDetail>;
export type OutreachTemplateSpec = z.infer<typeof templateSpec>;
export type OutreachTemplateUseReceipt = z.infer<typeof templateUseReceipt>;
