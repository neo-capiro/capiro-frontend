import { Btn, Icon } from "../../ui/primitives";
import { ImportJobStatusPanel } from "../../ui/ImportJobStatusPanel";
import { type SetupState } from "../../lib/setup";
import { useCapiroApi } from "../../lib/capiro-api";
import { useLatestImportJob } from "../../lib/use-import-job-reads";
import {
  importJobAttentionMessage,
  importJobTaskStatus,
} from "../../lib/import-job-status";
import { TaskCard } from "./ExtShell";
export function ClientImportTask({
  state: S,
  onOpen,
}: {
  state: SetupState;
  onOpen: () => void;
}) {
  const api = useCapiroApi();
  const latest = useLatestImportJob(api);
  const tasks = S.tasks,
    cap = S.cap,
    atCap = S.imported >= cap,
    managedImport = S.importMode === "managed";
  const job = latest.job;
  const jobStatus = job ? importJobTaskStatus(job) : "none";
  // Self-serve completion comes ONLY from item outcomes. Managed import keeps
  // the Capiro-admin setup transition; a recorded job still shows its own state.
  const cardStatus = managedImport
    ? job
      ? jobStatus
      : tasks.import
    : jobStatus;
  const attention = job ? importJobAttentionMessage(job) : null;
  const statusPanel =
    job || (!managedImport && latest.panelState !== "empty") ? (
      <ImportJobStatusPanel
        compact
        managed={managedImport}
        state={latest.panelState}
        job={job}
        onRefresh={() => void latest.refresh()}
      />
    ) : null;
  return managedImport ? (
    <TaskCard
      num="2"
      title="Import client profiles"
      status={cardStatus}
      desc="Capiro-managed — our team adds your clients for you."
    >
      <div
        style={{
          fontSize: 12.5,
          color: "var(--ink-2)",
          lineHeight: 1.55,
        }}
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
        ) : job ? (
          <>
            Capiro has recorded a client import for this account.{" "}
            {attention ?? "Its durable job status is shown below."}
          </>
        ) : (
          <>
            Capiro will reach out via email within 1 business day to gather your
            client list. This step will be marked completed once your clients
            have been added.
          </>
        )}
        {statusPanel}
      </div>
    </TaskCard>
  ) : (
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
      {statusPanel}
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
