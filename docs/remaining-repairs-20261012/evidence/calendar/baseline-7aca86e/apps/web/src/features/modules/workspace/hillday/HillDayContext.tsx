"use client";

import { useEffect, useState } from "react";
import type { HillDayContext as Context } from "../../../../shared/capiro/operations/workspace-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  Panel,
  SelectInput,
  StatusPanel,
  TextArea,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";

type Navigation = { meetingId?: string; lookback?: number; continue?: true };
const windowOptions = [30, 90, 180, 365].map((value) => ({
  value: String(value),
  label: value === 365 ? "Last year" : `Last ${value} days`,
}));

function ContextEditor({
  id,
  context,
  onDirty,
  onWindow,
}: {
  id: string;
  context: Context;
  onDirty: (dirty: boolean) => void;
  onWindow: (days: number) => void;
}) {
  const [note, setNote] = useState(context.record?.note ?? "");
  const [units, setUnits] = useState(
    context.units.filter((unit) => unit.selected).map((unit) => unit.id),
  );
  const [threadIds, setThreadIds] = useState(context.record?.threadIds ?? []);
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify([note, units, threadIds]),
  );
  const dirty = baseline !== JSON.stringify([note, units, threadIds]);
  const save = useCapiroMutation("workspace.hillday.context.save");
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  const toggle = (values: string[], value: string) =>
    values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value];

  async function persist() {
    try {
      await save.run({
        params: { id, meetingId: context.meetingId },
        body: {
          note,
          threadIds,
          lookbackDays: context.lookbackDays,
          carry: {
            committees: context.units.some(
              (unit) => unit.kind === "committees" && units.includes(unit.id),
            ),
            bio: context.units.some(
              (unit) => unit.kind === "bio" && units.includes(unit.id),
            ),
            issueAreas: context.units
              .filter(
                (unit) => unit.kind === "issue_area" && units.includes(unit.id),
              )
              .map((unit) => unit.id),
            staffers: context.units
              .filter(
                (unit) => unit.kind === "staffer" && units.includes(unit.id),
              )
              .map((unit) => unit.id.replace(/^staffer:/, "")),
          },
        },
      });
      setBaseline(JSON.stringify([note, units, threadIds]));
    } catch {
      /* Keep failed edits available for retry. */
    }
  }

  return (
    <div className={styles.contextPanels}>
      <Panel
        title="What the record already carries"
        description="Tick what should reach the draft. Anything left unticked stays in the Directory record."
      >
        <strong>{context.member?.member ?? "Office to be confirmed"}</strong>
        {context.units.map((unit) => (
          <label key={unit.id} className={styles.check}>
            <input
              type="checkbox"
              checked={units.includes(unit.id)}
              disabled={save.pending}
              onChange={() => setUnits((previous) => toggle(previous, unit.id))}
            />
            <span>
              {unit.label}
              <small>
                {unit.detail ?? (!unit.known ? "No Directory record" : "")}
              </small>
            </span>
          </label>
        ))}
      </Panel>
      <Panel
        title="Your context for this meeting"
        description="What the platform does not have"
      >
        <Field label="Meeting context" htmlFor="hillday-context-note">
          <TextArea
            id="hillday-context-note"
            disabled={save.pending}
            maxLength={4000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
      </Panel>
      <Panel
        title="Correspondence"
        actions={
          <SelectInput
            aria-label="Correspondence lookback"
            disabled={save.pending}
            value={String(context.lookbackDays)}
            onValueChange={(value) => onWindow(Number(value))}
            options={windowOptions}
          />
        }
      >
        {context.threads.map((thread) => (
          <label key={thread.id} className={styles.check}>
            <input
              type="checkbox"
              disabled={save.pending}
              checked={threadIds.includes(thread.id)}
              onChange={() =>
                setThreadIds((previous) => toggle(previous, thread.id))
              }
            />
            <span>
              {thread.subject}
              <small>
                {thread.participants.join(", ")} · {thread.messageCount}{" "}
                messages · {thread.ageDays ?? "Unknown"} days
              </small>
            </span>
          </label>
        ))}
        {!context.threads.length && (
          <p className={styles.footnote}>
            No correspondence found in this window.
          </p>
        )}
      </Panel>
      {context.sources
        .filter((source) => source.status !== "ok")
        .map((source) => (
          <p key={source.source} className={styles.notice}>
            {source.source}: {source.detail ?? source.status}
          </p>
        ))}
      {save.error && (
        <p role="alert" className={styles.error}>
          {save.error.message}
        </p>
      )}
      {save.data && (
        <p className={styles.success}>
          Context saved · {save.data.sourceCount} sources selected
        </p>
      )}
      <ActionButton disabled={save.pending} onClick={persist}>
        {save.pending ? "Saving…" : "Save meeting context"}
      </ActionButton>
    </div>
  );
}

export function HillDayContext({
  id,
  meetings,
  onContinue,
}: {
  id: string;
  meetings: { meetingId: string; title: string }[];
  onContinue: () => void;
}) {
  const [selected, setSelected] = useState(meetings[0]?.meetingId ?? "");
  const [lookback, setLookback] = useState<number>();
  const [dirty, setDirty] = useState(false);
  const [navigation, setNavigation] = useState<Navigation>();
  const query = useCapiroQuery(
    "workspace.hillday.context",
    { params: { id, meetingId: selected }, query: { lookbackDays: lookback } },
    { enabled: Boolean(selected) },
  );
  function navigate(next: Navigation) {
    if (dirty) {
      setNavigation(next);
      return;
    }
    apply(next);
  }
  function apply(next: Navigation) {
    setNavigation(undefined);
    setDirty(false);
    if (next.continue) onContinue();
    else if (next.meetingId) {
      setSelected(next.meetingId);
      setLookback(undefined);
    } else if (next.lookback) setLookback(next.lookback);
  }
  return (
    <>
      <div className={styles.contextLayout}>
        <nav
          className={styles.meetingNav}
          aria-label="Meeting context selection"
        >
          {meetings.map((meeting) => (
            <button
              key={meeting.meetingId}
              aria-current={selected === meeting.meetingId}
              onClick={() =>
                meeting.meetingId !== selected &&
                navigate({ meetingId: meeting.meetingId })
              }
            >
              {meeting.title}
            </button>
          ))}
        </nav>
        <StatusPanel
          loading={query.loading}
          error={query.error}
          onRetry={query.reload}
        >
          {query.data && (
            <ContextEditor
              key={`${query.data.meetingId}:${query.data.lookbackDays}`}
              id={id}
              context={query.data}
              onDirty={setDirty}
              onWindow={(days) => navigate({ lookback: days })}
            />
          )}
        </StatusPanel>
      </div>
      <div className={styles.actions} style={{ marginTop: 24 }}>
        <ActionButton primary onClick={() => navigate({ continue: true })}>
          Generate packet →
        </ActionButton>
        <span className={styles.footnote}>
          Context is optional. Save each meeting’s edits before continuing.
        </span>
      </div>
      <Modal
        open={Boolean(navigation)}
        onOpenChange={(open) => {
          if (!open) setNavigation(undefined);
        }}
        title="Leave unsaved meeting context?"
        description="Save the current meeting before changing meetings or the correspondence window."
        footer={
          <>
            <ActionButton onClick={() => setNavigation(undefined)}>
              Keep editing
            </ActionButton>
            <ActionButton
              primary
              onClick={() => navigation && apply(navigation)}
            >
              Discard unsaved edits
            </ActionButton>
          </>
        }
      >
        <p>The last saved context remains attached to the packet.</p>
      </Modal>
    </>
  );
}
