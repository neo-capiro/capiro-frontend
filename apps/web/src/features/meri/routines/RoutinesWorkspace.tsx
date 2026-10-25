"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "@capiro/ui/button";
import type { RoutinesListResponse } from "@capiro/meri-contracts/routines-application";
import type { RoutineWorkflow } from "../../../shared/meri-routines/workflow";
import { RoutineReview } from "./RoutineReview";
import { RoutineForm, RoutineCancellation } from "./RoutineForm";
import { Panel } from "../ui/Panel";
import styles from "../ui/meri-ui.module.css";

export function RoutinesWorkspace({ port }: { port: RoutineWorkflow }) {
  const state = useSyncExternalStore(
    port.subscribe,
    port.getSnapshot,
    port.getSnapshot,
  );
  type Page = Omit<RoutinesListResponse["page"], "rows"> & {
    rows: RoutinesListResponse["page"]["rows"][number][];
  };
  const [page, setPage] = useState<Page | null>(null);
  const [loadingPort, setLoading] = useState<RoutineWorkflow | null>(null);
  const loading = loadingPort === port;
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{
    mode: "edit" | "cancel";
    scheduleId?: string;
  } | null>(null);
  const current = useRef<RoutineWorkflow | null>(port);
  useLayoutEffect(() => {
    current.current = port;
    return () => {
      if (current.current === port) current.current = null;
    };
  }, [port]);
  useEffect(() => {
    void port.load();
  }, [port]);
  if (state.saved && editor) setEditor(null);
  async function read(more = false) {
    if (loading) return;
    setLoading(port);
    setError(null);
    try {
      const response = await port.list(more ? page?.nextAfterScheduleId : null);
      if (current.current !== port) return;
      setPage((previous) =>
        more && previous
          ? {
              ...response.page,
              rows: [...previous.rows, ...response.page.rows],
            }
          : response.page,
      );
    } catch {
      if (current.current === port)
        setError(
          "Current routines could not be read. Previously shown results are not current authority.",
        );
    } finally {
      if (current.current === port) setLoading(null);
    }
  }
  const disabled = !state.ready || state.busy || Boolean(state.saved);
  const prepare = (request: Parameters<RoutineWorkflow["prepare"]>[0]) => {
    void port.prepare(request);
  };
  return (
    <div className={styles.page}>
      <header>
        <h1>Routines</h1>
        <p>
          Review recurring instructions, their scope and limits before any
          schedule change.
        </p>
      </header>
      <div className={styles.row}>
        <Button disabled={disabled} onClick={() => setEditor({ mode: "edit" })}>
          New routine
        </Button>
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => void read()}
        >
          Refresh routines
        </Button>
      </div>
      <RoutineReview port={port} />
      {editor &&
        !state.saved &&
        (editor.mode === "cancel" && editor.scheduleId ? (
          <RoutineCancellation
            key={editor.scheduleId}
            scheduleId={editor.scheduleId}
            disabled={disabled}
            prepare={prepare}
            close={() => setEditor(null)}
          />
        ) : (
          <RoutineForm
            key={editor.scheduleId ?? "new"}
            scheduleId={editor.scheduleId}
            disabled={disabled}
            prepare={prepare}
            close={() => setEditor(null)}
          />
        ))}
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">Reading current routines…</p>}
      {!page && !loading && (
        <p>
          Refresh routines to read the current schedule definitions and bounded
          recent activity.
        </p>
      )}
      {page?.rows.length === 0 && (
        <p>No routines were returned for the current account and scope.</p>
      )}
      {page?.rows.map((row) => (
        <Panel
          key={row.projection.scheduleId}
          label={`Routine ${row.projection.scheduleId}`}
        >
          <p>
            State: {row.projection.state}
            {row.unresolved ? " · unresolved change" : ""}. Destination:{" "}
            {row.projection.destinationId}. Timezone: {row.projection.timezone}.
          </p>
          <p>
            Next observed runs:{" "}
            {row.inspection?.temporal.nextActionTimes.join(", ") ||
              "Not available"}
            .
          </p>
          <p>
            Effective per run: $
            {(row.projection.maxCostMicrousd / 1_000_000).toFixed(6)},{" "}
            {row.projection.maxRuntimeSeconds} seconds,{" "}
            {row.projection.retryLimit} retries.
          </p>
          <div className={styles.row}>
            <Button
              variant="outline"
              disabled={
                disabled ||
                Boolean(error) ||
                row.unresolved ||
                row.projection.state === "cancelled"
              }
              onClick={() =>
                setEditor({
                  mode: "edit",
                  scheduleId: row.projection.scheduleId,
                })
              }
            >
              Edit or resume with fresh choices
            </Button>
            <Button
              variant="outline"
              disabled={
                disabled ||
                Boolean(error) ||
                row.unresolved ||
                row.projection.state === "cancelled"
              }
              onClick={() =>
                setEditor({
                  mode: "cancel",
                  scheduleId: row.projection.scheduleId,
                })
              }
            >
              Pause or cancel
            </Button>
          </div>
          <details>
            <summary>Recent activity</summary>
            {row.inspection ? (
              <>
                <p>
                  Observed {row.inspection.observedAt}. This is bounded
                  activity, not a complete history or verified current retry.
                </p>
                <ul>
                  {row.inspection.temporal.recentActions.map((action, i) => (
                    <li key={i}>
                      Scheduled {action.scheduledAt}; started {action.takenAt}.
                    </li>
                  ))}
                </ul>
                <p>
                  {row.inspection.coverage.recentActions.omitted} recent entries
                  omitted; {row.inspection.coverage.runningActions.returned}{" "}
                  running references observed. Their current execution identity
                  is not verified.
                </p>
              </>
            ) : (
              <p>Schedule inspection is currently unavailable.</p>
            )}
          </details>
        </Panel>
      ))}
      {page?.hasMore && (
        <Button
          disabled={loading}
          variant="outline"
          onClick={() => void read(true)}
        >
          Show more routines
        </Button>
      )}
    </div>
  );
}
