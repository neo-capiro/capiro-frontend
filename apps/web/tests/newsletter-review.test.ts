import { describe, expect, it } from "vitest";
import {
  receiveComments,
  receiveReview,
} from "../src/features/modules/workspace/rich-newsletter/review/receiving";
import { richNewsletterReviewOperations } from "../src/shared/capiro/operations/rich-newsletter-review";
import { workspaceOperations } from "../src/shared/capiro/operations/workspace";
import {
  readWorkspaceRoute,
  workspaceHref,
} from "../src/features/modules/workspace/workspace-route";
import {
  otherReviewId,
  reviewComment,
  reviewFixture,
  reviewId,
} from "./newsletter-review-fixtures";

describe("saved newsletter public receiving", () => {
  it.each(["owner", "editor", "commenter", "viewer"])(
    "receives the current %s role and nullable stored fields",
    (role) => {
      const received = receiveReview(reviewFixture(role), reviewId);
      expect(received.ok).toBe(true);
      if (!received.ok) throw new Error("Expected valid review");
      expect(received.value.role).toBe(role);
      expect(received.value.comments[0]).toMatchObject({
        blockId: null,
        parentId: null,
      });
      expect(
        receiveReview({ ...reviewFixture(role), role: "admin" }, reviewId).ok,
      ).toBe(false);
    },
  );
  it("rejects another document, including every nested comment binding", () => {
    expect(
      receiveReview({ ...reviewFixture(), id: otherReviewId }, reviewId).ok,
    ).toBe(false);
    for (const key of ["documentId", "campaignId"] as const) {
      const comment = { ...reviewComment(), [key]: otherReviewId };
      expect(
        receiveReview({ ...reviewFixture(), comments: [comment] }, reviewId).ok,
      ).toBe(false);
      expect(receiveComments({ items: [comment] }, reviewId).ok).toBe(false);
    }
  });
  it("does not equate unavailable, malformed or oversized responses with empty comments", () => {
    for (const value of [
      null,
      {},
      { items: null },
      { items: [{ ...reviewComment(), resolved: "false" }] },
    ])
      expect(receiveComments(value, reviewId).ok).toBe(false);
    expect(receiveComments({ items: [] }, reviewId)).toEqual({
      ok: true,
      value: { items: [] },
    });
    expect(
      receiveComments(
        { items: Array.from({ length: 500 }, reviewComment) },
        reviewId,
      ).ok,
    ).toBe(true);
    expect(
      receiveComments(
        { items: Array.from({ length: 501 }, reviewComment) },
        reviewId,
      ).ok,
    ).toBe(false);
  });
  it("registers only GETs with strict requested UUIDs and an unknown transport result", () => {
    for (const [key, operation] of Object.entries(
      richNewsletterReviewOperations,
    )) {
      expect(
        workspaceOperations[key as keyof typeof richNewsletterReviewOperations],
      ).toBe(operation);
      expect(operation.method).toBe("GET");
      expect(operation.service).toBe("workspace");
      expect(
        operation.request.safeParse({ params: { id: reviewId } }).success,
      ).toBe(true);
      expect(
        operation.request.safeParse({ params: { id: "invalid" } }).success,
      ).toBe(false);
      expect(
        operation.request.safeParse({ params: { id: reviewId }, body: {} })
          .success,
      ).toBe(false);
      expect(operation.response.parse({ untrusted: true })).toEqual({
        untrusted: true,
      });
    }
  });
  it("opens a known UUID without requiring an editor list, preserving optional client scope", () => {
    const href = workspaceHref({
      kind: "newsletter-review",
      newsletterId: reviewId,
      clientId: otherReviewId,
    });
    expect(readWorkspaceRoute(new URLSearchParams(href.split("?")[1]))).toEqual(
      {
        kind: "newsletter-review",
        newsletterId: reviewId,
        clientId: otherReviewId,
      },
    );
  });
  it.each([
    `view=documents&newsletterId=${reviewId}`,
    `view=rich-newsletter&newsletterId=${reviewId}&newsletterId=${otherReviewId}`,
    `view=rich-newsletter&newsletterId=${reviewId}&draftId=${otherReviewId}`,
    `view=rich-newsletter&newsletterId=${reviewId}&prospectId=${otherReviewId}`,
    `view=rich-newsletter&newsletterId=${reviewId}&copyDocumentId=${otherReviewId}`,
    "view=rich-newsletter&newsletterId=invalid",
  ])("rejects conflicting or malformed native route %s", (query) => {
    expect(readWorkspaceRoute(new URLSearchParams(query))).toEqual({
      kind: "invalid",
    });
  });
});
