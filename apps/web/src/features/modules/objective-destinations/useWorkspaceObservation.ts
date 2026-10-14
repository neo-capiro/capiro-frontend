"use client";
import { useEffect, useState } from "react";
import { receiveObjectiveWorkspace } from "../../../shared/capiro/operations/objective-workspace-receiving";
import type { ObjectiveDestinationQuery } from "../../../shared/capiro/operations/objective-destination-binding";
import type { objectiveWorkspaceDestination } from "../../../shared/capiro/operations/objective-work-destinations";
import type { z } from "zod";
type Receipt = z.infer<typeof objectiveWorkspaceDestination>;

/** Async snapshot integrity is scoped to the exact current query receipt and selection. */
export function useWorkspaceObservation(
  data: Receipt | undefined,
  draftId: string,
  versionId: string,
  query: ObjectiveDestinationQuery,
  snapshotHash?: string,
) {
  const key = JSON.stringify([draftId, versionId, query, snapshotHash]);
  const [state, setState] = useState<{
    key: string;
    source: Receipt;
    value?: Receipt;
    error?: Error;
  }>();
  useEffect(() => {
    if (!data) return;
    const controller = new AbortController();
    const selectedQuery = { ...query };
    void (async () => {
      try {
        const value = await receiveObjectiveWorkspace(
          data,
          draftId,
          versionId,
          selectedQuery,
          controller.signal,
          snapshotHash,
        );
        controller.signal.throwIfAborted();
        setState({ key, source: data, value });
      } catch (error) {
        if (!controller.signal.aborted)
          setState({
            key,
            source: data,
            error:
              error instanceof Error
                ? error
                : new Error("Saved revision unavailable."),
          });
      }
    })();
    return () => controller.abort();
    // key captures every scalar selection; query object identity is incidental.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, key]);
  const current =
    state?.key === key && state.source === data ? state : undefined;
  return {
    value: current?.value,
    error: current?.error,
    loading: Boolean(data && !current),
  };
}
