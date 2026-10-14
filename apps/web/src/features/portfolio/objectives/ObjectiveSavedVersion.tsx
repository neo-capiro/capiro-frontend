"use client";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { workspaceDocumentOperations } from "@/shared/capiro/operations/workspace-documents";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
export function ObjectiveSavedVersion({
  draftId,
  disabled,
  onOpen,
}: {
  draftId: string;
  disabled: boolean;
  onOpen: (versionId: string, isCurrent: () => boolean) => void;
}) {
  const api = useApi(),
    id = useId();
  const [versionId, setVersionId] = useState("");
  const selected = useRef(versionId);
  useLayoutEffect(() => {
    selected.current = versionId;
  }, [versionId]);
  const cache = useQueryClient();
  const versions = useQuery({
    queryKey: ["objective-saved-versions", draftId],
    enabled: !disabled,
    retry: false,
    queryFn: ({ signal }) =>
      api.request(
        "workspace",
        `drafts/${encodeURIComponent(draftId)}/versions`,
        workspaceDocumentOperations["workspace.draft.versions"].response.refine(
          (rows) =>
            rows.every(
              (row) => row.draftId.toLowerCase() === draftId.toLowerCase(),
            ),
        ),
        { signal },
      ),
  });
  return (
    <div className="stack">
      <p>
        Select a saved version explicitly. The current working draft will not be
        used.
      </p>
      <QueryState
        pending={versions.isFetching}
        error={versions.error}
        retry={() => void versions.refetch()}
      />
      {versions.isSuccess && !versions.isFetching && (
        <>
          {!versions.data.length && <p>No saved versions are available.</p>}
          <label htmlFor={id}>Saved Workspace version</label>
          <select
            id={id}
            className="input"
            disabled={disabled}
            value={versionId}
            onChange={(event) => setVersionId(event.target.value)}
          >
            <option value="">Choose a saved version</option>
            {versions.data.map((version) => (
              <option key={version.id} value={version.id}>
                {version.label ?? version.createdAt} · {version.authorId}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="button primary"
            disabled={
              disabled ||
              !versions.data.some((version) => version.id === versionId)
            }
            onClick={() => {
              const capturedVersion = versionId,
                source = versions.data;
              onOpen(capturedVersion, () => {
                const current = cache.getQueryState([
                  "objective-saved-versions",
                  draftId,
                ]);
                return Boolean(
                  current &&
                  selected.current === capturedVersion &&
                  current.data === source &&
                  current.status === "success" &&
                  current.fetchStatus === "idle" &&
                  !current.isInvalidated &&
                  !current.error,
                );
              });
            }}
          >
            Open Objective-bound Workspace saved revision
          </button>
        </>
      )}
    </div>
  );
}
