"use client";

import { Temporal } from "temporal-polyfill";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { moveDate, validDay, zones } from "./range";
import type { CalendarKind } from "./contracts";
import type { CalendarPageState } from "./useCalendarPageState";
import clientStyles from "./calendar-client.module.css";

function clientName(state: CalendarPageState) {
  return (
    state.currentClients.find((client) => client.id === state.scope)?.name ??
    "Client"
  );
}

function periodLabel(date: string, view: CalendarPageState["view"]) {
  const day = Temporal.PlainDate.from(date);
  if (view === "week") {
    const monday = day.subtract({ days: day.dayOfWeek - 1 });
    const sunday = monday.add({ days: 6 });
    return monday.month === sunday.month
      ? `${monday.toLocaleString("en-US", { month: "long" })} ${monday.day} to ${sunday.day}, ${sunday.year}`
      : `${monday.toLocaleString("en-US", { month: "short", day: "numeric" })} to ${sunday.toLocaleString("en-US", { month: "short", day: "numeric" })}, ${sunday.year}`;
  }
  return day.toLocaleString("en-US", { month: "long", year: "numeric" });
}

const zoneLabels: Record<CalendarPageState["zone"], string> = {
  "America/New_York": "Eastern time",
  "America/Chicago": "Central time",
  "America/Denver": "Mountain time",
  "America/Los_Angeles": "Pacific time",
  "Pacific/Honolulu": "Hawaii time",
  UTC: "UTC",
};

