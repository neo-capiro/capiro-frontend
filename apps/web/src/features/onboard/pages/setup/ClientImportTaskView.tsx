import { Btn, Icon } from "../../ui/primitives";
import { ImportJobStatusPanel } from "../../ui/ImportJobStatusPanel";
import type { SetupState } from "../../lib/setup";
import {
  importJobAttentionMessage,
  importJobTaskStatus,
  type ImportJobPanelState,
} from "../../lib/import-job-status";
import type { ImportJob } from "../../lib/capiro-api";
import { TaskCard } from "./ExtShell";

export type ClientImportTaskViewProps = {
  state: SetupState;
  latest: {
    panelState: ImportJobPanelState;
    job: ImportJob | null;
    failure: "unavailable" | "error" | null;
    refresh: () => void;
  };
  onOpen: () => void;
  onOpenHistory: () => void;
};

/**
 * Presentational task card. Self-serve completion comes only from item
 * outcomes; managed import keeps the Capiro-admin step while any recorded job
 * is surfaced read-only. No job content survives an unavailable/error read.
 */
export function ClientImportTaskView({
  state: S,
  latest,
  onOpen,
  onOpenHistory,
}: ClientImportTaskViewProps) {
  const tasks = S.tasks,
    cap = S.cap,
    atCap = S.imported >= cap,
    managedImport = S.importMode === "managed";
  const { job, panelState, failure } = latest;
  const inaccessible = failure !== null;
  const jobStatus = job ? importJobTaskStatus(job) : "none";
  const cardStatus = managedImport
    ? job
      ? jobStatus
      : inaccessible
        ? "none"
        : tasks.import
    : jobStatus;
  const attention = job ? importJobAttentionMessage(job) : null;
  const showPanel = job || panelState !== "empty";

  const panel = showPanel ? (
    <ImportJobStatusPanel
      compact
      managed={managedImport}
      state={panelState}
      job={job}
      onRefresh={latest.refresh}
    />
  ) : null;

  if (managedImport)
    return (
      <TaskCard
        num="2"
        title="Import client profiles"
        status={cardStatus}
        desc="Capiro-managed — our team adds your clients for you."
        action={
          <Btn size="sm" onClick={onOpenHistory}>
            View import status
          </Btn>
        }
      >
        <div
          style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}
        >
          {job && job.status === "completed" ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                color: "var(--success)",
                fontWeight: 600,
              }}
            >
              <Icon name="CircleCheck" size={15} />
              Import job complete ({job.counts.successful} of {job.counts.total}{" "}
              items resolved).
            </span>
          ) : inaccessible ? (
            <>
              The current import status cannot be read. An earlier
              Capiro-managed import may already be recorded or still
              unconfirmed; use View import status to retry the read.
            </>
          ) : job ? (
            <>
              Capiro has recorded a client import for this account.{" "}
              {attention ?? "Its durable job status is shown below."}
            </>
          ) : (
            <>
              Capiro will reach out via email within 1 business day to gather
              your client list. This step will be marked completed once your
              clients have been added.
            </>
          )}
          {panel}
        </div>
      </TaskCard>
    );

  return (
    <TaskCard
      num="2"
      title="Import client profiles"
      status={cardStatus}
      desc={`Add your client portfolio. Limit: ${cap} client profiles (${S.plan === "paid" ? "paid" : "trial"}).`}
      action={
        <Btn
          variant={cardStatus === "none" ? "primary" : "secondary"}
          size="sm"
          onClick={() => onOpen()}
        >
          {job == null
            ? "Start Import"
            : job.status === "completed"
              ? "Import more"
              : "Continue Import"}
        </Btn>
      }
    >
      {panel}
      {attention && (
        <p role="status" style={{ margin: "6px 0 0" }}>
          {attention}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          aria-label="Portfolio capacity"
          style={{
            flex: 1,
            height: 5,
            background: "var(--bg-sunken)",
            border: "1px solid var(--border-1)",
            borderRadius: 99,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.min(100, (S.imported / cap) * 100)}%`,
              height: "100%",
              background: atCap ? "var(--notable)" : "var(--accent)",
              borderRadius: 99,
              transition: "width 0.3s ease",
            }}
          ></div>
        </div>
        <span
          style={{
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            letterSpacing: 0,
            color: "var(--ink-2)",
          }}
        >
          Portfolio capacity: {S.imported} of {cap} client profiles
        </span>
      </div>
    </TaskCard>
  );
}
