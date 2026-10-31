"use client";

import { createViewMonthGrid, createViewWeek } from "@schedule-x/calendar";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
import { ScheduleXCalendar, useNextCalendarApp } from "@schedule-x/react";
import "@schedule-x/theme-default/dist/index.css";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Temporal } from "temporal-polyfill";
import type { EngagementMeeting } from "../../../shared/capiro/operations/engagement";
import styles from "./calendar.module.css";
import { calendarTimeZone } from "./range";
import type { AgendaItem } from "./agenda";

// Schedule-X consumes Temporal globally; its date objects do not require replacing Intl.
const calendarGlobal = globalThis as typeof globalThis & {
  Temporal?: typeof Temporal;
};
if (!calendarGlobal.Temporal) calendarGlobal.Temporal = Temporal;
const CalendarTemporal = calendarGlobal.Temporal;

export function CalendarGrid({
  meetings,
  hearings,
  onHearing,
  date,
  view,
  onMeeting,
}: {
  meetings: EngagementMeeting[];
  hearings: AgendaItem[];
  onHearing: (href: string) => void;
  date: string;
  view: "month" | "week";
  onMeeting: (meeting: EngagementMeeting) => void;
}) {
  const [controls] = useState(() => createCalendarControlsPlugin());
  const current = useRef({ meetings, onMeeting, hearings, onHearing });
  useLayoutEffect(() => {
    current.current = { meetings, onMeeting, hearings, onHearing };
  }, [meetings, onMeeting, hearings, onHearing]);
  const calendar = useNextCalendarApp(
    {
      views: [createViewMonthGrid(), createViewWeek()],
      defaultView: view === "week" ? "week" : "month-grid",
      selectedDate: CalendarTemporal.PlainDate.from(date),
      timezone: calendarTimeZone,
      firstDayOfWeek: 1,
      isResponsive: false,
      dayBoundaries: { start: "08:00", end: "17:00" },
      weekOptions: { gridHeight: 576 },
      calendars: {
        hearings: {
          colorName: "hearings",
          lightColors: {
            main: "#147d64",
            container: "#e7f5ee",
            onContainer: "#164f40",
          },
        },
        meetings: {
          colorName: "meetings",
          lightColors: {
            main: "#49688d",
            container: "#edf2fa",
            onContainer: "#2d4564",
          },
        },
      },
      callbacks: {
        onEventClick: (event) => {
          const meeting = current.current.meetings.find(
            (item) => item.id === event.id,
          );
          if (meeting) current.current.onMeeting(meeting);
          const hearing = current.current.hearings.find(
            (item) => item.key === event.id,
          );
          if (hearing?.href) current.current.onHearing(hearing.href);
        },
      },
    },
    [controls],
  );
  useEffect(() => {
    if (!calendar) return;
    controls.setDate(CalendarTemporal.PlainDate.from(date));
    controls.setView(view === "week" ? "week" : "month-grid");
  }, [calendar, controls, date, view]);
  useEffect(() => {
    calendar?.events.set([
      ...meetings.map((meeting) => ({
        id: meeting.id,
        title: `${meeting.subject}${meeting.client ? ` · ${meeting.client.name}` : ""}`,
        start: CalendarTemporal.Instant.from(
          meeting.startsAt,
        ).toZonedDateTimeISO(calendarTimeZone),
        end: CalendarTemporal.Instant.from(meeting.endsAt).toZonedDateTimeISO(
          calendarTimeZone,
        ),
        calendarId: "meetings",
      })),
      ...hearings.map((hearing) => ({
        id: hearing.key,
        title: `${hearing.time} · ${hearing.title}`,
        // The source supplies a start, not an end. A date card keeps the
        // announced time visible without inventing a hearing duration.
        start: CalendarTemporal.PlainDate.from(hearing.date),
        end: CalendarTemporal.PlainDate.from(hearing.date),
        calendarId: "hearings",
      })),
    ]);
  }, [calendar, meetings, hearings]);
  return (
    <div
      className={`${styles.schedule} ${view === "week" ? styles.weekSchedule : ""}`}
      aria-label={`${view} calendar`}
    >
      <ScheduleXCalendar calendarApp={calendar} />
    </div>
  );
}
