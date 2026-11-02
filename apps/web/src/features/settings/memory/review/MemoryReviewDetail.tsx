"use client";
import Link from "next/link";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { SettingsCard, SettingsNotice } from "../../components";
import { MemoryReviewActions } from "./MemoryReviewActions";
import { readableTitle } from "../../../../shared/presentation/text";
import styles from "./review-detail.module.css";

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
    <section className={styles.review} aria-label="Memory review">
      <SettingsCard title={readableTitle(review.title, "Memory review")}>
        <p className={styles.meta}>
          {review.scope === "firm"
            ? "Firm memory"
            : `Client: ${review.client?.name ?? "Unavailable"}`}{" "}
          · Revision {review.revisionNumber} ·{" "}
          {review.status[0]!.toUpperCase() +
            review.status.slice(1).replaceAll("_", " ")}
        </p>
        <p className={styles.meta}>
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
        {review.feedbackReason && (
          <p>Review feedback: {review.feedbackReason}</p>
        )}
        {review.blockedReason && (
          <p role="status">
            Review blocked: {review.blockedReason.replaceAll("_", " ")}
          </p>
        )}
        <h3>Version history</h3>
        <ol className={styles.timeline}>
          {review.timeline.map((item) => (
            <li key={item.reviewRequestId}>
              Revision {item.revisionNumber}
              {readableTitle(item.title, "")
                ? `: ${readableTitle(item.title, "")}`
                : ""}{" "}
              ·{" "}
              {item.status[0]!.toUpperCase() +
                item.status.slice(1).replaceAll("_", " ")}
            </li>
          ))}
        </ol>
        <details className={styles.details}>
          <summary>Review details</summary>
          <dl>
            <div>
              <dt>Original review title</dt>
              <dd>{review.title}</dd>
            </div>
            <div>
              <dt>Review reference</dt>
              <dd>{review.reviewRequestId}</dd>
            </div>
            {review.timeline.map((item) => (
              <div key={item.reviewRequestId}>
                <dt>Revision {item.revisionNumber}</dt>
                <dd>
                  {item.title}
                  <br />
                  {item.reviewRequestId}
                </dd>
              </div>
            ))}
          </dl>
        </details>
        <Link className={styles.action} href="/settings/memory">
          Open memory settings
        </Link>
      </SettingsCard>
    </section>
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
