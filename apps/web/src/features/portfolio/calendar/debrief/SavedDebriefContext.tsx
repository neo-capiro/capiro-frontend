"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { ArtifactActor } from "../artifacts/contracts";
import {
  readSavedDebriefContext,
  type SavedDebriefContextBinding,
} from "./saved-context";

export function SavedDebriefContext({
  binding,
  actor,
  allowed,
}: {
  binding: SavedDebriefContextBinding;
  actor: ArtifactActor;
  allowed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const api = useApi();
  const cache = useQueryClient();
  const queryKey = [
    "meeting",
    binding.meetingId,
    "debrief-context",
    actor.tenantId,
    actor.userId,
    binding.clientId,
    binding.id,
    binding.revision,
  ];
  const query = useQuery({
    queryKey,
    enabled: open && allowed,
    queryFn: ({ signal }) => readSavedDebriefContext(api, binding, signal),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const current =
    open &&
    allowed &&
    query.isSuccess &&
    !query.isFetching &&
    !query.error &&
    !cache.getQueryState(queryKey)?.isInvalidated;
  return (
    <div className="stack">
      <button
        className="button"
        aria-expanded={open}
        disabled={!allowed}
        onClick={() => setOpen(!open)}
      >
        {open ? "Hide generation context" : "Generation context"}
      </button>
      {open && allowed && (
        <>
          <QueryState
            pending={query.isPending || query.isFetching}
            error={query.error}
            retry={() => void query.refetch()}
          />
          {current &&
            (query.data.generatedFrom ? (
              <div>
                <p>
                  Saved generation summary:{" "}
                  {query.data.generatedFrom.totalTokens.toLocaleString()}{" "}
                  estimated input tokens (limit{" "}
                  {query.data.generatedFrom.boundTokens.toLocaleString()}).
                </p>
                <p className="muted">
                  This summary records the sections used for the original
                  generated draft. It does not reproduce the source text or
                  certify later edits.
                </p>
                {query.data.generatedFrom.sourceTruncated && (
                  <p>The source was shortened for generation.</p>
                )}
                <ul>
                  {query.data.generatedFrom.sections.map((section, index) => (
                    <li key={`${index}:${section.name}`}>
                      {section.name}: {section.state},{" "}
                      {section.tokens.toLocaleString()} estimated tokens
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="muted">
                No generation context was saved for this debrief.
              </p>
            ))}
        </>
      )}
    </div>
  );
}
