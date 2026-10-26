"use client";

import { useState } from "react";
import type {
  HillDayDocument,
  HillDayEvent,
} from "../../../../shared/capiro/operations/workspace-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";
import presentation from "./hillday-presentation.module.css";

export function mondayOf(date: Date) {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}
export function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function time(event: HillDayEvent) {
  return new Date(event.startsAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function DirectoryMeetings({
  id,
  onAdded,
}: {
  id: string;
  onAdded: (meeting: { meetingId: string; title: string }) => void;
}) {
  const [search, setSearch] = useState("");
  const members = useCapiroQuery(
    "workspace.hillday.members",
    { query: { q: search } },
    { enabled: search.trim().length >= 2 },
  );
  const add = useCapiroMutation("workspace.hillday.manual");
  async function select(memberId: string, title: string) {
    try {
      const result = await add.run({ params: { id }, body: { memberId } });
      onAdded({ meetingId: result.resolution.meetingId, title });
    } catch {
      /* Keep server errors visible. */
    }
  }
  return (
    <div className={styles.form}>
      <TextInput
        value={search}
        placeholder="Search members by name or state…"
        aria-label="Search congressional members"
        onChange={(event) => setSearch(event.target.value)}
      />
      <p className={styles.footnote}>
        Enter at least two characters to search the Directory.
      </p>
      <StatusPanel
        loading={members.loading}
        error={members.error}
        onRetry={members.reload}
      >
        <div className={styles.clientList}>
          {members.data?.members.map((member) => (
            <div className={styles.clientRow} key={member.memberId}>
              <span>
                {member.memberName ?? member.member}
                <small>
                  {member.party} · {member.state} · {member.chamber}
                </small>
              </span>
              <ActionButton
                disabled={!member.memberId || add.pending}
                onClick={() =>
                  member.memberId &&
                  select(
                    member.memberId,
                    member.member ??
                      member.memberName ??
                      "Congressional meeting",
                  )
                }
              >
                Add meeting
              </ActionButton>
            </div>
          ))}
        </div>
      </StatusPanel>
      {add.error && (
        <p role="alert" className={styles.error}>
          {add.error.message}
        </p>
      )}
    </div>
  );
}

export function HillDayMeetings({
  id,
  clientId,
  onSaved,
  saved,
  onBack,
}: {
  id: string;
  clientId: string;
  saved?: Pick<HillDayDocument, "sections" | "weekStart" | "timeZone">;
  onSaved: (meetings: { meetingId: string; title: string }[]) => void;
  onBack: () => void;
}) {
  const [week, setWeek] = useState(() =>
    saved?.weekStart
      ? new Date(`${saved.weekStart}T00:00:00`)
      : mondayOf(new Date()),
  );
  const [view, setView] = useState("calendar");
  // Core's addManualMeeting emits `manual-${UUID}` event IDs and preserves
  // those rows outside setMeetings' calendar replacement (Core143).
  const [selected, setSelected] = useState<string[]>(
    saved?.sections
      .filter((row) => !row.eventId.startsWith("manual-"))
      .map((row) => row.eventId) ?? [],
  );
  const [manual, setManual] = useState<{ meetingId: string; title: string }[]>(
    saved?.sections
      .filter((row) => row.eventId.startsWith("manual-"))
      .map((row) => ({ meetingId: row.meetingId, title: row.member })) ?? [],
  );
  const [skipped, setSkipped] = useState<string[]>([]);
  const timeZone =
    saved?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const end = new Date(week);
  end.setDate(end.getDate() + 7);
  const calendar = useCapiroQuery("workspace.hillday.calendar", {
    params: { clientId },
    query: {
      from: week.toISOString(),
      to: end.toISOString(),
      timeZone,
    },
  });
  const save = useCapiroMutation("workspace.hillday.meetings");
  const toggle = (eventId: string) =>
    setSelected((previous) =>
      previous.includes(eventId)
        ? previous.filter((value) => value !== eventId)
        : [...previous, eventId],
    );
  async function persist() {
    try {
      const result = await save.run({
        params: { id },
        body: {
          eventIds: selected,
          weekStart: localDate(week),
          timeZone,
        },
      });
      setSkipped(result.skipped);
      if (!result.skipped.length)
        onSaved([
          ...result.meetings.map((row) => ({
            meetingId: row.meetingId,
            title: row.event.subject,
          })),
        ]);
    } catch {
      /* Keep failed input available for retry. */
    }
  }
  function move(days: number) {
    const date = new Date(week);
    date.setDate(date.getDate() + days);
    setWeek(date);
  }
  const events = calendar.data?.events ?? [];
  return (
    <div className={presentation.meetings}>
      <div className={presentation.meetingBody}>
        <div className={presentation.meetingHeading}>
          <h1>Which meetings go in the packet?</h1>
          <div className={presentation.meetingControls}>
            <div className={presentation.controlGroups}>
              <div
                className={presentation.segmented}
                role="group"
                aria-label="Calendar week"
              >
                <ActionButton onClick={() => move(-7)}>‹ Previous</ActionButton>
                <ActionButton onClick={() => setWeek(mondayOf(new Date()))}>
                  This week
                </ActionButton>
                <ActionButton onClick={() => move(7)}>Next ›</ActionButton>
              </div>
              <div
                className={presentation.segmented}
                role="group"
                aria-label="Meeting picker views"
              >
                {["calendar", "list", "directory"].map((mode) => (
                  <button
                    key={mode}
                    aria-pressed={view === mode}
                    onClick={() => setView(mode)}
                  >
                    {mode[0]!.toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <span className={presentation.calendarSummary}>
              Week of {week.toLocaleDateString()} ·{" "}
              {selected.length + manual.length} selected
              {manual.length > 0 && ` · ${manual.length} from the Directory`}
            </span>
          </div>
        </div>
        {calendar.data?.sources
          .filter((source) => source.status !== "ok")
          .map((source) => (
            <p className={styles.notice} key={source.source}>
              {source.source}: {source.detail ?? source.status}
            </p>
          ))}
        {view === "directory" ? (
          <DirectoryMeetings
            id={id}
            onAdded={(meeting) =>
              setManual((previous) => [
                ...previous.filter(
                  (value) => value.meetingId !== meeting.meetingId,
                ),
                meeting,
              ])
            }
          />
        ) : (
          <StatusPanel
            loading={calendar.loading}
            error={calendar.error}
            onRetry={calendar.reload}
          >
            {view === "calendar" ? (
              <div className={styles.calendar}>
                {Array.from({ length: 5 }, (_, index) => {
                  const date = new Date(week);
                  date.setDate(date.getDate() + index);
                  const dayEvents = events.filter(
                    (event) =>
                      new Date(event.startsAt).toDateString() ===
                      date.toDateString(),
                  );
                  return (
                    <section key={index} className={styles.day}>
                      <h3>
                        {date.toLocaleDateString([], {
                          weekday: "short",
                          day: "numeric",
                        })}
                      </h3>
                      {dayEvents.map((event) => (
                        <article key={event.eventId} className={styles.event}>
                          <label>
                            <input
                              type="checkbox"
                              className={presentation.checkbox}
                              checked={selected.includes(event.eventId)}
                              onChange={() => toggle(event.eventId)}
                              aria-label={`Include ${event.subject}`}
                            />
                            {time(event)}
                          </label>
                          <strong>{event.subject}</strong>
                          <span>
                            {event.location ?? "Location to be confirmed"}
                          </span>
                        </article>
                      ))}
                      {!dayEvents.length && <p>No meetings</p>}
                    </section>
                  );
                })}
              </div>
            ) : (
              <DataTable
                rows={events}
                rowKey={(event) => event.eventId}
                caption="Client calendar meetings"
                columns={[
                  {
                    key: "select",
                    label: "INCLUDE",
                    render: (event) => (
                      <input
                        type="checkbox"
                        className={presentation.checkbox}
                        checked={selected.includes(event.eventId)}
                        onChange={() => toggle(event.eventId)}
                        aria-label={`Include ${event.subject}`}
                      />
                    ),
                  },
                  {
                    key: "title",
                    label: "MEETING",
                    render: (event) => event.subject,
                  },
                  {
                    key: "time",
                    label: "TIME",
                    render: (event) => time(event),
                  },
                  {
                    key: "location",
                    label: "LOCATION",
                    render: (event) => event.location ?? "To be confirmed",
                  },
                ]}
              />
            )}
          </StatusPanel>
        )}
        {manual.map((meeting) => (
          <p key={meeting.meetingId}>
            <Badge>Directory</Badge> {meeting.title}
          </p>
        ))}
        {skipped.length > 0 && (
          <p role="alert" className={styles.notice}>
            {skipped.length} selected calendar events became unavailable.
            Refresh the calendar and review the selection.
          </p>
        )}
        {save.error && (
          <p role="alert" className={styles.error}>
            {save.error.message}
          </p>
        )}
      </div>
      <footer className={presentation.wizardFooter}>
        <p>
          <span>{selected.length + manual.length} meetings selected</span>
          {manual.length > 0 && ` (${manual.length} from the Directory)`}
        </p>
        <div className={styles.actions}>
          <ActionButton onClick={onBack}>Back</ActionButton>
          <ActionButton
            primary
            disabled={save.pending || (!selected.length && !manual.length)}
            onClick={persist}
          >
            {save.pending ? "Saving…" : "Resolve attendees →"}
          </ActionButton>
        </div>
      </footer>
    </div>
  );
}
