"use client";

import { useId, useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  SelectInput,
  TextInput,
} from "../../../../shared/module-ui";
import {
  bindMeetingFacts,
  createFactsDraft,
  prepareFactsChanges,
  savedEndpoint,
  type EndpointDraft,
  type FactsDraft,
  type SavedMeetingFacts,
} from "./meeting-facts-draft";
import presentation from "./hillday-correction.module.css";
import styles from "./hillday-meeting-facts.module.css";

function EndpointFields({
  label,
  value,
  zone,
  draft,
  result,
  disabled,
  prefix,
  onChange,
}: {
  label: string;
  value: string;
  zone: string;
  draft: EndpointDraft;
  result: ReturnType<typeof prepareFactsChanges>["start"];
  disabled: boolean;
  prefix: string;
  onChange: (value: EndpointDraft) => void;
}) {
  const saved = savedEndpoint(value, zone);
  return (
    <fieldset className={styles.endpoint} disabled={disabled}>
      <legend>{label}</legend>
      {saved.editable ? (
        <>
          <div className={styles.dateTime}>
            <Field label={`${label} date`} htmlFor={`${prefix}-date`}>
              <TextInput
                id={`${prefix}-date`}
                type="date"
                value={draft.date}
                aria-describedby={`${prefix}-offset`}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    date: event.target.value,
                    occurrence: "",
                  })
                }
              />
            </Field>
            <Field label={`${label} time`} htmlFor={`${prefix}-time`}>
              <TextInput
                id={`${prefix}-time`}
                type="time"
                step="0.001"
                value={draft.time}
                aria-describedby={`${prefix}-offset`}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    time: event.target.value,
                    occurrence: "",
                  })
                }
              />
            </Field>
          </div>
          <p id={`${prefix}-offset`} className={styles.hint}>
            {result.offset
              ? `UTC${result.offset.replace("-", "−")}`
              : "UTC offset awaits a valid time and occurrence."}
          </p>
          {result.choices && (
            <Field
              label={`${label} occurrence`}
              htmlFor={`${prefix}-occurrence`}
            >
              <SelectInput
                id={`${prefix}-occurrence`}
                value={draft.occurrence}
                disabled={disabled}
                placeholder="Choose occurrence"
                options={result.choices.map((choice, index) => ({
                  value: choice.value,
                  label: `${index === 0 ? "First" : "Second"} occurrence · UTC${choice.offset.replace("-", "−")}`,
                }))}
                onValueChange={(occurrence) =>
                  onChange({
                    ...draft,
                    occurrence: occurrence as EndpointDraft["occurrence"],
                  })
                }
              />
            </Field>
          )}
          {result.error && (
            <p role="alert" className={styles.error}>
              {result.error}
            </p>
          )}
        </>
      ) : (
        <>
          <p className={styles.exact}>{value}</p>
          <p className={styles.hint}>
            This saved precision cannot be edited with these date/time controls.
            Its exact value will be preserved.
          </p>
        </>
      )}
    </fieldset>
  );
}

