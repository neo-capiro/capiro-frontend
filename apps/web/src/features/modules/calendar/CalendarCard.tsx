"use client";
import {
  ActionButton,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import { AgendaTable } from "./CalendarAgenda";
import { CalendarFilters, CalendarToolbar } from "./CalendarControls";
import { CalendarGrid } from "./CalendarGrid";
import { agendaSources } from "./agenda";
import styles from "./calendar.module.css";
import type { CalendarModel } from "./useCalendar";

function CalendarEvents({ model }: { model: CalendarModel }) {
  const {
    view,
    search,
    setSearch,
    setSources,
    meetings,
    filtered,
    extras,
    sources,
    loaded,
    date,
    setSelected,
  } = model;
  return (
    <>
      {view === "agenda" && (
        <div className={styles.search}>
          <TextInput
            aria-label="Search calendar events"
            placeholder="Search displayed events"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <ActionButton
            onClick={() => {
              setSearch("");
              setSources(new Set(agendaSources));
            }}
          >
            Clear filters
          </ActionButton>
        </div>
      )}
      <StatusPanel
        loading={meetings.loading}
        error={meetings.error}
        onRetry={meetings.reload}
      >
        {view === "agenda" ? (
          <>
            <AgendaTable items={filtered} onMeeting={setSelected} />
            {!filtered.length && !extras.loading && (
              <StatusPanel empty="No events match this view" />
            )}
          </>
        ) : (
          <CalendarGrid
            meetings={sources.has("Meetings") ? loaded : []}
            date={date}
            view={view}
            onMeeting={setSelected}
          />
        )}
      </StatusPanel>
      {extras.loading && (
        <p className={styles.warnings} role="status">
          Loading all visible source pages…
        </p>
      )}
      {extras.warnings.length > 0 && (
        <div className={styles.warnings} role="note">
          {extras.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}
    </>
  );
}
export function CalendarCard({ model }: { model: CalendarModel }) {
  const {
    date,
    view,
    count,
    meetings,
    extras,
    setDate,
    setView,
    datePicker,
    setDatePicker,
    clientId,
    sources,
    allItems,
    clientName,
    toggle,
  } = model;
  return (
    <section className={styles.card} aria-label="Master calendar">
      <CalendarToolbar
        date={date}
        view={view}
        count={count}
        loading={meetings.loading || extras.loading}
        onDate={setDate}
        onView={setView}
        datePicker={datePicker}
        onDatePicker={setDatePicker}
      />
      <CalendarFilters
        mixed={view === "agenda" && !clientId}
        selected={sources}
        items={allItems}
        loading={meetings.loading || extras.loading}
        warnings={extras.warnings}
        scopeTitle={`${clientName} · ${clientId ? "Client-associated" : "All client profiles"} · Your accessible meetings`}
        onToggle={toggle}
      />
      <CalendarEvents model={model} />
    </section>
  );
}
