"use client";
import { ApiError } from "../api/http";
import Link from "next/link";
export function QueryState({
  pending,
  error,
  retry,
}: {
  pending?: boolean;
  error?: Error | null;
  retry?: () => void;
}) {
  // A failed read must never be hidden behind an endless pending state: a query
  // that errored can also be re-fetching, and showing "Loading…" then strands the
  // surface with no error and no retry (H3).
  if (!error && pending)
    return (
      <div className="status" role="status">
        Loading…
      </div>
    );
  if (!error) return null;
  return (
    <div className="status error" role="alert">
      <p>
        {error instanceof ApiError && error.status === 403
          ? "You do not have permission for this operation."
          : error.message}
      </p>
      {error instanceof ApiError && error.status === 401 ? (
        <Link className="button" href="/sign-in">
          Sign in again
        </Link>
      ) : (
        retry && (
          <button className="button" onClick={retry}>
            Retry
          </button>
        )
      )}
    </div>
  );
}
