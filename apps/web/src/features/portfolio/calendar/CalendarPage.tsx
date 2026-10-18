"use client";

import type { Destinations } from "@/shared/portfolio/config/config";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { MeetingDetail } from "./MeetingDetail";
import { MeetingLibrary, SharedMeetings } from "./library/public";
import { MeetingWorkspacePage } from "./MeetingWorkspacePage";
import { useCalendarPageState } from "./useCalendarPageState";
import {
  CalendarPageHeader,
  CalendarToolbar,
  ClientCalendarToolbar,
  AgendaFilters,
} from "./CalendarPageControls";
import {
  CalendarFeedStatuses,
  CalendarDisplayedItems,
  CalendarPageDialogs,
} from "./CalendarPagePanels";
import clientStyles from "./calendar-client.module.css";

export function CalendarPage({
  clientId,
  destinations,
}: {
  clientId?: string;
  destinations: Destinations;
}) {
  const state = useCalendarPageState(clientId);
  const { params, scope, zone, update, clients } = state;
  const workspace = Boolean(
    clientId && params.get("meeting") && state.view === "agenda",
  );
  const detail = (
    <MeetingDetail
      key={`${params.get("meeting") ?? "none"}:${scope ?? "all"}`}
      id={params.get("meeting")}
      onClose={() =>
        update({ meeting: undefined, objectiveMeeting: undefined })
      }
      zone={zone}
      destinations={destinations}
      clientId={scope}
    />
  );
  if (params.get("shared") === "1" && scope)
    return (
      <SharedMeetings
        key={scope}
        clientId={scope}
        zone={zone}
        onClose={() => update({ shared: undefined })}
      />
    );
  if (params.get("library") === "1")
    return (
      <>
        <MeetingLibrary
          clientId={scope}
          zone={zone}
          onMeeting={(id) => update({ meeting: id })}
          onClose={() => update({ library: undefined })}
        />
        {detail}
      </>
    );
  return (
    <div className={`page ${clientId ? clientStyles.clientPage : ""}`}>
      <CalendarPageHeader clientId={clientId} state={state} />
      {!clientId && (
        <QueryState
          error={clients.error}
          retry={() => void clients.refetch()}
        />
      )}
      <CalendarFeedStatuses state={state} />
      {clientId && (state.view === "month" || state.view === "week") ? (
        <div className={clientStyles.clientCalendarCard}>
          <ClientCalendarToolbar state={state} />
          <CalendarDisplayedItems state={state} />
        </div>
      ) : (
        <>
          <CalendarToolbar clientId={clientId} state={state} />
          {workspace ? (
            <MeetingWorkspacePage state={state} destinations={destinations} />
          ) : (
            <>
              <AgendaFilters state={state} />
              <CalendarDisplayedItems state={state} />
            </>
          )}
        </>
      )}
      {!workspace && detail}
      <CalendarPageDialogs state={state} destinations={destinations} />
    </div>
  );
}
