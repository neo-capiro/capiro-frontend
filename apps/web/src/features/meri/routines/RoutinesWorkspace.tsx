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
import type { RoutinesConsentObservation } from "../../../shared/meri-routines/consent";
import { ConsentReview } from "./ConsentReview";
import { RoutineReview } from "./RoutineReview";
import { RoutineForm, RoutineCancellation } from "./RoutineForm";
import { MeriPageHeading } from "../ui/MeriPageHeading";
import { DataTable, type DataColumn } from "../ui/DataTable";
import { Notice } from "../ui/Notice";
import { phoneCardColumns } from "../ui/phone-card-columns";
import styles from "../ui/meri-ui.module.css";
import cards from "../ui/phone-cards.module.css";
import phone from "../ui/phone-page.module.css";

/** The canonical row plus the observation facet this read asks for, which the installed declarations do not carry. */
type ListedRoutine = RoutinesListResponse["page"]["rows"][number] & {
  consent?: RoutinesConsentObservation;
};
type Page = Omit<RoutinesListResponse["page"], "rows"> & {
  rows: ListedRoutine[];
};
type Routine = Page["rows"][number];
type RoutineRow = {
  id: string;
  name: string;
  client: string;
  nextRun: string;
  status: string;
  lastOutcome: string;
  routine: Routine;
};

const STATE_LABEL: Record<Routine["projection"]["state"], string> = {
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
};
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

/** Figma 08.01 columns from the bounded list read; the schedule has no user title in its projection. */
export function routineRows(
  rows: readonly Routine[],
  client: string,
): RoutineRow[] {
  return rows.map((routine) => {
    const next = routine.inspection?.temporal.nextActionTimes[0];
    const last = routine.inspection?.temporal.recentActions.at(-1);
    return {
      id: routine.projection.scheduleId,
      name: `Routine ${routine.projection.scheduleId.slice(0, 8)}${
        routine.unresolved ? " · unresolved change" : ""
      }`,
      client,
      nextRun: next ? when(next) : "Not available",
      status: STATE_LABEL[routine.projection.state],
      lastOutcome: routine.inspection
        ? last
          ? `Started ${when(last.takenAt)}`
          : "No runs observed"
        : "Not available",
      routine,
    };
  });
}

const columns: readonly DataColumn<RoutineRow>[] = [
  { key: "name", label: "Routine", width: 29, render: (row) => row.name },
  { key: "client", label: "Client", width: 12.5, render: (row) => row.client },
  { key: "next", label: "Next run", width: 21.5, render: (row) => row.nextRun },
  { key: "status", label: "Status", width: 14, render: (row) => row.status },
  {
    key: "outcome",
    label: "Last outcome",
    width: 23,
    render: (row) => row.lastOutcome,
  },
];
const cardColumns = phoneCardColumns(columns, {
  key: "status",
  tone: (row) => (row.status === "Active" ? "success" : "neutral"),
});

