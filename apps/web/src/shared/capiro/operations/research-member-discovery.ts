import { z } from "zod";
import { defineOperation } from "../contracts";
import { availability, evidence } from "./defense-research-schemas";
import { researchMember, researchReceipt } from "./research-schemas";

const source =
  "capiro-backend@f7b3c4401 packages/shared/src/defense-research.ts; apps/api/src/defense-research/defense-research.controller.ts; apps/api/src/explorer/explorer.service.ts; apps/api/src/research-portfolios/research-portfolios.controller.ts";
const match = z.object({
  subject: z.object({
    type: z.enum([
      "program_element",
      "program",
      "project",
      "budget_line",
      "office",
      "acquisition",
      "context_document",
    ]),
    id: z.string(),
    label: z.string(),
  }),
  secondaryLabel: z.string().nullable(),
  matchKind: z.enum([
    "exact_id",
    "canonical_name",
    "alias",
    "acronym",
    "capability",
    "semantic",
  ]),
  score: z.number().nullable(),
  explanation: z.object({
    queryTerm: z.string(),
    matchedFields: z.array(z.string()),
    rationale: z.string(),
    negativeControls: z.array(z.string()),
  }),
  availability,
  evidence: z.array(evidence),
});
const lane = z.object({
  status: z.enum(["available", "disabled", "abstained"]),
  reason: z.string().nullable(),
  items: z.array(match),
});
export const memberSearch = z.object({
  query: z.string(),
  expansion: z.object({
    original: z.string(),
    normalized: z.string(),
    terms: z.array(z.string()),
    excludedTerms: z.array(z.string()),
    applied: z.boolean(),
  }),
  exact: lane,
  capability: lane,
  semantic: lane,
  limitations: z.array(z.string()),
});
export const memberAwards = z.object({
  rows: z.array(
    z.object({
      id: z.uuid(),
      piid: z.string().nullable(),
      contractorName: z.string().nullable(),
      awardingAgency: z.string().nullable(),
      description: z.string().nullable(),
    }),
  ),
  total: z.number().int().nonnegative(),
});
export const researchMemberDiscoveryOperations = {
  "research.members.search": defineOperation({
    service: "core",
    method: "GET",
    path: "/defense-budget/search",
    source,
    request: z
      .object({
        query: z
          .object({
            q: z.string().trim().min(2).max(200),
            semanticEnabled: z.literal(false),
          })
          .strict(),
      })
      .strict(),
    response: memberSearch,
  }),
  "research.members.awards": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/federal-awards",
    source,
    request: z
      .object({
        query: z
          .object({
            q: z.string().trim().min(2).max(200),
            page: z.number().int().min(1),
            pageSize: z.literal(20),
          })
          .strict(),
      })
      .strict(),
    response: memberAwards,
  }),
  "research.members.resolve": defineOperation({
    service: "core",
    method: "POST",
    path: "/research-portfolios/:id/members/:memberId/resolve",
    source,
    request: z
      .object({
        params: z.object({ id: z.uuid(), memberId: z.uuid() }).strict(),
        body: z
          .object({
            expectedRevision: z.number().int().min(0),
            idempotencyKey: z.string().min(1).max(200),
            targetKind: researchMember.shape.targetKind,
            targetId: z.string().min(1).max(300),
            label: z.string().max(500).nullable().optional(),
          })
          .strict(),
      })
      .strict(),
    response: researchReceipt,
  }),
};
export type MemberSearch = z.infer<typeof memberSearch>;
export type MemberAwards = z.infer<typeof memberAwards>;
