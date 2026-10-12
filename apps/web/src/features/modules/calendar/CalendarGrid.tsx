"use client";

import { createViewMonthGrid, createViewWeek } from "@schedule-x/calendar";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
import { ScheduleXCalendar, useNextCalendarApp } from "@schedule-x/react";
import "@schedule-x/theme-default/dist/index.css";
import { useEffect, useRef, useState } from "react";
import { Temporal } from "temporal-polyfill";
import type { EngagementMeeting } from "../../../shared/capiro/operations/engagement";
import styles from "./calendar.module.css";
import { calendarTimeZone } from "./range";

// Schedule-X consumes Temporal globally; its date objects do not require replacing Intl.
const calendarGlobal = globalThis as typeof globalThis & {
  Temporal?: typeof Temporal;
};
if (!calendarGlobal.Temporal) calendarGlobal.Temporal = Temporal;
const CalendarTemporal = calendarGlobal.Temporal;

export function CalendarGrid({
  meetings,
  date,
  view,
  onMeeting,
}: {
  meetings: EngagementMeeting[];
  date: string;
  view: "month" | "week";
  onMeeting: (meeting: EngagementMeeting) => void;
}) {
  const [controls] = useState(() => createCalendarControlsPlugin());
  const current = useRef({ meetings, onMeeting });
  current.current = { meetings, onMeeting };
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
    calendar?.events.set(
      meetings.map((meeting) => ({
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
    );
  }, [calendar, meetings]);
  return (
    <div
      className={`${styles.schedule} ${view === "week" ? styles.weekSchedule : ""}`}
      aria-label={`${view} meeting calendar`}
    >
      <ScheduleXCalendar calendarApp={calendar} />
    </div>
  );
}
