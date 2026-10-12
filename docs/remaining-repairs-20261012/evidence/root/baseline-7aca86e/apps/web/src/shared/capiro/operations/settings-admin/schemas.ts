import { z } from "zod";

export const empty = z.object({}).strict();
export const id = z.string().min(1).max(256);
export const tenantParams = z.object({ tenantId: z.uuid() }).strict();
export const recordParams = z.object({ id }).strict();
export const range = z
  .object({
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
  })
  .strict();
export const pageQuery = z
  .object({
    status: z.string().max(100).optional(),
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict();
export const nullable = z.string().nullable();
export const json = z.json();
export const tenantSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  status: z.string(),
  clerkOrgId: nullable.optional(),
  logoS3Key: nullable.optional(),
  createdAt: z.string(),
});
export const tenantListSchema = tenantSchema.extend({
  _count: z.object({ memberships: z.number(), clients: z.number() }),
});
export const adminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: nullable,
  lastName: nullable,
});
export const tenantDetailSchema = tenantSchema.extend({
  memberships: z
    .array(
      z.object({
        id: z.string(),
        role: z.string(),
        status: z.string(),
        user: adminUserSchema,
      }),
    )
    .optional(),
});
export const customerSchema = z.object({
  tenantId: z.string(),
  slug: z.string(),
  name: z.string(),
  status: z.string(),
  slots: z.number(),
  usedSlots: z.number(),
  pricePerSlotUsd: z.number(),
  mrrUsd: z.number(),
  llmUsedUsd: z.number(),
  llmOverageUsd: z.number(),
  currentPeriodEnd: nullable,
  createdAt: z.string(),
});
export const tenantUsageSchema = z.object({
  tenantId: z.string(),
  tenantName: z.string(),
  totalCostUsd: z.number(),
  totalTokens: z.number(),
  eventCount: z.number(),
  tenantKeyEventCount: z.number(),
});
export const invitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  status: z.string(),
  createdAt: z.string(),
  expiresAt: nullable,
});
export const broadcastSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  title: z.string(),
  body: z.string(),
  audience: z.enum(["all_users", "selected_users"]),
  createdAt: z.string(),
  archivedAt: nullable,
  createdBy: adminUserSchema,
  recipientCount: z.number(),
  acknowledgedCount: z.number(),
});
export const broadcastDetailSchema = broadcastSchema.extend({
  recipients: z.array(
    z.object({
      userId: z.string(),
      email: z.string(),
      firstName: nullable,
      lastName: nullable,
      acknowledgedAt: nullable,
    }),
  ),
});
export const broadcastMemberSchema = z.object({
  userId: z.string(),
  email: z.string(),
  firstName: nullable,
  lastName: nullable,
  role: z.string(),
  status: z.string(),
});
export const clientSchema = z.object({
  id: z.string(),
  name: z.string(),
  profileStatus: z.string(),
  status: z.string(),
  website: nullable.optional(),
  profileType: nullable.optional(),
  sectorTag: nullable.optional(),
  createdAt: z.string().optional(),
});
export const paginated = <T extends z.ZodType>(row: T) =>
  z.object({
    data: z.array(row),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  });
export const programSchema = z.object({
  id: z.string(),
  canonicalName: z.string(),
  component: nullable,
  mdapCode: nullable,
  status: z.string(),
});
export const aliasType = z.enum([
  "canonical",
  "acronym",
  "pe_title",
  "project_title",
  "p1_line_name",
  "mdap_name",
  "office_usage",
  "congressional",
  "sam_usage",
  "award_usage",
]);
export const aliasSchema = z.object({
  id: z.string(),
  programId: z.string(),
  alias: z.string(),
  aliasNormalized: z.string(),
  aliasType: z.string(),
  source: nullable,
  sourceUrl: nullable,
  confidence: z.number(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export const personSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  organization: nullable,
  title: nullable,
  role: nullable,
  service: nullable,
  status: z.string(),
  confidence: z.number(),
  sources: z
    .array(
      z.object({
        source: z.string(),
        sourceUrl: nullable,
        observedAt: z.string(),
      }),
    )
    .optional(),
});
export const mergeSchema = z.object({
  id: z.string(),
  primaryPersonId: z.string(),
  secondaryPersonId: z.string(),
  similarityScore: z.number(),
  status: z.string(),
  createdAt: z.string(),
  primaryPerson: personSchema.nullable(),
  secondaryPerson: personSchema.nullable(),
});
export const peSchema = z.object({
  peCode: z.string(),
  title: nullable,
  service: nullable,
});
export const matchSchema = z.object({
  id: z.string(),
  peCode: z.string(),
  projectCode: nullable,
  programId: z.string(),
  score: z.number(),
  confidenceBand: z.string(),
  evidenceTier: z.string(),
  status: z.string(),
  matchBasis: z.string(),
  whyShown: z.string(),
  evidence: json,
  programElement: peSchema.nullable(),
  program: programSchema
    .pick({ id: true, canonicalName: true, component: true, mdapCode: true })
    .nullable(),
  createdAt: z.string(),
});
export const candidateSchema = z.object({
  id: z.string(),
  peCode: z.string(),
  personId: z.string(),
  status: z.string(),
  score: z.number(),
  matchBasis: z.string(),
  createdAt: z.string().optional(),
  person: z
    .object({
      id: z.string(),
      fullName: z.string(),
      organization: nullable,
      title: nullable,
      pePrimary: nullable.optional(),
      role: nullable.optional(),
    })
    .nullable(),
  programElement: peSchema.nullable(),
});
export const auditSchema = z.object({
  id: z.string(),
  actorUserId: z.string(),
  actorRole: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: nullable,
  before: json,
  after: json,
  occurredAt: z.string(),
});
export const quarantineSchema = z.object({
  id: z.string(),
  rawRecord: json,
  reason: nullable,
  source: z.string(),
  quarantinedAt: z.string(),
});
export const queueAge = z.object({
  openCount: z.number(),
  oldestOpenAt: nullable,
});
export const reviewCountsSchema = z.object({
  reconciliation: queueAge,
  programMatch: queueAge.extend({ quarantinedCount: z.number() }),
  personCandidate: queueAge,
  personnelMerge: queueAge,
  provisionPeLink: z.object({
    candidateCount: z.number(),
    oldestOpenAt: nullable,
  }),
  programQuarantine: z.object({ count: z.number() }),
  personnelQuarantine: z.object({ count: z.number() }),
});
