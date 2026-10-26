export const reviewId = "b2222222-2222-7222-8222-222222222222";
export const otherReviewId = "c3333333-3333-7333-8333-333333333333";
export function reviewComment() {
  return {
    id: "a1111111-1111-4111-8111-111111111111",
    tenantId: "d4444444-4444-4444-8444-444444444444",
    documentId: reviewId,
    campaignId: reviewId,
    authorId: "user_synthetic",
    authorName: "Synthetic reviewer",
    blockId: null,
    parentId: null,
    message: "Please keep this saved paragraph.",
    resolved: false,
    createdAt: "2026-10-26T12:30:00.000Z",
  };
}
export function reviewFixture(role = "viewer") {
  return {
    id: reviewId,
    name: "Synthetic saved newsletter",
    role,
    html: "<!doctype html><html><body><h1>Saved newsletter content</h1><p>Persisted content only.</p></body></html>",
    comments: [reviewComment()],
  };
}
