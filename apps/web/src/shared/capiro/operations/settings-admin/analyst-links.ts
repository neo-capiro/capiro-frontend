import { z } from "zod";
import { defineOperation } from "../../contracts";

const source =
  "apps/api/src/program-element/analyst-links/analyst-link-review.controller.ts@1b731022b034a8960d65300b66ddd1ce3c6922ff";
export const linkReviewKind = z.enum(["provision", "sam"]);
export type LinkReviewKind = z.infer<typeof linkReviewKind>;
export const linkReviewStatus = z.enum([
  "candidate",
  "quarantined",
  "accepted",
  "rejected",
]);
const version = z.string().regex(/^[a-f0-9]{64}$/);
const date = z.iso.datetime({ offset: true });
const nullable = z.string().nullable();
export const linkReviewCommand = z.strictObject({
  requestId: z.uuid(),
  expectedVersion: version,
  decision: z.enum(["accept", "reject"]),
  reason: z.string().trim().min(1).max(4000),
});
export const linkReviewAttempt = z.strictObject({
  kind: linkReviewKind,
  candidateId: z.uuid(),
  command: linkReviewCommand,
});
export type LinkReviewAttempt = z.infer<typeof linkReviewAttempt>;
export const linkReviewReceipt = z
  .strictObject({
    schemaVersion: z.literal(1),
    requestId: z.uuid(),
    kind: linkReviewKind,
    candidateId: z.uuid(),
    expectedVersion: version,
    resultingVersion: version,
    decision: z.enum(["accept", "reject"]),
    status: z.enum(["accepted", "rejected", "refused"]),
    refusal: z
      .enum(["REVIEW_SOURCE_STALE", "REVIEW_TARGET_UNAVAILABLE"])
      .nullable(),
    reason: z.string().min(1).max(4000),
    reviewerId: z.uuid(),
    decidedAt: date,
  })
  .refine((value) =>
    value.status === "refused"
      ? value.refusal !== null
      : value.refusal === null &&
        value.status ===
          (value.decision === "accept" ? "accepted" : "rejected"),
  );
export type LinkReviewReceipt = z.infer<typeof linkReviewReceipt>;
const result = z.strictObject({
  schemaVersion: z.literal(1),
  replayed: z.boolean(),
  receipt: linkReviewReceipt,
});
const fields = {
  id: z.uuid(),
  kind: linkReviewKind,
  reviewStatus: linkReviewStatus,
  matchBasis: z.string(),
  confidence: z.number(),
  createdAt: date,
  updatedAt: date,
  peCode: nullable,
  projectCode: nullable,
  programId: z.uuid().nullable(),
  version,
  program: z
    .strictObject({
      id: z.uuid(),
      canonicalName: z.string(),
      component: nullable,
      status: z.string(),
      updatedAt: date,
    })
    .nullable(),
  programElement: z
    .strictObject({
      peCode: z.string(),
      title: z.string(),
      service: nullable,
      retiredAt: date.nullable(),
    })
    .nullable(),
};
const document = z.strictObject({
  id: z.uuid(),
  title: z.string(),
  sourceUrl: z.string(),
  sha256: nullable,
  sourceKey: z.string(),
  supersededByDocumentId: z.uuid().nullable(),
  ingestedAt: date,
});
const provision = z.strictObject({
  id: z.uuid(),
  heading: z.string(),
  text: z.string(),
  committee: z.string(),
  fy: z.number().int(),
  pageStart: z.number().int().nullable(),
  pageEnd: z.number().int().nullable(),
  actionType: nullable,
  updatedAt: date,
  sourceDocument: document.nullable(),
});
const sam = z.strictObject({
  id: z.uuid(),
  noticeId: z.string(),
  title: z.string(),
  description: nullable,
  noticeType: z.string(),
  baseType: nullable,
  agency: nullable,
  office: nullable,
  solicitationNumber: nullable,
  sourceUrl: nullable,
  responseDeadline: date.nullable(),
  postedDate: date.nullable(),
  archiveDate: date.nullable(),
  active: z.boolean(),
  updatedAt: date,
  lastSyncedAt: date,
});
export const linkReviewCandidate = z.discriminatedUnion("kind", [
  z.strictObject({
    ...fields,
    kind: z.literal("provision"),
    source: provision,
  }),
  z.strictObject({ ...fields, kind: z.literal("sam"), source: sam }),
]);
export type LinkReviewCandidate = z.infer<typeof linkReviewCandidate>;
const params = z.strictObject({ kind: linkReviewKind, id: z.uuid() });
export const analystLinksOperations = {
  "settings.analyst.links.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/analyst-links/:kind",
    source,
    request: z.strictObject({
      params: z.strictObject({ kind: linkReviewKind }),
      query: z.strictObject({
        status: linkReviewStatus,
        page: z.number().int().min(1).max(100000),
        limit: z.number().int().min(1).max(100),
      }),
    }),
    response: z.strictObject({
      schemaVersion: z.literal(1),
      kind: linkReviewKind,
      data: z.array(
        z.strictObject({
          ...fields,
          source: z.strictObject({ id: z.uuid(), title: z.string() }),
        }),
      ),
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      counts: z.partialRecord(linkReviewStatus, z.number().int().nonnegative()),
      observedAt: date,
    }),
  }),
  "settings.analyst.links.detail": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/analyst-links/:kind/:id",
    source,
    request: z.strictObject({ params }),
    response: z.strictObject({
      schemaVersion: z.literal(1),
      candidate: linkReviewCandidate,
      lastReview: linkReviewReceipt.nullable(),
      observedAt: date,
    }),
  }),
  "settings.analyst.links.decide": defineOperation({
    service: "core",
    method: "POST",
    path: "/capiro-admin/analyst-links/:kind/:id/decision",
    source,
    request: z.strictObject({ params, body: linkReviewCommand }),
    response: result,
  }),
  "settings.analyst.links.receipt": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/analyst-links/receipts/:requestId",
    source,
    request: z.strictObject({
      params: z.strictObject({ requestId: z.uuid() }),
    }),
    response: result,
  }),
} as const;

export function assertLinkReviewReceipt(
  attempt: LinkReviewAttempt,
  receipt: LinkReviewReceipt,
  reviewerId: string,
) {
  linkReviewReceipt.parse(receipt);
  if (
    receipt.kind !== attempt.kind ||
    receipt.candidateId !== attempt.candidateId ||
    receipt.requestId !== attempt.command.requestId ||
    receipt.expectedVersion !== attempt.command.expectedVersion ||
    receipt.decision !== attempt.command.decision ||
    receipt.reason !== attempt.command.reason ||
    receipt.reviewerId !== reviewerId
  )
    throw Error(
      "The receipt does not match the original review. Recover its exact result.",
    );
}
