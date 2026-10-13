"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { PlannerPerson } from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./planner.module.css";
export function TimeSettings({
  open,
  onClose,
  people,
  timeAdmin,
}: {
  open: boolean;
  onClose: () => void;
  people: PlannerPerson[];
  timeAdmin: boolean;
}) {
  const query = useCapiroQuery("planner.time.settings", {}, { enabled: open });
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Time settings"
      description="Organization time rules and reviewer assignments."
    >
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data && (
          <SettingsForm
            key={query.data.version}
            settings={query.data}
            people={people}
            enabled={timeAdmin && query.data.canManage}
            onClose={onClose}
          />
        )}
      </StatusPanel>
    </Modal>
  );
}
type Settings = {
  version: number;
  canManage: boolean;
  reviewers: Record<string, string>;
  options: {
    timeTrackingEnabled: boolean;
    billableEnabled: boolean;
    billableDefault: boolean;
    generalWorkEnabled: boolean;
    approvalProcess: "simple" | "full";
    categories: string[];
    pastLockWeeks: number | null;
    futureWeeks: number | null;
    timeZone: string;
    budgetCurrency?: string;
    submissionReminder?: {
      weekday: number;
      time: string;
      week: "current" | "previous";
    } | null;
  };
};
function SettingsForm({
  settings,
  people,
  enabled,
  onClose,
}: {
  settings: Settings;
  people: PlannerPerson[];
  enabled: boolean;
  onClose: () => void;
}) {
  const api = useCapiro();
  const [options, setOptions] = useState(settings.options),
    [reviewers, setReviewers] = useState(settings.reviewers),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.request("planner.time.settings.update", {
        body: { version: settings.version, options, reviewers },
      });
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save time settings.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className={styles.stack} onSubmit={(event) => void save(event)}>
      <fieldset disabled={!enabled || busy}>
        <legend>Time policy</legend>
        {(
          [
            "timeTrackingEnabled",
            "billableEnabled",
            "billableDefault",
            "generalWorkEnabled",
          ] as const
        ).map((key) => (
          <label key={key} className={styles.checkbox}>
            <input
              type="checkbox"
              checked={options[key]}
              onChange={(event) =>
                setOptions({ ...options, [key]: event.target.checked })
              }
            />
            {key.replace(/([A-Z])/g, " $1")}
          </label>
        ))}
        <Field label="Approval process" htmlFor="time-approval">
          <select
            id="time-approval"
            className={styles.select}
            value={options.approvalProcess}
            onChange={(event) =>
              setOptions({
                ...options,
                approvalProcess: event.target.value as "simple" | "full",
              })
            }
          >
            <option value="simple">Simple</option>
            <option value="full">Full</option>
          </select>
        </Field>
        <Field label="Time zone" htmlFor="time-zone">
          <TextInput
            id="time-zone"
            value={options.timeZone}
            onChange={(event) =>
              setOptions({ ...options, timeZone: event.target.value })
            }
            required
          />
        </Field>
        <ReviewerAssignments
          people={people}
          reviewers={reviewers}
          onChange={setReviewers}
        />
      </fieldset>
      {!enabled && (
        <p className={styles.note}>
          Only organization administrators can change these settings.
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.footer}>
        <ActionButton type="button" onClick={onClose}>
          Close
        </ActionButton>
        <ActionButton primary type="submit" disabled={!enabled || busy}>
          Save settings
        </ActionButton>
      </div>
    </form>
  );
}

function ReviewerAssignments({
  people,
  reviewers,
  onChange: setReviewers,
}: {
  people: PlannerPerson[];
  reviewers: Record<string, string>;
  onChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  return (
    <>
      {" "}
      {people.map((person) => (
        <Field
          key={person.id}
          label={`${person.name} reviewer`}
          htmlFor={`reviewer-${person.id}`}
        >
          <select
            id={`reviewer-${person.id}`}
            className={styles.select}
            value={reviewers[person.id] ?? ""}
            onChange={(event) =>
              setReviewers((old) => {
                const next = { ...old };
                if (event.target.value) next[person.id] = event.target.value;
                else delete next[person.id];
                return next;
              })
            }
          >
            <option value="">Not assigned</option>
            {people
              .filter((item) => item.id !== person.id)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </Field>
      ))}
    </>
  );
}