export function CalendarPageHeader({
  clientId,
  state,
}: {
  clientId?: string;
  state: CalendarPageState;
}) {
  const {
    scope,
    meetingScopeAvailable,
    update,
    setCreating,
    setSyncReview,
    syncScope,
  } = state;
  if (clientId) {
    const name = clientName(state);
    return (
      <header className={`${clientStyles.clientHeader} pageHeader`}>
        <div>
          <nav
            className={clientStyles.clientBreadcrumb}
            aria-label="Breadcrumb"
          >
            <Link href="/portfolio">Portfolio</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/portfolio/${clientId}`}>{name}</Link>
            <span aria-hidden="true">/</span>
            <span>Calendar</span>
          </nav>
          <h1>{name} meetings</h1>
          <p className="muted">Meeting preparation, notes and debriefs.</p>
        </div>
        <div className={clientStyles.clientActions}>
          <button className="button" onClick={() => setSyncReview(syncScope)}>
            Sync calendar
          </button>
          <button className="button" onClick={() => update({ library: "1" })}>
            Meeting Library
          </button>
          <button
            className="button primary"
            disabled={!meetingScopeAvailable}
            onClick={() => setCreating(true)}
          >
            New meeting
          </button>
        </div>
      </header>
    );
  }
  return (
    <header className="pageHeader">
      <div>
        <p className="eyebrow">
          {clientId ? "Client meetings" : "Your accessible calendar"}
        </p>
        <h1>{clientId ? "Calendar" : "Master Calendar"}</h1>
      </div>
      <div className="row">
        {scope && (
          <button
            className="button"
            onClick={() => update({ shared: "1", meeting: undefined })}
          >
            Shared meetings
          </button>
        )}
        <button className="button" onClick={() => update({ library: "1" })}>
          Meeting library
        </button>
        <button className="button" onClick={() => setSyncReview(syncScope)}>
          Sync calendar
        </button>
        <button
          className="button primary"
          disabled={!meetingScopeAvailable}
          onClick={() => setCreating(true)}
        >
          <Plus size={16} />
          New meeting
        </button>
      </div>
    </header>
  );
}

function ClientPeriodNavigation({ state }: { state: CalendarPageState }) {
  const { date, view, zone, update } = state;
  return (
    <div className={clientStyles.clientPeriodNavigation}>
      <div className={clientStyles.clientPeriodButtons}>
        <button
          aria-label="Previous period"
          onClick={() => update({ date: moveDate(date, view, -1) })}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() =>
            update({ date: Temporal.Now.plainDateISO(zone).toString() })
          }
        >
          Today
        </button>
        <button
          aria-label="Next period"
          onClick={() => update({ date: moveDate(date, view, 1) })}
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <label className={clientStyles.clientPeriodLabel}>
        <span>{periodLabel(date, view)}</span>
        <input
          type="date"
          aria-label="Calendar date"
          value={date}
          onChange={(event) => {
            if (validDay(event.target.value))
              update({ date: event.target.value });
          }}
        />
      </label>
    </div>
  );
}

function ClientViewPicker({ state }: { state: CalendarPageState }) {
  const { view, update } = state;
  return (
    <div
      className={clientStyles.clientViewPicker}
      role="group"
      aria-label="Calendar view"
    >
      {(["month", "week", "agenda"] as const).map((value) => (
        <button
          key={value}
          aria-pressed={view === value}
          onClick={() => update({ view: value })}
        >
          {value[0]?.toUpperCase()}
          {value.slice(1)}
        </button>
      ))}
    </div>
  );
}

export function ClientCalendarToolbar({ state }: { state: CalendarPageState }) {
  const { view, zone, update, items, hidden, setHidden } = state;
  const name = clientName(state);
  const count = items.filter((item) => item.kind === "meeting").length;
  return (
    <div className={clientStyles.clientCalendarToolbar}>
      <div className={clientStyles.clientCalendarTop}>
        <ClientPeriodNavigation state={state} />
        <div className={clientStyles.clientCalendarTopRight}>
          <span className={clientStyles.clientCalendarCount}>
            {count} {count === 1 ? "meeting" : "meetings"}{" "}
            {view === "week" ? "this week" : "in view"} ·{" "}
            <select
              aria-label="Calendar timezone"
              value={zone}
              onChange={(event) => update({ zone: event.target.value })}
            >
              {zones.map((value) => (
                <option key={value} value={value}>
                  {zoneLabels[value]}
                </option>
              ))}
            </select>
          </span>
          <ClientViewPicker state={state} />
        </div>
      </div>
      {view !== "agenda" && (
        <div className={clientStyles.clientSourceRow}>
          <button
            className={clientStyles.clientMeetingToggle}
            aria-pressed={!hidden.includes("meeting")}
            onClick={() =>
              setHidden(
                hidden.includes("meeting")
                  ? hidden.filter((kind) => kind !== "meeting")
                  : [...hidden, "meeting"],
              )
            }
          >
            <span
              className={clientStyles.clientMeetingCheck}
              aria-hidden="true"
            >
              {hidden.includes("meeting") ? "" : "✓"}
            </span>
            Meetings&nbsp; {count}
          </button>
          <span>
            Only meetings associated with {name} appear in this calendar.
          </span>
        </div>
      )}
    </div>
  );
}

function ScopePicker({ state }: { state: CalendarPageState }) {
  const { scope, currentClients, update } = state;
  return (
    <select
      aria-label="Calendar scope"
      value={scope ?? ""}
      onChange={(e) =>
        update({ clientId: e.target.value || undefined, meeting: undefined })
      }
    >
      <option value="">Master view</option>
      {currentClients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.name}
        </option>
      ))}
      {scope && !currentClients.some((c) => c.id === scope) && (
        <option value={scope}>Selected client unavailable</option>
      )}
    </select>
  );
}

function PeriodControls({ state }: { state: CalendarPageState }) {
  const { date, view, zone, update } = state;
  return (
    <>
      <button
        className="button iconButton"
        aria-label="Previous period"
        onClick={() => update({ date: moveDate(date, view, -1) })}
      >
        <ChevronLeft size={16} />
      </button>
      <button
        className="button"
        onClick={() =>
          update({ date: Temporal.Now.plainDateISO(zone).toString() })
        }
      >
        Today
      </button>
      <button
        className="button iconButton"
        aria-label="Next period"
        onClick={() => update({ date: moveDate(date, view, 1) })}
      >
        <ChevronRight size={16} />
      </button>
      <input
        type="date"
        aria-label="Calendar date"
        value={date}
        onChange={(e) => {
          if (validDay(e.target.value)) update({ date: e.target.value });
        }}
      />
      <select
        aria-label="Calendar view"
        value={view}
        onChange={(e) => update({ view: e.target.value })}
      >
        <option value="month">Month</option>
        <option value="week">Week</option>
        <option value="day">Day</option>
        <option value="agenda">Agenda</option>
      </select>
      <select
        aria-label="Calendar timezone"
        value={zone}
        onChange={(e) => update({ zone: e.target.value })}
      >
        {zones.map((zone) => (
          <option key={zone}>{zone}</option>
        ))}
      </select>
    </>
  );
}

export function CalendarToolbar({
  clientId,
  state,
}: {
  clientId?: string;
  state: CalendarPageState;
}) {
  if (clientId && state.view === "agenda") {
    return (
      <div className={clientStyles.clientAgendaToolbar}>
        <ClientPeriodNavigation state={state} />
        <ClientViewPicker state={state} />
      </div>
    );
  }
  return (
    <div className="toolbar">
      {!clientId && <ScopePicker state={state} />}
      <PeriodControls state={state} />
    </div>
  );
}

function MeetingLifecycleFilters({ state }: { state: CalendarPageState }) {
  const { scope, meetingFilter, update } = state;
  if (!scope) return null;
  return (
    <div className="row" role="group" aria-label="Meeting lifecycle filters">
      {(
        [
          ["all", "All meetings"],
          ["needs-prep", "Needs prep"],
          ["needs-debrief", "Needs debrief"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          className="button"
          aria-pressed={meetingFilter === value}
          onClick={() =>
            update({ meetingFilter: value === "all" ? undefined : value })
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function AgendaFilters({ state }: { state: CalendarPageState }) {
  const { view, scope, mixed, hidden, setHidden, search, setSearch, update } =
    state;
  if (view !== "agenda") return null;
  if (scope)
    return (
      <div className={clientStyles.clientAgendaFilters}>
        <MeetingLifecycleFilters state={state} />
      </div>
    );
  return (
    <div className="toolbar">
      <MeetingLifecycleFilters state={state} />
      <input
        aria-label="Search calendar events"
        placeholder="Search events…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {(mixed
        ? ["meeting", "hearing", "planner", "deadline", "government"]
        : ["meeting"]
      ).map((kind) => (
        <button
          key={kind}
          className="button"
          aria-pressed={!hidden.includes(kind as CalendarKind)}
          onClick={() =>
            setHidden(
              hidden.includes(kind as CalendarKind)
                ? hidden.filter((k) => k !== kind)
                : [...hidden, kind as CalendarKind],
            )
          }
        >
          {kind[0]?.toUpperCase()}
          {kind.slice(1)}
        </button>
      ))}
      {mixed && (
        <span
          className="chip"
          title="Forecast dates do not have a published source contract"
        >
          Government forecasts unavailable
        </span>
      )}
      <button
        className="button ghost"
        onClick={() => {
          setHidden([]);
          setSearch("");
          update({ meetingFilter: undefined });
        }}
      >
        Clear filters
      </button>
    </div>
  );
}
