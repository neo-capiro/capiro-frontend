import { z } from "zod";
import { defineOperation } from "../contracts";

/**
 * Federal and state bills as Research Portfolio subjects.
 *
 * Discovery reads the canonical legislative catalogs owned by the backend
 * (`congress_bill`, `state_bill`). The client never constructs an identity from a
 * bare number: it adds exactly the `targetKind` + `targetId` the server returned, so
 * identically numbered bills in another Congress, state or session cannot collide.
 */
const source =
  "capiro-backend@ac4a3f2d apps/api/src/research-portfolios/research-portfolio-bills.service.ts; apps/api/src/research-portfolios/research-portfolios.controller.ts; packages/shared/src/research-portfolios.ts";

export const researchBillKind = z.enum(["federal_bill", "state_bill"]);

export const researchBillMatch = z.object({
  targetKind: researchBillKind,
  targetId: z.string().min(1),
  identifier: z.string(),
  title: z.string(),
  jurisdiction: z.string(),
  session: z.string().nullable(),
  status: z.string().nullable(),
  latestActionDate: z.string().nullable(),
  latestActionText: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  matchReason: z.enum(["exact_identifier", "title", "subject"]),
});

export const researchBillSearchResponse = z.object({
  items: z.array(researchBillMatch),
  nextCursor: z.string().nullable(),
  coverage: z.object({
    federal: z.enum(["searched", "empty", "unavailable"]),
    state: z.enum(["searched", "empty", "unavailable"]),
    statesWithData: z.array(z.string()),
    note: z.string(),
  }),
});

export const researchBillDetail = z.object({
  targetKind: researchBillKind,
  targetId: z.string().min(1),
  identifier: z.string(),
  title: z.string(),
  jurisdiction: z.string(),
  session: z.string().nullable(),
  status: z.string().nullable(),
  statusAt: z.string().nullable(),
  latestActionText: z.string().nullable(),
  latestActionDate: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  sourceRevision: z.string().nullable(),
  /** Freshness of the source read; a failed check means unknown, not "no change". */
  refreshedAt: z.string().nullable(),
  refreshStatus: z.string().nullable(),
  refreshFailed: z.boolean(),
  sponsors: z.array(
    z.object({
      name: z.string(),
      party: z.string().nullable(),
      state: z.string().nullable(),
      role: z.string(),
    }),
  ),
  committees: z.array(
    z.object({ name: z.string(), chamber: z.string().nullable(), role: z.string() }),
  ),
  textVersions: z.array(
    z.object({
      label: z.string(),
      date: z.string().nullable(),
      url: z.string().nullable(),
      revision: z.string().nullable(),
    }),
  ),
  votes: z.array(
    z.object({
      date: z.string().nullable(),
      chamber: z.string().nullable(),
      question: z.string(),
      result: z.string(),
    }),
  ),
  relatedBills: z.array(z.object({ identifier: z.string(), relation: z.string() })),
  unavailable: z.array(z.string()),
  coverage: z.object({
    source: z.string(),
    note: z.string(),
    available: z.boolean(),
  }),
});

export type ResearchBillKind = z.infer<typeof researchBillKind>;
export type ResearchBillMatch = z.infer<typeof researchBillMatch>;
export type ResearchBillDetail = z.infer<typeof researchBillDetail>;
export type ResearchBillSearchResponse = z.infer<typeof researchBillSearchResponse>;

export const researchBillOperations = {
  "research.bills.search": defineOperation({
    service: "core",
    method: "GET",
    path: "/research-portfolios/bill-search",
    source,
    request: z
      .object({
        query: z
          .object({
            q: z.string().trim().min(2).max(200).optional(),
            /** "US" for federal, a two-letter state code, or omitted for both. */
            jurisdiction: z.string().trim().max(8).optional(),
            session: z.string().trim().max(40).optional(),
            status: z.string().trim().max(80).optional(),
            topic: z.string().trim().max(120).optional(),
            cursor: z.string().max(200).optional(),
            limit: z.number().int().min(1).max(25).optional(),
          })
          .strict(),
      })
      .strict(),
    response: researchBillSearchResponse,
  }),
  "research.bills.detail": defineOperation({
    service: "core",
    method: "GET",
    path: "/research-portfolios/bills/:kind/:billId",
    source,
    request: z
      .object({
        params: z.object({ kind: researchBillKind, billId: z.string().min(1) }).strict(),
      })
      .strict(),
    response: researchBillDetail,
  }),
};