export function RoutinesWorkspace({
  port,
  preserveNewDraft = false,
  client = "General",
  onRequestExecution,
  initialEditor,
}: {
  port: RoutineWorkflow;
  /** Only the host keyed by immutable account/client may retain an unsent new draft across reauthorization. */
  preserveNewDraft?: boolean;
  /** Scope name shown in the Client column (Figma 08.01). */
  client?: string;
  /** Explicitly enter the existing run-bound flow; management never manufactures execution authority. */
  onRequestExecution?: (scheduleId?: string) => void;
  initialEditor?: { scheduleId?: string };
}) {
  const state = useSyncExternalStore(
    port.subscribe,
    port.getSnapshot,
    port.getSnapshot,
  );
  const [page, setPage] = useState<Page | null>(null);
  const [loadingPort, setLoading] = useState<RoutineWorkflow | null>(null);
  const loading = loadingPort === port;
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{
    mode: "edit" | "pause" | "delete";
    scheduleId?: string;
  } | null>(initialEditor ? { mode: "edit", ...initialEditor } : null);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [viewPort, setViewPort] = useState(port);
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
  // Service pages and existing-routine edits never carry across a connection. An unsent new draft
  // may stay within its keyed owner; the host hides it until fresh authorization and unmounts on denial.
  if (viewPort !== port || (state.accessDenied && (page || editor))) {
    const retainNewDraft =
      preserveNewDraft &&
      !state.accessDenied &&
      !viewPort.getSnapshot().accessDenied &&
      editor?.mode === "edit" &&
      !editor.scheduleId;
    setViewPort(port);
    setPage(null);
    if (!retainNewDraft) setEditor(null);
    setError(null);
  }
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
  if (state.accessDenied) return <p role="alert">{state.message}</p>;
  const rows = routineRows(page?.rows ?? [], client);
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];
  const routine = selected?.routine;
  const rowBlocked =
    !routine ||
    disabled ||
    Boolean(error) ||
    routine.unresolved ||
    routine.projection.state === "cancelled";
  return (
    <div className={`${styles.page} ${phone.page} ${cards.cards}`}>
      <MeriPageHeading
        title="Routines"
        description="Recurring research and drafting within your permissions"
        action={
          // Direct children: the phone heading rule keeps an aside that holds buttons.
          <>
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => void read()}
            >
              Refresh routines
            </Button>
            <Button
              disabled={disabled}
              onClick={() =>
                port.managementOnly
                  ? onRequestExecution?.()
                  : setEditor({ mode: "edit" })
              }
            >
              {port.managementOnly ? "Create or edit routines" : "New routine"}
            </Button>
          </>
        }
      />
      <RoutineReview port={port} />
      {editor &&
        !state.saved &&
        (editor.mode !== "edit" && editor.scheduleId ? (
          <RoutineCancellation
            key={`${editor.mode}:${editor.scheduleId}`}
            scheduleId={editor.scheduleId}
            initialMode={editor.mode}
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
        <p className={styles.muted}>
          Refresh routines to read the current schedule definitions and bounded
          recent activity.
        </p>
      )}
      {page?.rows.length === 0 && (
        <p className={styles.muted}>
          No routines were returned for the current account and scope.
        </p>
      )}
      {rows.length > 0 && (
        <>
          <DataTable
            caption="Routines"
            columns={cardColumns}
            rows={rows}
            selectedId={selected?.id}
            onSelect={setSelectedId}
          />
          <div className={styles.row} aria-label="Selected routine actions">
            <Button
              disabled={rowBlocked}
              onClick={() =>
                routine &&
                (port.managementOnly
                  ? onRequestExecution?.(routine.projection.scheduleId)
                  : setEditor({
                      mode: "edit",
                      scheduleId: routine.projection.scheduleId,
                    }))
              }
            >
              Open routine
            </Button>
            <Button
              variant="outline"
              disabled={rowBlocked || routine?.projection.state !== "active"}
              onClick={() =>
                routine &&
                setEditor({
                  mode: "pause",
                  scheduleId: routine.projection.scheduleId,
                })
              }
            >
              Pause
            </Button>
            <Button
              variant="outline"
              disabled={rowBlocked || routine?.projection.state !== "paused"}
              onClick={() =>
                routine &&
                (port.managementOnly
                  ? onRequestExecution?.(routine.projection.scheduleId)
                  : setEditor({
                      mode: "edit",
                      scheduleId: routine.projection.scheduleId,
                    }))
              }
            >
              Resume
            </Button>
            <Button
              variant="ghost"
              disabled={rowBlocked}
              onClick={() =>
                routine &&
                setEditor({
                  mode: "delete",
                  scheduleId: routine.projection.scheduleId,
                })
              }
            >
              Cancel routine
            </Button>
          </div>
          {routine && (
            <ConsentReview
              key={routine.projection.scheduleId}
              port={port}
              scheduleId={routine.projection.scheduleId}
              observation={routine.consent ?? null}
              disabled={rowBlocked}
            />
          )}
          {routine && (
            <details key={routine.projection.scheduleId}>
              <summary>Recent activity</summary>
              <p className={styles.muted}>
                Destination: {routine.projection.destinationId}. Timezone:{" "}
                {routine.projection.timezone}. Effective per run: $
                {(routine.projection.maxCostMicrousd / 1_000_000).toFixed(6)},{" "}
                {routine.projection.maxRuntimeSeconds} seconds,{" "}
                {routine.projection.retryLimit} retries.
              </p>
              {routine.inspection ? (
                <>
                  <p className={styles.muted}>
                    Observed {routine.inspection.observedAt}. This is bounded
                    activity, not a complete history or verified current retry.
                  </p>
                  <ul>
                    {routine.inspection.temporal.recentActions.map(
                      (action, i) => (
                        <li key={i}>
                          Scheduled {action.scheduledAt}; started{" "}
                          {action.takenAt}.
                        </li>
                      ),
                    )}
                  </ul>
                  <p className={styles.muted}>
                    {routine.inspection.coverage.recentActions.omitted} recent
                    entries omitted;{" "}
                    {routine.inspection.coverage.runningActions.returned}{" "}
                    running references observed. Their current execution
                    identity is not verified.
                  </p>
                </>
              ) : (
                <p className={styles.muted}>
                  Schedule inspection is currently unavailable.
                </p>
              )}
            </details>
          )}
          <Notice
            tone="success"
            title="Routine drafting stays within the defined scope"
          >
            Outputs are saved to Meri. Any governed action still follows its
            review rules.
          </Notice>
        </>
      )}
      {page?.hasMore && (
        <Button
          disabled={loading}
          variant="outline"
          onClick={() => void read(true)}
        >
          Load more
        </Button>
      )}
    </div>
  );
}
