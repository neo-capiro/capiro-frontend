import { z } from "zod";
import type { AcceptedCodeEvidence } from "./registration-suggestions";
import { profileSubjectSchema } from "./subject";

export const evidenceSchema = z.object({
  label: z.string(),
  url: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  excerpt: z.string().nullable().optional(),
  observedAt: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.json()).optional(),
});
export const profileFactSchema = z.object({
  id: z.uuid(),
  fieldKey: z.string(),
  findingId: z.uuid().nullable().optional(),
  runId: z.uuid().nullable().optional(),
  autoAccepted: z.boolean().optional(),
  value: z.json(),
  origin: z.enum(["person", "research", "official", "legacy"]),
  sourceType: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  sourceUnavailable: z.boolean().optional(),
  attachmentId: z.string().nullable(),
  evidence: z.array(evidenceSchema),
  observedAt: z.string().nullable(),
  confidence: z.number().nullable(),
  status: z.enum(["pending", "approved", "rejected", "superseded"]),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  version: z.number().int(),
  isCurrent: z.boolean(),
});
export type ProfileFact = z.infer<typeof profileFactSchema>;
export const profileConflictSchema = z.object({
  id: z.uuid(),
  fieldKey: z.string(),
  currentFactId: z.uuid(),
  proposedFactId: z.uuid(),
  status: z.enum(["pending", "resolved"]),
  version: z.number().int(),
  resolution: z.enum(["keep_current", "accept_proposed"]).nullable(),
});
export type ProfileConflict = z.infer<typeof profileConflictSchema>;
const section = z.object({
  key: z.string(),
  status: z.enum(["complete", "partial", "missing"]),
  researched: z.boolean(),
  reviewCount: z.number().int().nonnegative(),
});
export const profileSnapshotSchema = z.object({
  subject: profileSubjectSchema,
  version: z.string(),
  fields: z.record(z.string(), z.json()),
  facts: z.array(profileFactSchema),
  conflicts: z.array(profileConflictSchema),
  referenceCoverage: z
    .record(
      z.string(),
      z.object({ status: z.string(), statusText: z.string() }),
    )
    .optional(),
  completeness: z.object({
    completed: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    missing: z.array(z.string()),
    sections: z.array(section),
  }),
  sections: z.object({
    company: z.array(z.json()).default([]),
    registration: z.array(z.json()).default([]),
    lobbying: z.array(z.json()).default([]),
    federal_footprint: z.array(z.json()).default([]),
    news: z.array(z.json()).default([]),
    locations: z.array(z.json()).default([]),
    leadership: z.array(z.json()),
    capabilities: z.array(z.json()).default([]),
    advocacy: z.json().default(null),
    notes: z.json(),
    documents: z.array(z.json()),
  }),
});
export type ProfileSnapshot = z.infer<typeof profileSnapshotSchema>;
export type PersonProfileInput = {
  fieldEvidence?: AcceptedCodeEvidence;
  fields?: Record<string, z.infer<ReturnType<typeof z.json>>>;
  locations?: Record<string, unknown>[];
  leadership?: Record<string, unknown>[];
  capabilities?: Record<string, unknown>[];
  advocacy?: Record<string, unknown>;
  notes?: string;
};
