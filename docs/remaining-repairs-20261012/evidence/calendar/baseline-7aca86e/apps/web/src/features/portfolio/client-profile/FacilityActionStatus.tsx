"use client";
import { QueryState } from "@/shared/portfolio/ui/QueryState";

export function FacilityActionStatus({
  error,
  unknown,
  reviewed,
  reviewing,
  message,
  onReview,
}: {
  error: Error | null;
  unknown: boolean;
  reviewed: boolean;
  reviewing: boolean;
  message: string;
  onReview: () => void;
}) {
  return (
    <>
      <QueryState error={error} />
      {unknown && (
        <div className="stack">
          <p role="status">
            Address-resolution action result is unknown. Review the current
            saved result before requesting another action. The earlier provider
            request may still be running.
          </p>
          <button className="button" disabled={reviewing} onClick={onReview}>
            Review current address resolution
          </button>
        </div>
      )}
      {reviewed && (
        <p role="status" className="muted">
          Current address resolution reloaded. Review it before requesting
          another action; the earlier provider request may still be running.
        </p>
      )}
      {message && (
        <p role="status" className="muted">
          {message}
        </p>
      )}
    </>
  );
}
