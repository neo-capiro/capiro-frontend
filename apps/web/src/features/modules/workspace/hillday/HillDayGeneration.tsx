"use client";

import { useState } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Panel,
  StatusPanel,
} from "../../../../shared/module-ui";
import {
  useHillDayGeneration,
  type HillDayGenerationScope,
} from "./hillday-generation-state";
import styles from "../workspace.module.css";

export function HillDayGeneration({
  id,
  clientId,
  onOpen,
}: {
  id: string;
  clientId: string;
  onOpen: () => void;
}) {
  const me = useCapiroQuery("me.read", {});
  const scope = me.data && {
    tenantId: me.data.tenant.id,
    userId: me.data.user.id,
    actorId: me.data.user.clerkUserId,
    documentId: id,
    clientId,
  };
  return (
    <StatusPanel loading={me.loading} error={me.error} onRetry={me.reload}>
      {scope && (
        <GenerationSession
          key={JSON.stringify(scope)}
          scope={scope}
          onOpen={onOpen}
        />
      )}
    </StatusPanel>
  );
}

function GenerationSession({
  scope,
  onOpen,
}: {
  scope: HillDayGenerationScope;
  onOpen: () => void;
}) {
  const state = useHillDayGeneration(scope);
  const [unknownConsent, setUnknownConsent] = useState(false);
  const { journal, job, active, pending } = state;
  if (!journal.ready)
    return (
      <StatusPanel
        loading={journal.loading}
        error={journal.error}
        onRetry={journal.retry}
      />
    );
  const retained = Boolean(journal.record);
  const unknownUnits = job?.units.some((unit) => unit.state === "unknown");
  const retryable =
    job &&
    !active &&
    job.units.some(
      (unit) => unit.state === "failed" || unit.state === "unknown",
    );
  return (
    <div className={styles.form}>
      <Panel
        title={
          retained
            ? "Generation start unconfirmed"
            : job?.status === "cancelled"
              ? "Generation cancelled"
              : active
                ? "Building your packet"
                : job?.status === "complete"
                  ? "Your packet is ready"
                  : job?.status === "failed"
                    ? "Generation needs attention"
                    : state.noJob
                      ? "Ready to generate"
                      : "Generation progress"
        }
        description="Workspace creates a section for each selected meeting and keeps source gaps visible."
      >
        {retained && (
          <p role="status">
            The original generation request is retained. Reading the latest job
            cannot confirm that request. Recover it explicitly; no automatic
            retry will run.
          </p>
        )}
        {state.controlUncertain && (
          <p role="status">
            The command acknowledgement is unknown. Read current progress before
            deciding on another action.
          </p>
        )}
        {job?.cancelRequestedAt && active && (
          <p role="status">
            Cancellation requested. Work already in flight may finish. Waiting
            for Workspace to report a terminal result.
          </p>
        )}
        {unknownUnits && (
          <p className={styles.notice}>
            Some provider outcomes are unknown. Work may already have happened;
            a deliberate retry can repeat that work.
          </p>
        )}
        {retryable && unknownUnits && (
          <label>
            <input
              type="checkbox"
              checked={unknownConsent}
              onChange={(event) => setUnknownConsent(event.target.checked)}
            />
            I understand that retrying unknown units may repeat provider work.
          </label>
        )}
        <div className={styles.actions}>
          {state.noJob && !retained && (
            <ActionButton
              primary
              disabled={pending || Boolean(state.error)}
              onClick={state.generate}
            >
              Generate packet
            </ActionButton>
          )}
          {retained && (
            <ActionButton primary disabled={pending} onClick={state.replay}>
              Recover original generation request
            </ActionButton>
          )}
          <ActionButton disabled={pending} onClick={state.refresh}>
            Refresh progress
          </ActionButton>
          {retryable && (
            <ActionButton
              disabled={
                pending ||
                retained ||
                state.controlUncertain ||
                Boolean(state.error) ||
                Boolean(unknownUnits && !unknownConsent)
              }
              onClick={async () => {
                await state.control("retry");
                setUnknownConsent(false);
              }}
            >
              Retry failed and unknown units
            </ActionButton>
          )}
          {active && !job?.cancelRequestedAt && (
            <ActionButton
              disabled={
                pending ||
                retained ||
                state.controlUncertain ||
                Boolean(state.error)
              }
              onClick={() => state.control("cancel")}
            >
              Request cancellation
            </ActionButton>
          )}
          {job && !active && !retained && (
            <ActionButton primary onClick={onOpen}>
              Open document →
            </ActionButton>
          )}
        </div>
        {state.error && (
          <p role="alert" className={styles.error}>
            {state.error}
          </p>
        )}
        {state.message && <p role="status">{state.message}</p>}
        {state.loading && !job && (
          <p role="status">Reading saved generation progress…</p>
        )}
        {state.noJob && !retained && <p>No saved generation job.</p>}
      </Panel>
      {job && (
        <>
          <p
            className={
              job.status === "complete" ? styles.success : styles.notice
            }
          >
            {job.status}
            {job.quality !== null ? ` · Quality ${job.quality}%` : ""}
            {job.error ? ` · ${job.error}` : ""}
          </p>
          <DataTable
            rows={job.units}
            rowKey={(row) => row.meetingId}
            caption="Generation progress by meeting"
            columns={[
              {
                key: "meeting",
                label: "MEETING",
                render: (row) => row.meetingId,
              },
              {
                key: "state",
                label: "STATE",
                render: (row) => (
                  <Badge
                    tone={
                      row.state === "done"
                        ? "success"
                        : ["failed", "unknown"].includes(row.state)
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {row.state}
                  </Badge>
                ),
              },
              {
                key: "reason",
                label: "DETAIL",
                render: (row) => row.reason ?? "—",
              },
              { key: "at", label: "UPDATED", render: (row) => row.at },
            ]}
          />
        </>
      )}
    </div>
  );
}
