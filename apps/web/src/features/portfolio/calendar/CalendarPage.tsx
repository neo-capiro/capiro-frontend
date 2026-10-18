"use client";

import type { Destinations } from "@/shared/portfolio/config/config";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { MeetingDetail } from "./MeetingDetail";
import { MeetingLibrary, SharedMeetings } from "./library/public";
import { useCalendarPageState } from "./useCalendarPageState";
import {
  CalendarPageHeader,
  CalendarToolbar,
  AgendaFilters,
} from "./CalendarPageControls";
import {
  CalendarFeedStatuses,
  CalendarDisplayedItems,
  CalendarPageDialogs,
} from "./CalendarPagePanels";

export function CalendarPage({
  clientId,
  destinations,
}: {
  clientId?: string;
  destinations: Destinations;
}) {
  const state = useCalendarPageState(clientId);
  const { params, scope, zone, update, clients } = state;
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
    <div className="page">
      <CalendarPageHeader clientId={clientId} state={state} />
      <CalendarToolbar clientId={clientId} state={state} />
      {!clientId && (
        <QueryState
          error={clients.error}
          retry={() => void clients.refetch()}
        />
      )}
      <AgendaFilters state={state} />
      <CalendarFeedStatuses state={state} />
      <CalendarDisplayedItems state={state} />
      {detail}
      <CalendarPageDialogs state={state} destinations={destinations} />
    </div>
  );
}
