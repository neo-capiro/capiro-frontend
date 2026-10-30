import React from "react";
import { Btn, Modal } from "../../ui/primitives";
import { ImportJobStatusPanel } from "../../ui/ImportJobStatusPanel";
import type { ImportJobPanelState } from "../../lib/import-job-status";
import {
  classifyImportJobFailure,
  flattenImportJobPages,
  importJobPageNextCursor,
  useImportAccountScope,
  useImportJobDetail,
  useImportJobHistory,
} from "../../lib/use-import-job-reads";
import { deriveImportJobPanelState } from "../../lib/import-job-status";
import { useCapiroApi, type ImportJob } from "../../lib/capiro-api";

/** Read-only history view shared by managed users; no import/cancel actions. */
export function ImportHistoryView({
  state,
  job,
  jobs,
  population,
  nextCursor,
  onLoadMore,
  onRefresh,
  onSelectJob,
  errorMessage,
  onClose,
}: {
  state: ImportJobPanelState;
  job: ImportJob | null;
  jobs: readonly ImportJob[];
  population?: Parameters<typeof ImportJobStatusPanel>[0]["population"];
  nextCursor: string | null;
  onLoadMore: () => void;
  onRefresh: () => void;
  onSelectJob: (jobId: string) => void;
  errorMessage?: string | null;
  onClose: () => void;
}) {
  return (
    <Modal title="Import status" onClose={onClose} width={720}>
      <ImportJobStatusPanel
        state={state}
        job={job}
        jobs={jobs}
        population={population}
        nextCursor={nextCursor}
        onLoadMore={onLoadMore}
        onRefresh={onRefresh}
        onSelectJob={onSelectJob}
        errorMessage={errorMessage}
        managed
      />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn onClick={onClose}>Close</Btn>
      </div>
    </Modal>
  );
}

export function ImportStatusOverlay({ onClose }: { onClose: () => void }) {
  const api = useCapiroApi();
  const account = useImportAccountScope();
  const [selection, setSelection] = React.useState<{
    scopeKey: string;
    jobId: string | null;
  }>({ scopeKey: account.scopeKey, jobId: null });
  if (selection.scopeKey !== account.scopeKey)
    setSelection({ scopeKey: account.scopeKey, jobId: null });
  const history = useImportJobHistory(api, account.scopeKey, account.ready);
  const jobs = React.useMemo(
    () => flattenImportJobPages(history.data?.pages),
    [history.data],
  );
  const selectedId =
    selection.scopeKey === account.scopeKey ? selection.jobId : null;
  const activeJobId = selectedId ?? jobs[0]?.id ?? null;
  const detail = useImportJobDetail(api, account.scopeKey, activeJobId);
  const failureSource = history.error ?? detail.error ?? null;
  const failure = failureSource
    ? classifyImportJobFailure(failureSource)
    : null;
  const state = deriveImportJobPanelState({
    ready: account.ready,
    loading:
      history.isLoading || (!!activeJobId && detail.isLoading && !detail.data),
    failure,
    totalJobs: history.data?.pages[0]?.population.total ?? 0,
  });
  const job =
    failure === null
      ? (detail.data ?? jobs.find((entry) => entry.id === activeJobId) ?? null)
      : null;
  const refresh = async () => {
    const reads: Promise<unknown>[] = [history.refetch()];
    if (activeJobId) reads.push(detail.refetch());
    await Promise.all(reads);
  };

  return (
    <ImportHistoryView
      state={state}
      job={job}
      jobs={failure === null ? jobs : []}
      population={
        failure === null ? history.data?.pages[0]?.population : undefined
      }
      nextCursor={
        history.hasNextPage
          ? importJobPageNextCursor(history.data?.pages)
          : null
      }
      onLoadMore={() => {
        if (history.hasNextPage && !history.isFetchingNextPage)
          void history.fetchNextPage();
      }}
      onRefresh={() => void refresh()}
      onSelectJob={(jobId) =>
        setSelection({ scopeKey: account.scopeKey, jobId })
      }
      onClose={onClose}
    />
  );
}
