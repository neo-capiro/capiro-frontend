import Link from "next/link";
import { Button } from "@capiro/ui/button";
import { ApiError } from "@/shared/portfolio/api/http";
import styles from "./work-strategy-state.module.css";

export function isRetryingWorkFailure(query: {
  isPending: boolean;
  isFetching: boolean;
  errorUpdatedAt: number;
}) {
  return query.isPending && query.isFetching && query.errorUpdatedAt > 0;
}

export function WorkStrategyUnavailable() {
  return (
    <section
      className={styles.unavailable}
      aria-label="Client strategy portfolio"
    >
      <h2>Client strategy portfolio</h2>
      <p>Strategies could not be loaded.</p>
    </section>
  );
}

export function WorkStrategyFailure({
  error,
  partial,
  retrying,
  onRetry,
}: {
  error: Error | null | undefined;
  partial: boolean;
  retrying: boolean;
  onRetry: () => void;
}) {
  const expired = error instanceof ApiError && error.status === 401;
  const description = !error
    ? "Retrying the Strategies service…"
    : error instanceof ApiError && error.status === 403
      ? "You do not have permission for this operation."
      : error instanceof ApiError
        ? error.message
        : "The Strategies service did not answer.";
  return (
    <section className={styles.failure} role="alert" aria-busy={retrying}>
      <h2>
        {partial
          ? "Some strategies could not be loaded"
          : "Strategies could not be loaded"}
      </h2>
      <p>{description}</p>
      {expired ? (
        <Button asChild variant="outline" className={`button ${styles.retry}`}>
          <Link href="/sign-in">Sign in again</Link>
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className={`button ${styles.retry}`}
          disabled={retrying}
          onClick={onRetry}
        >
          Retry
        </Button>
      )}
    </section>
  );
}
