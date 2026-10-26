"use client";
import { useState } from "react";
import { Button } from "@capiro/ui/button";
import type { RoutinesPrepareRequest } from "@capiro/meri-contracts/routines-application";
import { FormField } from "../ui/FormField";
import { Panel } from "../ui/Panel";
import styles from "../ui/meri-ui.module.css";

/** Explicit complete choices; an existing list's timing summary never reconstructs an old routine. */
export function RoutineForm({
  scheduleId,
  disabled,
  prepare,
  close,
}: {
  scheduleId?: string;
  disabled: boolean;
  prepare: (request: RoutinesPrepareRequest) => void;
  close: () => void;
}) {
  const [draft, setDraft] = useState({
    instructions: "",
    destination: "",
    time: "09:00",
    frequency: "daily",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    cost: "",
    seconds: "",
    retries: "0",
    catchup: "60",
    count: "",
    note: "",
  });
  const [pauseOnFailure, setPauseOnFailure] = useState(true);
  const [paused, setPaused] = useState(false);
  const [runNow, setRunNow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = (key: keyof typeof draft, label: string, multiline = false) => (
    <FormField
      label={label}
      value={draft[key]}
      multiline={multiline}
      onChange={(value) =>
        setDraft((current) => ({ ...current, [key]: value }))
      }
    />
  );
  function submit() {
    try {
      const [hour, minute] = draft.time.split(":").map(Number);
      const cost = Number(draft.cost),
        seconds = Number(draft.seconds),
        retries = Number(draft.retries),
        catchup = Number(draft.catchup);
      const count = draft.count.trim() ? Number(draft.count) : null;
      if (
        !/^\d{2}:\d{2}$/.test(draft.time) ||
        hour! > 23 ||
        minute! > 59 ||
        !draft.instructions.trim() ||
        !draft.destination.trim() ||
        !draft.cost.trim() ||
        !draft.seconds.trim() ||
        !Number.isFinite(cost) ||
        cost <= 0 ||
        ![seconds, retries, catchup].every(Number.isSafeInteger) ||
        seconds <= 0 ||
        retries < 0 ||
        catchup < 0 ||
        (count !== null && (!Number.isSafeInteger(count) || count < 1))
      )
        throw new Error(
          "Enter valid instructions, destination, time and per-run limits.",
        );
      new Intl.DateTimeFormat("en", { timeZone: draft.timezone }).format();
      const request = {
        taskInstruction: draft.instructions.trim(),
        destinationReference: draft.destination.trim(),
        requestedLimits: {
          maxCostMicrousd: Math.round(cost * 1_000_000),
          maxRuntimeSeconds: seconds,
          retryLimit: retries,
        },
        policy: {
          spec: {
            calendars: [],
            intervals: [],
            cronExpressions: [
              `${minute} ${hour} * * ${draft.frequency === "weekdays" ? "1-5" : "*"}`,
            ],
            skip: [],
            startAt: null,
            endAt: null,
            jitterMs: 0,
            timezone: draft.timezone,
          },
          overlap: "SKIP" as const,
          catchupWindowMs: catchup * 60_000,
          pauseOnFailure,
          remainingActions: count,
          paused,
          note: draft.note,
          runNow,
          runNowOverlap: "ALLOW_ALL" as const,
        },
      };
      setError(null);
      prepare(
        scheduleId
          ? {
              requestId: crypto.randomUUID(),
              operation: "update_scheduled_task",
              request: { ...request, scheduleId },
            }
          : {
              requestId: crypto.randomUUID(),
              operation: "schedule_task",
              request,
            },
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Check the routine fields.",
      );
    }
  }
  return (
    <Panel label={scheduleId ? "Edit or resume routine" : "New routine"}>
      <form
        aria-label="Routine choices"
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled) submit();
        }}
      >
        {scheduleId && (
          <p>
            This replaces the routine with the complete choices below. Enter the
            instructions, timing and limits you want; the list does not contain
            the original requested settings.
          </p>
        )}
        <fieldset disabled={disabled}>
          {field("instructions", "Instructions", true)}
          {field("destination", "Output destination")}
          <label>
            Frequency{" "}
            <select
              value={draft.frequency}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  frequency: event.target.value,
                }))
              }
            >
              <option value="daily">Every day</option>
              <option value="weekdays">Weekdays</option>
            </select>
          </label>
          {field("time", "Time (HH:MM)")}
          {field("timezone", "Timezone")}
          {field("cost", "Maximum cost per run (USD)")}
          {field("seconds", "Maximum runtime per run (seconds)")}
          {field("retries", "Retry limit")}
          {field("catchup", "Catch-up window (minutes)")}
          {field("count", "Number of runs (blank for no count limit)")}
          {field("note", "Note")}
          <label>
            <input
              type="checkbox"
              checked={pauseOnFailure}
              onChange={(event) => setPauseOnFailure(event.target.checked)}
            />{" "}
            Pause after failure
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              checked={paused}
              onChange={(event) => setPaused(event.target.checked)}
            />{" "}
            Keep routine paused
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              checked={runNow}
              onChange={(event) => setRunNow(event.target.checked)}
            />{" "}
            Also run immediately after approval (may overlap existing work)
          </label>
          <p>
            Overlapping scheduled occurrences are skipped. No start/end date or
            random delay is added. The service may lower requested limits;
            review the effective limits before approving.
          </p>
        </fieldset>
        {error && <p role="alert">{error}</p>}
        <div className={styles.row}>
          <Button type="submit" disabled={disabled}>
            Prepare routine for review
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={close}
          >
            Close editor
          </Button>
        </div>
      </form>
    </Panel>
  );
}

export function RoutineCancellation({
  scheduleId,
  disabled,
  prepare,
  close,
  initialMode = "pause",
}: {
  scheduleId: string;
  disabled: boolean;
  prepare: (request: RoutinesPrepareRequest) => void;
  close: () => void;
  /** Figma 08.01 opens this from either Pause or Cancel routine; the change stays reviewable here. */
  initialMode?: "pause" | "delete";
}) {
  const [mode, setMode] = useState<"pause" | "delete">(initialMode);
  const [note, setNote] = useState("");
  return (
    <Panel label="Pause or cancel routine">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled)
            prepare({
              requestId: crypto.randomUUID(),
              operation: "cancel_scheduled_task",
              request: { scheduleId, mode, note, running: "leave", runs: [] },
            });
        }}
      >
        <p>
          Routine: {scheduleId}. This changes future scheduling. Existing
          running work is left running.
        </p>
        <label>
          Change{" "}
          <select
            disabled={disabled}
            value={mode}
            onChange={(event) =>
              setMode(event.target.value as "pause" | "delete")
            }
          >
            <option value="pause">Pause future runs</option>
            <option value="delete">Cancel future scheduling</option>
          </select>
        </label>
        <FormField label="Reason" value={note} onChange={setNote} />
        <Button type="submit" disabled={disabled}>
          Prepare change for review
        </Button>{" "}
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={close}
        >
          Close
        </Button>
      </form>
    </Panel>
  );
}
