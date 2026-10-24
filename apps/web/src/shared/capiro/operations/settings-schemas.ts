import { z } from "zod";

// Contracts from capirov2 main 4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace.
// Responses project named public fields. Server-side authorization remains authoritative.
export const tenantRoleSchema = z.enum([
  "capiro_admin",
  "user_admin",
  "standard_user",
  "client_portal_user",
]);
export const editableTeamRoleSchema = z.enum(["user_admin", "standard_user"]);
export const membershipStatusSchema = z.enum(["invited", "active", "removed"]);
export const nullableText = z.string().nullable();
export const jsonScalarSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
export const flatPreferencesSchema = z.record(z.string(), jsonScalarSchema);
export const emptySettingsRequest = z.object({}).strict();
export const tenantIdentitySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
});

export const meSchema = z.object({
  user: z.object({
    id: z.string(),
    clerkUserId: z.string(),
    email: nullableText,
    firstName: nullableText,
    lastName: nullableText,
    title: nullableText,
    emailSignatureEnabled: z.boolean(),
    hasEmailSignature: z.boolean(),
    tourCompleted: z.boolean(),
    legiwatchIntroSeen: z.boolean(),
    legiwatchPrefs: flatPreferencesSchema.nullable().optional(),
  }),
  tenant: tenantIdentitySchema,
  role: tenantRoleSchema,
  billingAdmin: z.boolean(),
  entitlements: z.record(
    z.enum([
      "memoryGovernance",
      "peWatch",
      "defenseBudgetIntel",
      "complianceModule",
      "dataExport",
      "customConnectors",
    ]),
    z.boolean(),
  ),
  features: z.record(z.string(), z.boolean()),
});
export type CapiroMe = z.infer<typeof meSchema>;

export const updateMeBodySchema = z
  .object({
    title: z.string().max(120).optional(),
    tourCompleted: z.boolean().optional(),
    legiwatchIntroSeen: z.boolean().optional(),
    legiwatchPrefs: flatPreferencesSchema
      .refine(
        (value) => JSON.stringify(value).length <= 2048,
        "Preferences must fit within 2 KB.",
      )
      .optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide an editable field.",
  );
export const signatureSchema = z.object({
  html: nullableText,
  enabled: z.boolean(),
});
export const signatureBodySchema = z
  .object({
    html: z.string().max(18000000).optional(),
    htmlBase64: z.string().max(36000000).optional(),
    enabled: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide signature content or the enabled state.",
  );

export const contactInfoSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  mailingStreet1: z.string().optional(),
  mailingStreet2: z.string().optional(),
  mailingCity: z.string().optional(),
  mailingStateZip: z.string().optional(),
  permanentStreet1: z.string().optional(),
  permanentStreet2: z.string().optional(),
  permanentCity: z.string().optional(),
  permanentStateZip: z.string().optional(),
});
export const teamRowSchema = z.object({
  membershipId: z.string(),
  userId: z.string(),
  email: z.string(),
  firstName: nullableText,
  lastName: nullableText,
  role: tenantRoleSchema,
  status: membershipStatusSchema,
  billingAdmin: z.boolean(),
  joinedAt: nullableText,
  lastSeenAt: nullableText,
});
export const clientAccountOwnersSchema = z.record(
  z.string(),
  z.object({
    accountOwnerUserId: nullableText,
    accountOwner: z
      .object({
        id: z.string(),
        email: z.string(),
        firstName: nullableText,
        lastName: nullableText,
      })
      .nullable(),
  }),
);
export const invitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: editableTeamRoleSchema,
  createdAt: z.string(),
  expiresAt: nullableText,
  firstName: nullableText.optional(),
  lastName: nullableText.optional(),
});
export const inviteBodySchema = z
  .object({
    email: z.email(),
    role: editableTeamRoleSchema,
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    redirectUrl: z.url().optional(),
  })
  .strict();
