"use client";
import Link from "next/link";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { SettingsNotice } from "../../components";
import type { MemoryDraftSubmissionReceipt } from "@capiro/shared/settings-memory-drafts";
export function MemoryDraftOutcome({
  receipt,
  personal,
}: {
  receipt: MemoryDraftSubmissionReceipt;
  personal: boolean;
}) {
  const review = useCapiroQuery(
    "memory.review.candidate",
    { params: { id: receipt.candidateId } },
    { enabled: !personal },
  );
  return (
    <SettingsNotice title="Submitted for review">
      <p>
        Draft revision {receipt.draftRevision} was submitted. The receipt
        confirms submission only; current review and publication status come
        from the review item.
      </p>
      {personal ? (
        <Link href={`/meri/memory#memory-candidate-${receipt.candidateId}`}>
          Open personal review
        </Link>
      ) : review.data?.candidateId === receipt.candidateId ? (
        <Link href={`/meri/memory/review/${review.data.reviewRequestId}`}>
          Open this review · {review.data.status.replaceAll("_", " ")}
        </Link>
      ) : (
        <SettingsNotice
          error={!!review.error}
          title={
            review.loading ? "Loading review link" : "Review link unavailable"
          }
          retry={review.reload}
        >
          The submission is recorded. Reload its review status without
          submitting again.
        </SettingsNotice>
      )}
    </SettingsNotice>
  );
}
