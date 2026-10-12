"use client";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { useFileMetadataChange } from "./useFileMetadataChange";

export function FileMetadataStatus({
  change,
  kind,
  viewerLabels,
}: {
  change: ReturnType<typeof useFileMetadataChange>;
  kind: "access" | "move";
  viewerLabels?: string[];
}) {
  return (
    <div className="stack">
      <QueryState error={change.error} />
      {change.attempt?.status === "unknown" && (
        <>
          <p>
            The save outcome is unknown. Your draft is retained. Review the
            current file before deciding whether to save again.
          </p>
          <button
            type="button"
            className="button"
            disabled={!change.canReview}
            onClick={change.review}
          >
            Review current file
          </button>
        </>
      )}
      {change.current && (
        <div className="stack" role="status">
          {kind === "access" ? (
            <>
              <p>
                Current saved access:{" "}
                {change.current.viewerMode === "all"
                  ? "All team members"
                  : "Specific people"}
              </p>
              {change.current.viewerMode === "restricted" && (
                <p>
                  Current selected viewers:{" "}
                  {viewerLabels?.join(", ") || "None (uploader only)"}
                </p>
              )}
            </>
          ) : (
            <p>Current saved folder: {change.current.folder ?? "Unfiled"}</p>
          )}
          <small>
            This is the current saved state. It does not confirm the earlier
            save. Review your retained draft before saving again.
          </small>
        </div>
      )}
    </div>
  );
}
