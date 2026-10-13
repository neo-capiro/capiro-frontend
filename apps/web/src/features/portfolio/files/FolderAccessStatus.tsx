"use client";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { useFileChange } from "./mutations";

export function FolderAccessStatus({
  change,
  viewerLabel,
}: {
  change: ReturnType<typeof useFileChange>;
  viewerLabel: (id: string) => string;
}) {
  return (
    <div className="stack">
      <QueryState error={change.error} />
      {change.attempt?.status === "unknown" && (
        <>
          <p>
            The save outcome is unknown. Your draft is retained. Review current
            folder files before deciding whether to save again.
          </p>
          <button
            type="button"
            className="button"
            disabled={!change.canReview}
            onClick={change.review}
          >
            Review current folder files
          </button>
        </>
      )}
      {change.current && (
        <div className="stack" role="status">
          <p>Current visible folder files: {change.current.length}.</p>
          {change.current.length > 0 && (
            <ul>
              {change.current.map((file) => (
                <li key={file.id}>
                  {file.fileName}:{" "}
                  {file.viewerMode === "all"
                    ? "All team members"
                    : "Specific people"}
                  {file.viewerMode === "restricted" && (
                    <small className="block">
                      Current selected viewers:{" "}
                      {file.viewerUserIds.map(viewerLabel).join(", ") ||
                        "None (uploader only)"}
                    </small>
                  )}
                </li>
              ))}
            </ul>
          )}
          <small>
            This is current visible state. It does not confirm the earlier save
            or reveal files you cannot access. Review your retained draft before
            a separate save. Future uploads do not inherit this setting.
          </small>
        </div>
      )}
    </div>
  );
}
