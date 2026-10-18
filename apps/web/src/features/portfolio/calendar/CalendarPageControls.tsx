"use client";

import { Temporal } from "temporal-polyfill";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { moveDate, validDay, zones } from "./range";
import type { CalendarKind } from "./contracts";
import type { CalendarPageState } from "./useCalendarPageState";

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
  const { view, mixed, hidden, setHidden, search, setSearch, update } = state;
  if (view !== "agenda") return null;
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
