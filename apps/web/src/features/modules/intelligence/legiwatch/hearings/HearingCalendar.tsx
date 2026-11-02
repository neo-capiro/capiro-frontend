"use client";
import "temporal-polyfill/global";
import { useEffect } from "react";
import { Temporal } from "temporal-polyfill";
import { ScheduleXCalendar, useNextCalendarApp } from "@schedule-x/react";
import { createViewDay, createViewWeek } from "@schedule-x/calendar";
import "@schedule-x/theme-default/dist/index.css";
import type { CalendarHearing } from "../../../../../shared/capiro/operations/legiwatch-calendar-schemas";
import { calendarEvents } from "./calendar-events";
import styles from "./hearing-calendar.module.css";

export function HearingCalendar({
  rows,
  from,
  view,
  onOpen,
}: {
  rows: CalendarHearing[];
  from: string;
  view: "week" | "day";
  onOpen: (id: string) => void;
}) {
  const calendar = useNextCalendarApp({
    views: [createViewWeek(), createViewDay()],
    defaultView: view,
    selectedDate: Temporal.PlainDate.from(from),
    timezone: "America/New_York",
    firstDayOfWeek: 1,
    isResponsive: false,
    dayBoundaries: { start: "00:00", end: "24:00" },
    weekOptions: { gridHeight: 1440 },
    calendars: {
      US: {
        colorName: "federal",
        lightColors: {
          main: "#3f807b",
          container: "#e8f2f1",
          onContainer: "#164e48",
        },
        darkColors: {
          main: "#7bbcb5",
          container: "#183d38",
          onContainer: "#d8f2ed",
        },
      },
      FL: {
        colorName: "florida",
        lightColors: {
          main: "#7c6381",
          container: "#f0e8f1",
          onContainer: "#5e4560",
        },
        darkColors: {
          main: "#c9a8cf",
          container: "#423047",
          onContainer: "#f0e8f1",
        },
      },
    },
    callbacks: { onEventClick: (event) => onOpen(String(event.id)) },
  });
  useEffect(() => {
    calendar?.events.set(calendarEvents(rows));
  }, [calendar, rows]);
  useEffect(() => {
    if (!calendar) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => calendar.setTheme(media.matches ? "dark" : "light");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [calendar]);
  return (
    <section
      className={styles.calendar}
      aria-label={`${view} hearing calendar, Eastern time`}
      data-figma-node="1064:262702"
    >
      <ScheduleXCalendar calendarApp={calendar} />
      <p className={styles.note}>
        Blocks show start times, not hearing duration. Time TBA hearings appear
        above the time grid.
      </p>
    </section>
  );
}
