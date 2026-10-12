import { z } from "zod";
import { defineOperation } from "../../contracts";
import { empty, id, nullable } from "./schemas";

const source =
  "apps/api/src/intelligence/intelligence.controller.ts + intelligence.service.ts + entity-resolution.service.ts@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const clientParams = z.object({ clientId: id }).strict();
const mappingParams = z.object({ mappingId: id }).strict();
const reviewStatus = z.enum([
  "candidate",
  "confirmed",
  "rejected",
  "superseded",
]);
export const mappingRelationshipSchema = z.enum([
  "self",
  "alias",
  "former_name",
  "parent",
  "subsidiary",
  "operating_unit",
]);
export const mappingSourceSchema = z.enum([
  "lda",
  "contracting",
  "sec",
  "fec_employer",
  "fec_committee",
  "fara",
  "lobby_intel",
  "assistance_recipient",
]);
const relationship = mappingRelationshipSchema;
export const mappingSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  clientName: z.string().optional(),
  source: z.string(),
  externalId: z.string(),
  externalName: z.string(),
  confidence: z.number(),
  confirmed: z.boolean(),
  matchBasis: nullable,
  matchTier: z.number().nullable(),
  relationshipType: nullable,
  rollUpAwards: z.boolean().nullable(),
  reviewStatus,
  rejectionReason: nullable,
  createdAt: z.string(),
  updatedAt: z.string(),
});
const summary = z.object({
  totalClients: z.number(),
  mappingsCreated: z.number(),
  autoConfirmed: z.number(),
  needsReview: z.number(),
});
const explanation = z.object({
  basis: z.string(),
  tier: z.number(),
  exactIdentifiers: z.record(z.string(), z.string()),
  normalizedClientName: z.string(),
  normalizedCandidateName: z.string(),
  corroborators: z.array(z.string()),
  conflicts: z.array(z.string()),
  awardCount: z.number().nullable(),
  totalObligated: z.number().nullable(),
  latestAwardDate: nullable,
  sourceSyncedAt: nullable,
});
const candidateMapping = z.object({
  id: z.string(),
  confirmed: z.boolean(),
  matchBasis: z.string(),
  matchTier: z.number().nullable(),
  relationshipType: nullable,
  rollUpAwards: z.boolean().nullable(),
  reviewStatus,
  rejectionReason: nullable,
});
const contractorCandidates = z.object({
  client: z.object({
    id: z.string(),
    name: z.string(),
    uei: nullable,
    cageCode: nullable,
  }),
  candidates: z.array(
    z.object({
      contractorId: z.string(),
      contractorName: z.string(),
      confidence: z.number(),
      autoConfirmEligible: z.boolean(),
      matchBasis: z.string(),
      matchTier: z.number(),
      explanation: explanation.nullable(),
      mapping: candidateMapping.nullable(),
    }),
  ),
});
const searchInput = z
  .object({ query: z.object({ q: z.string().min(1).max(1000) }).strict() })
  .strict();
