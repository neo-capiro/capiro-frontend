"use client";

import type { Destinations } from "@/shared/portfolio/config/config";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { CalendarGrid } from "./CalendarGrid";
import { Agenda } from "./Agenda";
import { MeetingAgenda } from "./MeetingAgenda";
import { MeetingForm } from "./MeetingForm";
import { PublicEventDetail } from "./public-event/public";
import { CalendarSyncDialog } from "./sync/public";
import styles from "./calendar.module.css";
import clientStyles from "./calendar-client.module.css";
import type { CalendarPageState } from "./useCalendarPageState";

export function CalendarFeedStatuses({ state }: { state: CalendarPageState }) {
  const { activeFeeds, mixed } = state;
  return (
    <div className="stack">
      {activeFeeds.map(([name, feed]) => (
        <div key={name}>
          {(feed.isPending || feed.isFetching) &&
            (name === "meetings" || mixed) && (
              <p role="status" className="muted">
                Loading {name}…
              </p>
            )}
          {feed.error && (
            <QueryState error={feed.error} retry={() => void feed.refetch()} />
          )}
          {feed.isSuccess &&
            feed.data.limitations.map((message) => (
              <p key={message} role="status" className="muted">
                {message}
              </p>
            ))}
        </div>
      ))}
    </div>
  );
}

export function CalendarDisplayedItems({
  state,
}: {
  state: CalendarPageState;
}) {
  const {
    view,
    zone,
    date,
    scope,
    activeFeeds,
    items,
    update,
    currentClients,
  } = state;
  // Figma 3.4 personalises this note with the client (1064:177487
  // "Only meetings assigned to Anduril are shown.").
  const clientName =
    currentClients.find((client) => client.id === scope)?.name ?? "this client";
  return (
    <>
      {!scope && (
        <p className={styles.scopeNote}>
          Master view includes meetings allowed by your calendar ownership and
          explicit client sharing. It does not grant access to teammates&apos;
          private calendars.
        </p>
      )}
      {view === "day" && (
        <p className={styles.scopeNote}>
          Shows meetings that start on this day in {zone}. Meetings that started
          on an earlier day are not included.
        </p>
      )}
      {view === "agenda" ? (
        (items.length > 0 ||
          activeFeeds.every(
            ([, feed]) => feed.isSuccess && !feed.isFetching && !feed.error,
          )) &&
        (scope ? (
          <MeetingAgenda
            items={items}
            onMeeting={(id) => update({ meeting: id, hearing: undefined })}
          />
        ) : (
          <Agenda
            items={items}
            onMeeting={(id) => update({ meeting: id, hearing: undefined })}
            onPublicEvent={(id) => update({ hearing: id, meeting: undefined })}
          />
        ))
      ) : (
        <CalendarGrid
          key={`${view}:${date}:${zone}`}
          items={items}
          date={date}
          view={view}
          zone={zone}
          onDate={(value) => {
            if (value !== date) update({ date: value });
          }}
          onMeeting={(id) => update({ meeting: id })}
          client={Boolean(scope)}
        />
      )}
      {scope && view === "agenda" && (
        <p className={clientStyles.clientAgendaNote}>
          Only meetings assigned to {clientName} are shown. Artifacts remain
          private until shared.
        </p>
      )}
    </>
  );
}

export function CalendarPageDialogs({
  state,
  destinations,
}: {
  state: CalendarPageState;
  destinations: Destinations;
}) {
  const {
    params,
    scope,
    mixed,
    update,
    creating,
    setCreating,
    meetingScopeAvailable,
    zone,
    syncScope,
    syncReview,
    setSyncReview,
    range,
    currentClients,
  } = state;
  return (
    <>
      <PublicEventDetail
        key={JSON.stringify([params.get("hearing"), scope ?? null])}
        eventId={params.get("hearing")}
        open={mixed && Boolean(params.get("hearing"))}
        onOpenChange={(open) => {
          if (!open) update({ hearing: undefined });
        }}
        destinations={destinations}
      />
      <MeetingForm
        key={creating || params.get("new") === "meeting" ? "new" : "closed"}
        open={creating || params.get("new") === "meeting"}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open && params.has("new")) update({ new: undefined });
        }}
        clientId={scope}
        clientScopeAvailable={meetingScopeAvailable}
        zone={zone}
      />
      <CalendarSyncDialog
        key={syncScope}
        open={syncReview === syncScope}
        onOpenChange={(open) => setSyncReview(open ? syncScope : null)}
        range={{ from: range.from, to: range.to }}
        clientName={currentClients.find((client) => client.id === scope)?.name}
      />
    </>
  );
}
