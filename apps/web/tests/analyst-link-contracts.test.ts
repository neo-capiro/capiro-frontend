import { describe, expect, it } from "vitest";
import {
  analystLinksOperations,
  assertLinkReviewReceipt,
  linkReviewCandidate,
  linkReviewReceipt,
  type LinkReviewAttempt,
} from "../src/shared/capiro/operations/settings-admin/analyst-links";
import { reviewCandidate, reviewReceipt } from "./analyst-link-fixtures";
const reviewer = "10000000-0000-4000-8000-000000000001";
const attempt: LinkReviewAttempt = {
  kind: "provision",
  candidateId: reviewCandidate("provision").id,
  command: {
    requestId: "70000000-0000-4000-8000-000000000001",
    expectedVersion: "a".repeat(64),
    decision: "accept",
    reason: "Synthetic evidence checked",
  },
};
describe("analyst source review contracts", () => {
  it.each(["provision", "sam"] as const)(
    "admits complete %s evidence but rejects private archive data and wrong source shape",
    (kind) => {
      const candidate = reviewCandidate(kind);
      expect(linkReviewCandidate.safeParse(candidate).success).toBe(true);
      expect(
        linkReviewCandidate.safeParse({
          ...candidate,
          source: { ...candidate.source, archiveS3Key: "private" },
        }).success,
      ).toBe(false);
      expect(
        linkReviewCandidate.safeParse({
          ...candidate,
          kind: kind === "sam" ? "provision" : "sam",
        }).success,
      ).toBe(false);
    },
  );
  it("accepts only the exact command and reviewer receipt", () => {
    const receipt = reviewReceipt(attempt, reviewer);
    expect(() =>
      assertLinkReviewReceipt(attempt, receipt, reviewer),
    ).not.toThrow();
    for (const change of [
      { kind: "sam" },
      { candidateId: reviewer },
      { requestId: reviewer },
      { expectedVersion: "b".repeat(64) },
      { reason: "Another reason" },
      { reviewerId: attempt.candidateId },
    ]) {
      expect(() =>
        assertLinkReviewReceipt(
          attempt,
          { ...receipt, ...change } as typeof receipt,
          reviewer,
        ),
      ).toThrow();
    }
  });
  it("distinguishes applied and refused outcomes", () => {
    const receipt = reviewReceipt(attempt, reviewer, true);
    expect(() =>
      assertLinkReviewReceipt(attempt, receipt, reviewer),
    ).not.toThrow();
    expect(
      linkReviewReceipt.safeParse({ ...receipt, status: "accepted" }).success,
    ).toBe(false);
    expect(
      linkReviewReceipt.safeParse({ ...receipt, refusal: null }).success,
    ).toBe(false);
  });
  it("refuses unknown authority fields, unbounded pages and versionless decisions", () => {
    const operation = analystLinksOperations["settings.analyst.links.decide"];
    const params = { kind: attempt.kind, id: attempt.candidateId };
    expect(
      operation.request.safeParse({
        params,
        body: { ...attempt.command, actorId: reviewer },
      }).success,
    ).toBe(false);
    expect(
      operation.request.safeParse({
        params,
        body: { ...attempt.command, expectedVersion: undefined },
      }).success,
    ).toBe(false);
    expect(
      analystLinksOperations["settings.analyst.links.list"].request.safeParse({
        params: { kind: "sam" },
        query: { status: "candidate", page: 1, limit: 101 },
      }).success,
    ).toBe(false);
  });
});
