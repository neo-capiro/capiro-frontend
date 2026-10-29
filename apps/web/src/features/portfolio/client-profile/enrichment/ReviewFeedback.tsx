import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { Finding } from "./contracts";
import type { useReviewAction } from "./useReviewAction";
import { ApplicationOutcome } from "./ApplicationOutcome";
type Props = {
  action: ReturnType<typeof useReviewAction>;
  findings: Finding[];
  canEdit: boolean;
  onRecovered: () => void;
};
export function ReviewFeedback({
  action,
  findings,
  canEdit,
  onRecovered,
}: Props) {
  return (
    <>
      {" "}
      <QueryState error={action.mutation.error} />
      <QueryState error={action.readError} />
      <QueryState error={action.recovery.error} />
      {action.uncertain && (
        <div role="alert" className="status error">
          The request may have saved changes.
          {action.recoverable
            ? " Recover its saved result using the original selection and revisions."
            : " Refresh the saved review to inspect current status. Do not repeat this action while its result is unknown."}
          {action.recoverable && (
            <button
              className="button"
              disabled={
                !canEdit ||
                action.recovery.isPending ||
                action.mutation.isPending
              }
              onClick={() =>
                action.recovery.mutate(undefined, {
                  onSuccess: () => onRecovered(),
                })
              }
            >
              Recover application result
            </button>
          )}
          <button
            className="button"
            onClick={() => void action.refreshUncertainReview()}
          >
            Refresh saved review
          </button>
        </div>
      )}
      {action.checkingRecovery && !action.uncertain && (
        <p role="status">Checking saved requests before enabling changes.</p>
      )}
      {action.checkingRecovery && action.readError && (
        <button
          className="button"
          disabled={!canEdit || action.recovery.isPending}
          onClick={() => action.recovery.mutate()}
        >
          Retry saved request recovery
        </button>
      )}
      {action.application && (
        <ApplicationOutcome result={action.application} findings={findings} />
      )}
      {action.receipt && (
        <p role="status" className="status">
          {action.receipt}
        </p>
      )}
    </>
  );
}