export function HillDayMeetingFactsDialog({
  id,
  meetingId,
  eventId,
  onClose,
  onSaved,
}: {
  id: string;
  meetingId: string;
  eventId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const prefix = useId();
  const query = useCapiroQuery("workspace.hillday.resolution", {
    params: { id },
  });
  const correction = useCapiroMutation("workspace.hillday.correction");
  const [snapshot, setSnapshot] = useState<{
    facts: SavedMeetingFacts;
    draft: FactsDraft;
  } | null>(null);
  const [unconfirmed, setUnconfirmed] = useState<string>();
  let facts: SavedMeetingFacts | null | undefined;
  let readError = query.error?.message;
  if (query.data && !query.loading && !readError) {
    try {
      facts = bindMeetingFacts(query.data, id, meetingId, eventId);
    } catch (cause) {
      readError = (cause as Error).message;
    }
  }
  // The query owner clears replaced input/session reads immediately. Retire the
  // privileged draft with them; never seed from POST or a displayed office room.
  if (snapshot && !facts) setSnapshot(null);
  if (!snapshot && facts)
    setSnapshot({ facts, draft: createFactsDraft(facts) });
  const current = facts ? snapshot : null;
  const prepared = current
    ? prepareFactsChanges(current.facts, current.draft)
    : null;
  const canSave =
    !!prepared?.changed &&
    !prepared.errors.length &&
    !correction.pending &&
    !unconfirmed;
  const update = (patch: Partial<FactsDraft>) =>
    setSnapshot(
      (value) => value && { ...value, draft: { ...value.draft, ...patch } },
    );
  function refresh() {
    if (correction.pending) return;
    setSnapshot(null);
    setUnconfirmed(undefined);
    correction.reset();
    query.reload();
  }
  async function save() {
    if (!canSave || !prepared) return;
    try {
      const result = await correction.run({
        params: { id, meetingId },
        body: { kind: "edit_meeting_facts", ...prepared.changes },
      });
      if (
        result.resolution.meetingId !== meetingId ||
        result.resolution.eventId !== eventId ||
        result.event.eventId !== eventId
      )
        throw new Error("The returned correction did not match this meeting.");
      onSaved();
      onClose();
    } catch (cause) {
      setUnconfirmed(
        `${cause instanceof Error ? cause.message : "The save failed."} The save was not confirmed. Refresh saved details before trying again.`,
      );
    }
  }
  return (
    <Modal
      open
      title="Edit meeting details"
      className={presentation.dialog}
      onOpenChange={(open) => {
        if (!open && !correction.pending) onClose();
      }}
      closeDisabled={correction.pending}
      footer={
        <>
          <ActionButton disabled={correction.pending} onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton
            primary
            type="submit"
            form={`${prefix}-form`}
            disabled={!canSave}
          >
            {correction.pending ? "Saving…" : "Save details"}
          </ActionButton>
        </>
      }
    >
      <div className={styles.content}>
        {query.loading && <p role="status">Loading saved meeting details…</p>}
        {readError && (
          <p role="alert" className={styles.error}>
            {readError}
          </p>
        )}
        {!query.loading && !readError && facts === null && (
          <p role="status">
            Saved meeting details are unavailable. Refresh to check again.
          </p>
        )}
        {current && prepared && (
          <form
            id={`${prefix}-form`}
            className={styles.panel}
            data-design-node="1064:258947"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <Field label="Subject" htmlFor={`${prefix}-subject`}>
              <TextInput
                id={`${prefix}-subject`}
                value={current.draft.subject}
                maxLength={240}
                disabled={correction.pending}
                onChange={(event) => update({ subject: event.target.value })}
              />
            </Field>
            <Field
              label="Location"
              htmlFor={`${prefix}-location`}
              description={
                current.facts.location === null
                  ? "No location saved"
                  : undefined
              }
            >
              <TextInput
                id={`${prefix}-location`}
                value={current.draft.location}
                maxLength={240}
                disabled={correction.pending}
                onChange={(event) => update({ location: event.target.value })}
              />
            </Field>
            <dl className={styles.timezone}>
              <dt>Meeting timezone</dt>
              <dd>{current.facts.timeZone}</dd>
            </dl>
            <p className={styles.hint}>
              Times are shown in the saved meeting timezone. The UTC offset is
              shown for each time.
            </p>
            <div className={styles.endpoints}>
              <EndpointFields
                label="Start"
                prefix={`${prefix}-start`}
                value={current.facts.startsAt}
                zone={current.facts.timeZone}
                draft={current.draft.start}
                result={prepared.start}
                disabled={correction.pending}
                onChange={(start) => update({ start })}
              />
              <EndpointFields
                label="End"
                prefix={`${prefix}-end`}
                value={current.facts.endsAt}
                zone={current.facts.timeZone}
                draft={current.draft.end}
                result={prepared.end}
                disabled={correction.pending}
                onChange={(end) => update({ end })}
              />
            </div>
            {prepared.errors
              .filter(
                (error) =>
                  !error.startsWith("Start:") && !error.startsWith("End:"),
              )
              .map((error) => (
                <p key={error} role="alert" className={styles.error}>
                  {error}
                </p>
              ))}
          </form>
        )}
        {unconfirmed && (
          <p role="alert" className={styles.error}>
            {unconfirmed}
          </p>
        )}
        <ActionButton disabled={correction.pending} onClick={refresh}>
          {prepared?.changed
            ? "Discard changes and refresh"
            : "Refresh saved details"}
        </ActionButton>
      </div>
    </Modal>
  );
}
