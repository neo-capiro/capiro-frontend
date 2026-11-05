import { z } from "zod";
import type { ApiClient } from "@/shared/portfolio/api/http";
export const sourceCandidateSchema = z.object({
  source: z.enum(["sam", "lda", "sec", "website", "document"]),
  externalId: z.string().min(1),
  name: z.string().min(1),
  website: z.string().optional(),
});
export const identityClaimSchema = z
  .object({
    kind: z.enum(["alias", "former_name", "parent", "subsidiary"]),
    name: z.string(),
    sourceUrl: z.string().url().optional(),
    attachmentId: z.uuid().optional(),
    quote: z.string(),
  })
  .refine(
    (claim) => Boolean(claim.sourceUrl) !== Boolean(claim.attachmentId),
    "A claim needs one original source",
  );
const identityEvidenceSchema = z.object({
  label: z.string(),
  url: z.string().optional(),
  attachmentId: z.uuid().optional(),
  excerpt: z.string(),
  observedAt: z.string(),
  source: z.string(),
});
const entity = z.object({
  id: z.uuid().nullable(),
  canonicalName: z.string(),
  normalizedName: z.string().optional(),
  entityType: z.string().optional(),
  resolutionConfidence: z.number().nullable().optional(),
});
export const identityCandidateSchema = z
  .object({
    entity,
    confidence: z.number().nullable().optional(),
    reasons: z.array(z.string()).optional(),
    resolutionMethod: z.string().optional(),
    sourceCandidate: sourceCandidateSchema.optional(),
    claims: z.array(identityClaimSchema).default([]),
    evidence: z.array(identityEvidenceSchema).default([]),
  })
  .refine(
    (candidate) => Boolean(candidate.entity.id || candidate.sourceCandidate),
    "A source-backed identity needs a current source selector",
  );
export const identityPreviewSchema = z.object({
  status: z.enum(["exact", "ambiguous", "none", "duplicate"]),
  entity: entity.nullable(),
  candidates: z.array(identityCandidateSchema),
  sourceCandidate: sourceCandidateSchema.optional(),
  claims: z.array(identityClaimSchema).optional(),
  evidence: z.array(identityEvidenceSchema).optional(),
  sourceGaps: z.array(z.string()).default([]),
  duplicate: z
    .object({
      kind: z.enum(["client", "prospect"]),
      id: z.uuid(),
      name: z.string(),
    })
    .nullable(),
});
export type IdentityPreview = z.infer<typeof identityPreviewSchema>;
export type SourceCandidate = z.infer<typeof sourceCandidateSchema>;
export type IdentityClaim = z.infer<typeof identityClaimSchema>;
export type IdentityCandidate = z.infer<typeof identityCandidateSchema>;
export type IdentitySelection =
  | { canonicalEntityId: string }
  | {
      sourceCandidate: SourceCandidate;
      canonicalEntityId?: string;
      claims: IdentityClaim[];
    }
  | null;
export const identitySelectionKey = (
  selection: IdentitySelection | undefined,
) =>
  selection === null
    ? "none"
    : !selection
      ? undefined
      : "sourceCandidate" in selection
        ? `source:${JSON.stringify([selection.sourceCandidate.source, selection.sourceCandidate.externalId, selection.sourceCandidate.name, selection.sourceCandidate.website ?? null])}`
        : `canonical:${selection.canonicalEntityId}`;
export const candidateSelection = (
  candidate: IdentityCandidate,
): Exclude<IdentitySelection, null> =>
  candidate.sourceCandidate
    ? {
        sourceCandidate: candidate.sourceCandidate,
        ...(candidate.entity.id
          ? { canonicalEntityId: candidate.entity.id }
          : {}),
        claims: [],
      }
    : { canonicalEntityId: candidate.entity.id! };
export function identityCandidates(
  preview: IdentityPreview,
): IdentityCandidate[] {
  const primary = preview.entity;
  if (!primary) return preview.candidates;
  const sourceKey = preview.sourceCandidate
    ? identitySelectionKey({
        sourceCandidate: preview.sourceCandidate,
        claims: [],
      })
    : undefined;
  const offered = sourceKey
    ? preview.candidates.find(
        (row) => identitySelectionKey(candidateSelection(row)) === sourceKey,
      )
    : primary.id
      ? preview.candidates.find((row) => row.entity.id === primary.id)
      : undefined;
  const first =
    offered ??
    (primary.id || preview.sourceCandidate
      ? {
          entity: primary,
          confidence: primary.resolutionConfidence,
          reasons: ["Legal identity match"],
          sourceCandidate: preview.sourceCandidate,
          claims: preview.claims ?? [],
          evidence: preview.evidence ?? [],
        }
      : undefined);
  if (!first) return preview.candidates;
  const key = identitySelectionKey(candidateSelection(first));
  return [
    first,
    ...preview.candidates.filter(
      (row) => identitySelectionKey(candidateSelection(row)) !== key,
    ),
  ];
}
export function identitySelectionName(
  preview: IdentityPreview,
  selected: IdentitySelection | undefined,
) {
  if (!selected) return undefined;
  if ("sourceCandidate" in selected) return selected.sourceCandidate.name;
  return identityCandidates(preview).find(
    (candidate) => candidate.entity.id === selected.canonicalEntityId,
  )?.entity.canonicalName;
}
export function previewProfileIdentity(
  api: ApiClient,
  input: {
    name?: string;
    attachmentId?: string;
    website?: string;
    state?: string;
    city?: string;
    identifiers?: { type: string; value: string }[];
  },
  signal?: AbortSignal,
) {
  return api.request(
    "core",
    "clients/profile-build/identity-preview",
    identityPreviewSchema,
    { method: "POST", body: input, signal },
  );
}

export const sourceIdentityCommandSchema = z.object({
  requestId: z.uuid(),
  sourceCandidate: sourceCandidateSchema,
  claims: z.array(identityClaimSchema).optional(),
});
export type SourceIdentityCommand = z.infer<typeof sourceIdentityCommandSchema>;
export function confirmSourceIdentity(
  api: ApiClient,
  command: SourceIdentityCommand,
  signal?: AbortSignal,
) {
  const body = sourceIdentityCommandSchema.parse(command);
  return api.request(
    "core",
    "clients/profile-build/identity-confirm",
    z
      .object({
        requestId: z.uuid(),
        canonicalEntityId: z.uuid(),
        sourceCandidate: sourceCandidateSchema,
      })
      .refine(
        (result) =>
          result.requestId === body.requestId &&
          JSON.stringify(result.sourceCandidate) ===
            JSON.stringify(body.sourceCandidate),
        "Identity confirmation receipt mismatch",
      ),
    { method: "POST", body, signal },
  );
}
