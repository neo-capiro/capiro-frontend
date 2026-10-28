"use client";

// The run the retained intake receipt named, read through this surface's own run
// read (`workspace.generation.run.status`). It is kept beside the attempt rather
// than inside it because the receipt that names the run is the attempt's own: a
// continuation of that run re-reads exactly this read, and nothing here mints a
// second read, a store or a poll.
import { useEffect, useState } from "react";
import { generationRunStatus } from "../../../../shared/capiro/operations/workspace-generation-schemas";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { intakeRunResolved, intakeRunView, type IntakeRunView } from "./intake";
import type { IntakeRecoveryRecord } from "./intake-recovery";

export type IntakeRunRead = {
  run: IntakeRunView | undefined;
  error: Error | undefined;
  reload: () => void;
};

/**
 * The run this attempt's own receipt names, and one settle per resolved run. A
 * read never dispatches: it only ever reads the run the receipt already named.
 */
export function useIntakeRun(
  record: IntakeRecoveryRecord | null,
  onSettled: () => void,
): IntakeRunRead {
  const [settledRunId, setSettledRunId] = useState("");
  const runId = record?.receipt?.runId ?? "";
  const read = useCapiroQuery(
    "workspace.generation.run.status",
    { params: { runId } },
    { enabled: Boolean(runId) },
  );
  const parsed = generationRunStatus.safeParse(read.data);
  const run = intakeRunView(parsed.success ? parsed.data : undefined);
  const resolvedRunId = run && intakeRunResolved(run.status) ? run.runId : "";
  useEffect(() => {
    // A resolved run already put its sections on the draft: re-read the current
    // document state rather than leaving stale section state on screen. Guarded
    // by the run id, so one run settles the reads exactly once.
    if (!resolvedRunId || settledRunId === resolvedRunId) return;
    setSettledRunId(resolvedRunId);
    onSettled();
  }, [resolvedRunId, settledRunId, onSettled]);
  return { run, error: read.error, reload: read.reload };
}