export const provisionedMemberSchema = z.object({
  clerkUserId: z.string(),
  localUserId: z.string(),
  membershipId: z.string(),
  userCreated: z.boolean(),
  membershipCreated: z.boolean(),
  membershipRoleUpdated: z.boolean(),
});
export const brandingSyncSchema = z.enum([
  "confirmed",
  "failed",
  "unknown",
  "not_requested",
  "superseded",
  "not_linked",
]);
export const brandingSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  logoS3Key: nullableText,
  logoContentType: nullableText,
  logoUploadedAt: nullableText,
  logoUrl: nullableText.optional(),
});
export const logoContentTypeSchema = z.enum([
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
]);
export const presignedLogoSchema = z.object({
  url: z.url(),
  fields: z.record(z.string(), z.string()),
  s3Key: z.string(),
});
export const billingStatusSchema = z.enum([
  "none",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "comped",
]);
export const billingStateSchema = z.object({
  billingEnabled: z.boolean(),
  status: billingStatusSchema,
  slots: z.number(),
  usedSlots: z.number(),
  trialEndsAt: nullableText,
  onboardingFlowVersion: z.number().nullable(),
  locked: z.boolean(),
});
export const billingSummarySchema = z.object({
  billingEnabled: z.boolean(),
  status: billingStatusSchema,
  slots: z.number(),
  usedSlots: z.number(),
  pricePerSlotUsd: z.number(),
  llmAllowanceUsd: z.number(),
  llmUsedUsd: z.number(),
  llmOverageUsd: z.number(),
  llmWarn: z.boolean(),
  llmHardCapUsd: z.number().nullable(),
  currentPeriodEnd: nullableText,
  hasSubscription: z.boolean(),
});
const usageBucketSchema = z.object({
  costUsd: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  count: z.number(),
});
export const usageSummarySchema = z.object({
  from: z.string(),
  to: z.string(),
  eventCount: z.number(),
  totalCostUsd: z.number(),
  totalInputTokens: z.number(),
  totalOutputTokens: z.number(),
  tenantKeyEventCount: z.number(),
  byWorkflow: z.array(usageBucketSchema.extend({ workflow: z.string() })),
  byModel: z.array(usageBucketSchema.extend({ model: z.string() })),
  byDay: z.array(usageBucketSchema.extend({ day: z.string() })),
});
export const usageEventSchema = z.object({
  id: z.string(),
  workflow: z.string(),
  model: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  costUsd: z.union([z.number(), z.string().regex(/^-?\d+(?:\.\d+)?$/)]),
  usedTenantKey: z.boolean(),
  createdAt: z.string(),
});
export const maskedCredentialSchema = z.object({
  provider: z.string(),
  last4: z.string(),
  modelOverride: nullableText,
  status: z.string(),
  lastValidatedAt: nullableText,
  updatedAt: nullableText,
});
export const integrationProviderSchema = z.enum([
  "microsoft_365",
  "google_workspace",
  "imap_caldav",
]);
export const integrationSchema = z.object({
  id: z.string(),
  provider: integrationProviderSchema,
  accountEmail: nullableText,
  displayName: nullableText,
  status: z.enum(["needs_configuration", "connected", "error", "disabled"]),
  scopes: z.array(z.string()),
  lastSyncAt: nullableText,
  lastError: nullableText,
});
export const integrationCapabilitiesSchema = z.object({
  configured: z.boolean(),
  redirectUri: z.string(),
  scopes: z.array(z.string()),
});
export const oauthStartBodySchema = z
  .object({
    connectionId: z.uuid().optional(),
    accountEmail: z.email().optional(),
    displayName: z.string().min(1).max(120).optional(),
  })
  .strict();
export const oauthStartResponseSchema = z.object({
  authUrl: z.url(),
  connectionId: z.string(),
});
export const integrationSyncStatsSchema = z.object({
  scanned: z.number(),
  matched: z.number(),
  skipped: z.number(),
  removed: z.number(),
  failed: z.number(),
  pages: z.number(),
  hasMore: z.boolean(),
});
export const integrationSyncResponseSchema = z.object({
  connectionId: z.string(),
  calendar: integrationSyncStatsSchema.optional(),
  mail: z.record(z.string(), integrationSyncStatsSchema).optional(),
});
export const integrationSyncQuerySchema = z
  .object({
    reset: z.boolean().optional(),
    calendar: z.boolean().optional(),
    mail: z.boolean().optional(),
  })
  .strict();
export const connectionParamsSchema = z
  .object({ connectionId: z.uuid() })
  .strict();
export const userParamsSchema = z.object({ userId: z.uuid() }).strict();
