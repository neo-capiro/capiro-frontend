import React from "react";
import { type SetupState } from "../../lib/setup";
import { useCapiroApi } from "../../lib/capiro-api";
import { useLatestImportJob } from "../../lib/use-import-job-reads";
import { ClientImportTaskView } from "./ClientImportTaskView";
import { ImportStatusOverlay } from "./ImportStatusOverlay";

/**
 * Thin hook wrapper: scoped latest-job read + read-only managed history.
 * Every visible job field comes from the same current-account read; an
 * unavailable/error read yields no job content (see useLatestImportJob).
 */
export function ClientImportTask({
  state,
  onOpen,
}: {
  state: SetupState;
  onOpen: () => void;
}) {
  const api = useCapiroApi();
  const latest = useLatestImportJob(api);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  return (
    <>
      <ClientImportTaskView
        state={state}
        latest={{
          panelState: latest.panelState,
          job: latest.job,
          failure: latest.failure,
          refresh: () => void latest.refresh(),
        }}
        onOpen={onOpen}
        onOpenHistory={() => setHistoryOpen(true)}
      />
      {historyOpen && (
        <ImportStatusOverlay onClose={() => setHistoryOpen(false)} />
      )}
    </>
  );
}
