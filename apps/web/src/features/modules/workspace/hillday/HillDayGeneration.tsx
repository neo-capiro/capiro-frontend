"use client";

import { useState } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { ActionButton, StatusPanel } from "../../../../shared/module-ui";
import {
  useHillDayGeneration,
  type HillDayGenerationScope,
} from "./hillday-generation-state";
import styles from "./hillday-presentation.module.css";

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
  const settled =
    job?.units.filter(
      (unit) => unit.state === "done" || unit.state === "failed",
    ).length ?? 0;
  const progress = job?.units.length
    ? Math.round((100 * settled) / job.units.length)
    : 0;
  return (
    <div className={styles.form}>
      <section
        className={styles.generationCard}
        aria-label="Generation progress"
        data-design-node="1064:259246"
      >
        <header className={styles.generationHeader}>
          <span className={styles.generationIcon} aria-hidden>
            ✦
          </span>
          <div>
            <h3>
              {retained
                ? "Generation start unconfirmed"
                : job?.status === "cancelled"
                  ? "Generation cancelled"
                  : active
                    ? "Meri is drafting the packet"
                    : job?.status === "complete"
                      ? "Your packet is ready"
                      : job?.status === "failed"
                        ? "Generation needs attention"
                        : state.noJob
                          ? "Ready to generate"
                          : "Generation progress"}
            </h3>
            <p>Assembling Directory, Portfolio and Intelligence per meeting.</p>
          </div>
          {job && <strong className={styles.progressValue}>{progress}%</strong>}
        </header>
        {job && (
          <>
            <progress
              className={styles.progress}
              value={settled}
              max={job.units.length || 1}
              aria-label="Settled meeting sections"
            />
            <ol
              className={styles.units}
              aria-label="Generation progress by meeting"
            >
              {job.units.map((unit, index) => (
                <li
                  key={unit.meetingId}
                  className={styles.unit}
                  data-state={unit.state}
                >
                  <span aria-hidden className={styles.unitIcon}>
                    {unit.state === "done"
                      ? "✓"
                      : unit.state === "running"
                        ? "↻"
                        : ["failed", "unknown"].includes(unit.state)
                          ? "⚠"
                          : "○"}
                  </span>
                  <span className={styles.unitName}>Meeting {index + 1}</span>
                  <span className={styles.unitDetail}>
                    {unit.state === "done"
                      ? "Completed"
                      : unit.state === "running"
                        ? "Drafting…"
                        : unit.state === "unknown"
                          ? "Outcome unknown"
                          : unit.state === "failed"
                            ? "Unavailable"
                            : "Queued"}
                    {unit.reason ? ` · ${unit.reason}` : ""}
                  </span>
                </li>
              ))}
            </ol>
            <p className={styles.caption}>
              Focus and Background are drafted per meeting. Unavailable sections
              keep their reasons; unknown outcomes are not counted as settled.
            </p>
            {job.quality !== null && (
              <p className={styles.caption}>Quality {job.quality}%</p>
            )}
            {job.error && <p className={styles.notice}>{job.error}</p>}
          </>
        )}
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
      </section>
    </div>
  );
}
