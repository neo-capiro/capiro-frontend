import type {
  LinkReviewCandidate,
  LinkReviewKind,
  LinkReviewReceipt,
  LinkReviewAttempt,
} from "../src/shared/capiro/operations/settings-admin/analyst-links";
export const reviewDate = "2026-10-29T12:00:00.000Z";
export function reviewCandidate(kind: LinkReviewKind): LinkReviewCandidate {
  const common = {
    id: "30000000-0000-4000-8000-000000000001",
    kind,
    reviewStatus: "candidate" as const,
    matchBasis: "program_alias",
    confidence: 0.6,
    createdAt: reviewDate,
    updatedAt: reviewDate,
    peCode: "0603270A",
    projectCode: null,
    programId: null,
    version: "a".repeat(64),
    program: null,
    programElement: {
      peCode: "0603270A",
      title: "Synthetic PE",
      service: "Army",
      retiredAt: null,
    },
  };
  return kind === "provision"
    ? {
        ...common,
        kind,
        source: {
          id: "40000000-0000-4000-8000-000000000001",
          heading: "Synthetic provision",
          text: "Synthetic committee evidence to inspect.",
          committee: "HASC",
          fy: 2027,
          pageStart: 20,
          pageEnd: 21,
          actionType: "directs_report",
          updatedAt: reviewDate,
          sourceDocument: {
            id: "50000000-0000-4000-8000-000000000001",
            title: "Synthetic report",
            sourceUrl: "https://example.invalid/report",
            sha256: "c".repeat(64),
            sourceKey: "synthetic-report",
            supersededByDocumentId: null,
            ingestedAt: reviewDate,
          },
        },
      }
    : {
        ...common,
        kind,
        source: {
          id: "60000000-0000-4000-8000-000000000001",
          noticeId: "synthetic-notice",
          title: "Synthetic SAM notice",
          description: "Synthetic SAM source evidence.",
          noticeType: "Sources Sought",
          baseType: "Presolicitation",
          agency: "Synthetic agency",
          office: "Synthetic office",
          solicitationNumber: "SYN-1",
          sourceUrl: "https://example.invalid/notice",
          responseDeadline: null,
          postedDate: reviewDate,
          archiveDate: null,
          active: true,
          updatedAt: reviewDate,
          lastSyncedAt: reviewDate,
        },
      };
}
export function reviewReceipt(
  attempt: LinkReviewAttempt,
  reviewerId: string,
  refused = false,
): LinkReviewReceipt {
  return {
    schemaVersion: 1,
    kind: attempt.kind,
    candidateId: attempt.candidateId,
    ...attempt.command,
    resultingVersion: "b".repeat(64),
    reviewerId,
    decidedAt: reviewDate,
    status: refused
      ? "refused"
      : attempt.command.decision === "accept"
        ? "accepted"
        : "rejected",
    refusal: refused ? "REVIEW_SOURCE_STALE" : null,
  };
}
