"use client";
import Link from "next/link";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { SettingsCard, SettingsNotice } from "../../components";
import { MemoryReviewActions } from "./MemoryReviewActions";

/** Shared protected detail destination for Settings and in-app review notifications. */
export function MemoryReviewDetail({ requestId }: { requestId: string }) {
  const result = useCapiroQuery("memory.review.request", {
    params: { id: requestId },
  });
  if (result.loading)
    return <p role="status">Loading the current memory review.</p>;
  if (result.error || !result.data)
    return (
      <SettingsNotice error title="Memory review unavailable">
        The review could not be verified with your current access.{" "}
        <button type="button" onClick={result.reload}>
          Check again
        </button>
      </SettingsNotice>
    );
  const review = result.data;
  if (review.reviewRequestId !== requestId)
    return (
      <SettingsNotice error title="Memory review unavailable">
        The owner returned a different review.
      </SettingsNotice>
    );
  return (
    <SettingsCard title={review.title}>
      <p>
        {review.scope === "firm"
          ? "Firm memory"
          : `Client: ${review.client?.name ?? "Unavailable"}`}{" "}
        · Revision {review.revisionNumber} ·{" "}
        {review.status.replaceAll("_", " ")}
      </p>
      <p>
        Submitted by {review.submittedBy.name}. Reviewer:{" "}
        {review.assignedReviewer?.name ?? "Not assigned"}.
      </p>
      {review.activeMemoryUnchanged && (
        <p>
          Active memory remains unchanged while this proposal is under review.
        </p>
      )}
      <ReviewProposal proposal={review.proposal} />
      <MemoryReviewActions
        key={`${review.candidateId}:${review.status}`}
        review={review}
        refresh={result.reload}
      />
      {review.feedbackReason && <p>Review feedback: {review.feedbackReason}</p>}
      {review.blockedReason && (
        <p role="status">
          Review blocked: {review.blockedReason.replaceAll("_", " ")}
        </p>
      )}
      <h3>Version history</h3>
      <ol>
        {review.timeline.map((item) => (
          <li key={item.reviewRequestId}>
            Revision {item.revisionNumber}: {item.title} ·{" "}
            {item.status.replaceAll("_", " ")}
          </li>
        ))}
      </ol>
      <Link href="/settings/memory">Open memory settings</Link>
    </SettingsCard>
  );
}

function ReviewProposal({
  proposal,
}: {
  proposal: import("@capiro/shared/memory-review").MemoryReviewProposal;
}) {
  return (
    <div>
      <h3>Proposed content</h3>
      {proposal.value !== null && (
        <p style={{ whiteSpace: "pre-wrap" }}>{proposal.value}</p>
      )}
      {proposal.canonicalItem?.sections.map((section) => (
        <section key={section.key}>
          <h4>{section.heading}</h4>
          <p style={{ whiteSpace: "pre-wrap" }}>{section.body}</p>
        </section>
      ))}
    </div>
  );
}
