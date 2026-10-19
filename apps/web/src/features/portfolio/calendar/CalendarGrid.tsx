"use client";
import "temporal-polyfill/global";
import { useEffect } from "react";
import { Temporal } from "temporal-polyfill";
import { ScheduleXCalendar, useNextCalendarApp } from "@schedule-x/react";
import {
  createViewDay,
  createViewMonthGrid,
  createViewWeek,
} from "@schedule-x/calendar";
import "@schedule-x/theme-default/dist/index.css";
import type { CalendarItem } from "./contracts";
import type { CalendarView, CalendarZone } from "./range";
import styles from "./calendar.module.css";
import clientStyles from "./calendar-client.module.css";
export function CalendarGrid({
  items,
  date,
  view,
  zone,
  onDate,
  onMeeting,
  client = false,
}: {
  items: CalendarItem[];
  date: string;
  view: CalendarView;
  zone: CalendarZone;
  onDate: (date: string) => void;
  onMeeting: (id: string) => void;
  client?: boolean;
}) {
  const calendar = useNextCalendarApp({
    views: [createViewMonthGrid(), createViewWeek(), createViewDay()],
    calendars: client
      ? {
          meetings: {
            colorName: "client-meetings",
            lightColors: {
              main: "#49688d",
              container: "#edf2fa",
              onContainer: "#2d4564",
            },
            darkColors: {
              main: "#96afd0",
              container: "#23344a",
              onContainer: "#e5edf7",
            },
          },
        }
      : undefined,
    defaultView:
      view === "day" ? "day" : view === "week" ? "week" : "month-grid",
    selectedDate: Temporal.PlainDate.from(date),
    timezone: zone,
    firstDayOfWeek: client ? 1 : 7,
    isResponsive: false,
    dayBoundaries:
      view === "day"
        ? { start: "00:00", end: "24:00" }
        : client
          ? { start: "08:00", end: "17:00" }
          : { start: "06:00", end: "22:00" },
    weekOptions: { gridHeight: client ? 596 : 900 },
    callbacks: {
      onEventClick: (event) =>
        onMeeting(String(event.id).replace(/^meeting:/, "")),
      onSelectedDateUpdate: (date) => onDate(date.toString()),
    },
  });
  useEffect(() => {
    calendar?.events.set(
      items
        .filter((item) => item.kind === "meeting" && item.startAt && item.endAt)
        .map((item) => ({
          id: item.key,
          title: item.title,
          calendarId: client ? "meetings" : undefined,
          start: Temporal.Instant.from(item.startAt!).toZonedDateTimeISO(zone),
          end: Temporal.Instant.from(item.endAt!).toZonedDateTimeISO(zone),
        })),
    );
  }, [calendar, client, items, zone]);
  useEffect(() => {
    if (!calendar) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => calendar.setTheme(media.matches ? "dark" : "light");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [calendar]);
  const zoneAbbreviation =
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "short",
    })
      .formatToParts(new Date(`${date}T12:00:00Z`))
      .find((part) => part.type === "timeZoneName")?.value ?? zone;
  return (
    <div
      className={`${styles.grid} ${client ? clientStyles.clientGrid : ""}`}
      data-view={view}
    >
      {client && view === "month" && (
        <div className={clientStyles.clientMonthWeekdays} aria-hidden="true">
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
      )}
      <ScheduleXCalendar calendarApp={calendar} />
      {client && view === "week" && (
        <span className={clientStyles.clientWeekZoneLabel}>
          {zoneAbbreviation}
        </span>
      )}
    </div>
  );
}
