import { z } from "zod";

const short = z.string().trim().min(1).max(180);
const text = z.string().trim().min(1).max(4000);
const date = z.iso.datetime({ offset: true });
const sourceUrl = z.url().refine((value) => {
  const url = new URL(value);
  return (
    ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
  );
}, "A public HTTP source URL is required.");
export const evidenceSchema = z
  .object({
    url: sourceUrl.optional(),
    attachmentId: z.uuid().optional(),
    title: short,
    excerpt: text,
    observedAt: date,
    sourceType: z.enum(["official", "company", "document", "person"]),
  })
  .refine(
    (value) =>
      value.sourceType === "person" || Boolean(value.url || value.attachmentId),
    "A source URL, attachment or explicit person provenance is required.",
  );
export type PortfolioEvidence = z.infer<typeof evidenceSchema>;
export const capabilityPayloadSchema = z.object({
  name: short,
  type: z.enum(["product", "platform", "service", "program", "component"]),
  lifecycle: z.enum(["in_service", "in_development", "planned", "unspecified"]),
  description: text,
  tags: z.array(short).max(40).default([]),
  businessUnitId: z.uuid().optional(),
  classification: z.literal("capability").default("capability"),
});
export const alignmentPayloadSchema = z.object({
  targetType: z.enum(["keyword", "tag", "pe", "program", "naics", "psc"]),
  value: short,
  rationale: text,
  score: z.number().min(0).max(100).optional(),
});
export const officePayloadSchema = z.object({
  memberId: short,
  sourceDirectory: z.enum(["congress", "state"]),
  officeTerm: short,
  rationale: text,
  entryPoint: text,
  whyNot: text,
  suggestedOwnerUserId: z.uuid().optional(),
  fitRating: z.enum(["strong", "moderate", "limited"]).optional(),
  stance: z
    .enum(["unknown", "interested", "supportive", "champion", "declined"])
    .default("unknown"),
});
export const statementPayloadSchema = z.object({
  memberId: short,
  sourceDirectory: z.enum(["congress", "state"]),
  officeTerm: short,
  statementDate: date,
  summary: text,
  tags: z.array(short).max(40).default([]),
  pressItemId: z.uuid().optional(),
});
export const caseFields = [
  "impact",
  "priorities",
  "government_need",
  "readiness",
  "cost",
  "backing",
  "timing",
  "jobs",
  "payroll",
  "investment",
  "facility_size",
  "suppliers",
] as const;
export const casePayloadSchema = z
  .object({
    field: z.enum(caseFields),
    text,
    memberId: short.optional(),
    sourceDirectory: z.enum(["congress", "state"]).optional(),
    officeTerm: short.optional(),
    facilityId: z.uuid().optional(),
    value: z.number().nonnegative().optional(),
    unit: short.optional(),
    supersedesProposalId: z.uuid().optional(),
  })
  .refine(
    (value) =>
      !value.memberId || Boolean(value.sourceDirectory && value.officeTerm),
    "Member-specific fields require directory and term.",
  );
const maturity = z
  .object({ current: short, steps: z.array(short).min(1).max(12) })
  .refine(
    (value) => value.steps.includes(value.current),
    "Maturity must occur in its step chain.",
  );
export const sectorPayloadSchema = z.discriminatedUnion("sector", [
  z.object({
    sector: z.literal("defense"),
    pe: z.string().regex(/^\d{7}[A-Z]$/),
    maturity,
  }),
  z.object({
    sector: z.literal("health"),
    agency: short,
    account: short,
    program: short,
    maturity,
  }),
  z.object({
    sector: z.literal("agriculture"),
    agency: z.literal("USDA"),
    program: short,
    farmBillTitle: short,
    maturity,
  }),
]);
export const businessUnitPayloadSchema = z.object({
  name: short,
  annualReportYear: z.number().int().min(2000),
});
const input = {
  evidence: z.array(evidenceSchema).min(1).max(24),
  capabilityId: z.uuid().optional(),
};
export const proposalInputSchema = z.discriminatedUnion("kind", [
  z.object({
    ...input,
    kind: z.literal("capability"),
    payload: capabilityPayloadSchema,
  }),
  z.object({
    ...input,
    kind: z.literal("alignment"),
    payload: alignmentPayloadSchema,
    capabilityId: z.uuid(),
  }),
  z.object({
    ...input,
    kind: z.literal("office_recommendation"),
    payload: officePayloadSchema,
  }),
  z.object({
    ...input,
    kind: z.literal("statement"),
    payload: statementPayloadSchema,
  }),
  z.object({
    ...input,
    kind: z.literal("case_field"),
    payload: casePayloadSchema,
  }),
  z.object({
    ...input,
    kind: z.literal("sector_anchor"),
    payload: sectorPayloadSchema,
  }),
  z.object({
    ...input,
    kind: z.literal("business_unit"),
    payload: businessUnitPayloadSchema,
  }),
]);
export type PortfolioProposalInput = z.infer<typeof proposalInputSchema>;
const metadata = {
  id: z.uuid(),
  capabilityId: z.uuid().nullable(),
  version: z.number().int().positive(),
  status: z.enum([
    "proposed",
    "approved",
    "rejected",
    "merged",
    "split",
    "superseded",
  ]),
  evidence: z.array(evidenceSchema),
  reviewedAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
};
export const portfolioProposalSchema = z.discriminatedUnion("kind", [
  z.object({
    ...metadata,
    kind: z.literal("capability"),
    payload: capabilityPayloadSchema,
  }),
  z.object({
    ...metadata,
    kind: z.literal("alignment"),
    payload: alignmentPayloadSchema,
  }),
  z.object({
    ...metadata,
    kind: z.literal("office_recommendation"),
    payload: officePayloadSchema,
  }),
  z.object({
    ...metadata,
    kind: z.literal("statement"),
    payload: statementPayloadSchema,
  }),
  z.object({
    ...metadata,
    kind: z.literal("case_field"),
    payload: casePayloadSchema,
  }),
  z.object({
    ...metadata,
    kind: z.literal("sector_anchor"),
    payload: sectorPayloadSchema,
  }),
  z.object({
    ...metadata,
    kind: z.literal("business_unit"),
    payload: businessUnitPayloadSchema,
  }),
]);
export type PortfolioProposal = z.infer<typeof portfolioProposalSchema>;
export type CapabilityProposal = Extract<
  PortfolioProposal,
  { kind: "capability" }
>;
export type AlignmentProposal = Extract<
  PortfolioProposal,
  { kind: "alignment" }
>;
export type ReviewAction = "approve" | "reject" | "restore";
export function canBulkApprove(
  proposal: PortfolioProposal,
): proposal is AlignmentProposal {
  return (
    proposal.kind === "alignment" &&
    proposal.status === "proposed" &&
    ["tag", "keyword", "naics", "psc"].includes(proposal.payload.targetType) &&
    (proposal.payload.score ?? 0) > 85 &&
    proposal.evidence.length > 0
  );
}
export function hasOfficialEvidence(evidence: PortfolioEvidence[]) {
  return evidence.some(
    (source) =>
      source.sourceType === "official" &&
      source.url &&
      /(^|\.)gov$/i.test(new URL(source.url).hostname),
  );
}
