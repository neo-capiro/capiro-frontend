import type { PortfolioProposal } from "./proposal-contracts";
import { useProposalReview } from "./depth-api";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import styles from "./depth.module.css";

export function ProposalActions({
  clientId,
  proposal,
  approveLabel = "Approve",
  approvalDisabled = false,
}: {
  clientId: string;
  proposal: PortfolioProposal;
  approveLabel?: string;
  approvalDisabled?: boolean;
}) {
  const review = useProposalReview(clientId);
  return (
    <div className="stack">
      <div className={styles.actions}>
        {proposal.status === "proposed" && (
          <>
            <button
              className="button primary"
              disabled={!review.canWrite || approvalDisabled}
              onClick={() => review.mutate({ proposal, action: "approve" })}
            >
              {approveLabel}
            </button>
            <button
              className="button"
              disabled={!review.canWrite}
              onClick={() => review.mutate({ proposal, action: "reject" })}
            >
              Reject
            </button>
          </>
        )}
        {proposal.status === "rejected" && (
          <>
            <p className="muted">
              Rejection is remembered until you restore this proposal.
            </p>
            <button
              className="button"
              disabled={!review.canWrite}
              onClick={() => review.mutate({ proposal, action: "restore" })}
            >
              Restore
            </button>
          </>
        )}
        {proposal.status === "approved" && (
          <p role="status">
            Approved · Source and review retained
            {proposal.reviewedAt
              ? ` · ${new Date(proposal.reviewedAt).toLocaleDateString()}`
              : ""}
          </p>
        )}
      </div>
      <QueryState error={review.error} />
      {review.isSuccess && <p role="status">Review saved.</p>}
    </div>
  );
}