export const mappingOperations = {
  "settings.mappings.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/intelligence/mappings",
    request: empty,
    response: z.array(mappingSchema),
    source,
  }),
  "settings.mappings.forClient": defineOperation({
    service: "core",
    method: "GET",
    path: "/intelligence/mappings/:clientId",
    request: z.object({ params: clientParams }).strict(),
    response: z.array(mappingSchema),
    source,
  }),
  "settings.mappings.resolveAll": defineOperation({
    service: "core",
    method: "POST",
    path: "/intelligence/resolve-all",
    request: empty,
    response: summary,
    timeoutMs: 170000,
    source,
  }),
  "settings.mappings.exactIdentifiers": defineOperation({
    service: "core",
    method: "POST",
    path: "/intelligence/mappings/match-contractor-identifiers",
    request: empty,
    response: summary,
    timeoutMs: 170000,
    source,
  }),
  "settings.mappings.contractorCandidates": defineOperation({
    service: "core",
    method: "GET",
    path: "/intelligence/mappings/:clientId/contractor-candidates",
    request: z.object({ params: clientParams }).strict(),
    response: contractorCandidates,
    source,
  }),
  "settings.mappings.resolveClient": defineOperation({
    service: "core",
    method: "POST",
    path: "/intelligence/mappings/:clientId/resolve",
    request: z.object({ params: clientParams }).strict(),
    response: z.array(mappingSchema),
    source,
  }),
  "settings.mappings.confirmIndividual": defineOperation({
    service: "core",
    method: "PATCH",
    path: "/intelligence/mappings/:mappingId",
    request: z
      .object({
        params: mappingParams,
        body: z
          .object({
            confirmed: z.boolean(),
            relationshipType: relationship.optional(),
            rollUpAwards: z.boolean().optional(),
            rejectionReason: z.string().max(1000).optional(),
          })
          .strict(),
      })
      .strict(),
    response: mappingSchema,
    source,
  }),
  "settings.mappings.manual": defineOperation({
    service: "core",
    method: "POST",
    path: "/intelligence/mappings/:clientId/manual",
    request: z
      .object({
        params: clientParams,
        body: z
          .object({
            source: mappingSourceSchema,
            externalId: z.string().min(1).max(1000),
            externalName: z.string().min(1).max(1000),
            relationshipType: relationship.optional(),
            rollUpAwards: z.boolean().optional(),
          })
          .strict(),
      })
      .strict(),
    response: mappingSchema,
    source,
  }),
  "settings.mappings.rejectContractorCandidate": defineOperation({
    service: "core",
    method: "POST",
    path: "/intelligence/mappings/:clientId/reject-candidate",
    request: z
      .object({
        params: clientParams,
        body: z
          .object({
            source: z.literal("contracting"),
            externalId: z.string().min(1).max(1000),
            externalName: z.string().min(1).max(1000),
            reason: z.string().max(1000).optional(),
          })
          .strict(),
      })
      .strict(),
    response: mappingSchema,
    source,
  }),
  "settings.mappings.searchLda": defineOperation({
    service: "core",
    method: "GET",
    path: "/intelligence/lda-clients/search",
    request: searchInput,
    response: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        state: nullable,
        totalFilings: z.number(),
        latestFilingYear: z.number().nullable(),
        totalSpending: z.number().nullable(),
        issueCodes: z.array(z.string()),
        similarity: z.number(),
      }),
    ),
    source,
  }),
  "settings.mappings.searchEmployers": defineOperation({
    service: "core",
    method: "GET",
    path: "/intelligence/fec-employers/search",
    request: searchInput,
    response: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        contributionCount: z.number(),
        totalAmount: z.number().nullable(),
        latestYear: z.number().nullable(),
        similarity: z.number(),
      }),
    ),
    source,
  }),
  "settings.mappings.searchCommittees": defineOperation({
    service: "core",
    method: "GET",
    path: "/intelligence/fec-committees/search",
    request: searchInput,
    response: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        committeeType: nullable,
        active: z.boolean().nullable(),
        cycle: z.number().nullable(),
        sourceSyncedAt: nullable,
      }),
    ),
    source,
  }),
  "settings.mappings.searchContractors": defineOperation({
    service: "core",
    method: "GET",
    path: "/intelligence/contractors/search",
    request: searchInput,
    response: z.object({
      results: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          uei: nullable,
          category: nullable,
          totalContracts: z.number().nullable(),
          rankByContracts: z.number().nullable(),
          sourceSyncedAt: nullable,
          similarity: z.number(),
          matchedOnIdentifier: z.boolean(),
        }),
      ),
      unsupportedIdentifier: nullable,
    }),
    source,
  }),
  "settings.mappings.searchRecipients": defineOperation({
    service: "core",
    method: "GET",
    path: "/intelligence/assistance-recipients/search",
    request: searchInput,
    response: z.array(
      z.object({
        id: z.string(),
        name: nullable,
        uei: nullable,
        state: nullable,
        awardCount: z.number(),
        totalObligated: z.number(),
        similarity: z.number(),
      }),
    ),
    source,
  }),
} as const;
