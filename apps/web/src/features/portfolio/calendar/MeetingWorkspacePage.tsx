"use client";

import type { CalendarPageState } from "./useCalendarPageState";
import type { Destinations } from "@/shared/portfolio/config/config";
import { MeetingDetail } from "./MeetingDetail";
import { formatMeetingSlot } from "./range";
import { meetingMaterials, meetingStage } from "./lifecycle";
import { useMeetingClock } from "./useMeetingClock";
import workspaceStyles from "./meeting-workspace.module.css";

/** A selected client meeting remains beside its scoped month list. */
export function MeetingWorkspacePage({
  state,
  destinations,
}: {
  state: CalendarPageState;
  destinations: Destinations;
}) {
  const { items, params, scope, zone, date, update } = state;
  const now = useMeetingClock();
  const selectedId = params.get("meeting");
  const name =
    state.currentClients.find((client) => client.id === scope)?.name ??
    "Client";
  const month = new Date(`${date}T12:00:00Z`).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  const meetings = items.filter((item) => item.kind === "meeting");
  const meetingsCurrent = state.activeFeeds.every(
    ([, feed]) => feed.isSuccess && !feed.isFetching && !feed.error,
  );
  const ordered = [
    ...meetings.filter((item) => item.sourceId === selectedId),
    ...meetings.filter((item) => item.sourceId !== selectedId),
  ];
  return (
    <div className={workspaceStyles.workspaceLayout}>
      <aside
        className={workspaceStyles.workspaceList}
        aria-label="Client meeting list"
      >
        <h2>Meetings · {name}</h2>
        <p>
          {month} · {zone === "America/New_York" ? "Eastern time" : zone}
        </p>
        <div className={workspaceStyles.workspaceItems}>
          {ordered.map((item) => {
            const meeting = item.meeting;
            const stage = meeting && meetingStage(meeting, now);
            const materials = meeting && meetingMaterials(meeting);
            return (
              <button
                key={item.key}
                className={workspaceStyles.workspaceItem}
                aria-current={selectedId === item.sourceId ? "true" : undefined}
                onClick={() => update({ meeting: item.sourceId })}
              >
                <small>
                  {item.startAt
                    ? formatMeetingSlot(item.startAt, item.endAt, zone)
                    : item.day}
                </small>
                <strong>{item.title}</strong>
                <small>
                  {meeting?.attendees.find(
                    (attendee) => attendee.role?.toLowerCase() === "organizer",
                  )?.name ??
                    meeting?.attendees[0]?.name ??
                    "Organizer unavailable"}
                  {" · "}
                  {meeting?.location ??
                    (meeting?.isVirtual
                      ? "Virtual meeting"
                      : "Location not supplied")}
                </small>
                <small>
                  {stage && stage !== "unknown"
                    ? `${stage[0]?.toUpperCase()}${stage.slice(1)}`
                    : (meeting?.status ?? "Status unavailable")}{" "}
                  · {materials?.prep ?? "No prep"}
                </small>
              </button>
            );
          })}
          {meetingsCurrent && meetings.length === 0 && (
            <p>No meetings in this month.</p>
          )}
        </div>
      </aside>
      <MeetingDetail
        key={`${selectedId ?? "none"}:${scope ?? "all"}`}
        id={selectedId}
        inline
        onClose={() =>
          update({ meeting: undefined, objectiveMeeting: undefined })
        }
        zone={zone}
        destinations={destinations}
        clientId={scope}
      />
    </div>
  );
}
