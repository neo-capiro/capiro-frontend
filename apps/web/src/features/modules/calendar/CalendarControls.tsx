"use client";

import { ActionButton, TextInput } from "../../../shared/module-ui";
import { agendaSources, type AgendaItem, type AgendaSource } from "./agenda";
import styles from "./calendar.module.css";
import {
  calendarTitle,
  currentCalendarDate,
  shiftCalendarDate,
  type CalendarView,
} from "./range";

type ClientOption = {
  id: string;
  name: string;
  status: string;
  profileStatus: string;
};
export function CalendarHeader({
  clients,
  disabled,
  clientId,
  onClient,
  canCreate,
  onCreate,
}: {
  clients: ClientOption[];
  disabled: boolean;
  clientId: string;
  onClient: (id: string) => void;
  canCreate: boolean;
  onCreate: () => void;
}) {
  return (
    <header className={styles.pageHeader}>
      <div>
        <h1>Master calendar</h1>
        <p>
          Your meetings across client profiles, with preparation, notes and
          debriefs.
        </p>
      </div>
      <div className={styles.actions}>
        <label className={styles.scope}>
          <img
            src="/design/modules/calendar/filter.svg"
            alt=""
            aria-hidden="true"
          />
          <select
            aria-label="Calendar client scope"
            value={clientId}
            onChange={(event) => onClient(event.target.value)}
            disabled={disabled}
          >
            <option value="">Master view</option>
            {clients
              .filter(
                (client) =>
                  client.status !== "ARCHIVED" &&
                  client.profileStatus !== "ARCHIVED",
              )
              .map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
          </select>
          <img
            src="/design/modules/calendar/scope-chevron.svg"
            alt=""
            aria-hidden="true"
          />
        </label>
        <ActionButton primary onClick={onCreate} disabled={!canCreate}>
          New meeting
        </ActionButton>
      </div>
    </header>
  );
}

export function CalendarToolbar({
  date,
  view,
  count,
  loading,
  onDate,
  onView,
  datePicker,
  onDatePicker,
}: {
  date: string;
  view: CalendarView;
  count: number;
  loading: boolean;
  onDate: (date: string) => void;
  onView: (view: CalendarView) => void;
  datePicker: boolean;
  onDatePicker: (open: boolean) => void;
}) {
  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.period}>
          <button
            type="button"
            aria-label="Previous calendar period"
            onClick={() => onDate(shiftCalendarDate(date, view, -1))}
          >
            <img src="/design/modules/calendar/previous.svg" alt="" />
          </button>
          <button type="button" onClick={() => onDate(currentCalendarDate())}>
            Today
          </button>
          <button
            type="button"
            aria-label="Next calendar period"
            onClick={() => onDate(shiftCalendarDate(date, view, 1))}
          >
            <img src="/design/modules/calendar/next.svg" alt="" />
          </button>
        </div>
        <button
          type="button"
          className={styles.title}
          aria-label="Choose calendar date"
          aria-expanded={datePicker}
          onClick={() => onDatePicker(!datePicker)}
        >
          {calendarTitle(date, view)}
        </button>
        <p className={styles.counts}>
          {loading
            ? "Loading events"
            : `${count} ${view === "agenda" ? "items" : "meetings"} in view`}{" "}
          · Eastern time
        </p>
        <div className={styles.views} aria-label="Calendar view">
          {(["month", "week", "agenda"] as const).map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={view === item}
              onClick={() => onView(item)}
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {datePicker && (
        <div className={styles.search}>
          <TextInput
            type="date"
            aria-label="Calendar date"
            value={date}
            onChange={(event) => {
              if (event.target.value) onDate(event.target.value);
            }}
          />
          <ActionButton onClick={() => onDatePicker(false)}>Done</ActionButton>
        </div>
      )}
    </>
  );
}

export function CalendarFilters({
  mixed,
  selected,
  items,
  loading,
  warnings,
  scopeTitle,
  onToggle,
}: {
  mixed: boolean;
  selected: Set<AgendaSource>;
  items: AgendaItem[];
  loading: boolean;
  warnings: string[];
  scopeTitle: string;
  onToggle: (source: AgendaSource) => void;
}) {
  return (
    <div className={styles.filters}>
      {(mixed ? agendaSources : (["Meetings"] as const)).map((source) => {
        const unavailable = warnings.some((warning) =>
          warning.startsWith(`${source} unavailable:`),
        );
        return (
          <button
            type="button"
            key={source}
            className={`${styles.sourceChip} ${styles[source.toLowerCase()]}`}
            aria-pressed={selected.has(source)}
            onClick={() => onToggle(source)}
            title={
              source === "Government"
                ? "Publisher effective dates only; coverage is incomplete. Forecast dates remain unavailable."
                : undefined
            }
          >
            <span className={styles.check}>
              {selected.has(source) && (
                <img src="/design/modules/calendar/check.svg" alt="" />
              )}
            </span>
            {source}
            <span>
              {unavailable
                ? "Unavailable"
                : loading
                  ? "…"
                  : items.filter((item) => item.source === source).length}
            </span>
          </button>
        );
      })}
      <p className={styles.note}>{scopeTitle}</p>
    </div>
  );
}
