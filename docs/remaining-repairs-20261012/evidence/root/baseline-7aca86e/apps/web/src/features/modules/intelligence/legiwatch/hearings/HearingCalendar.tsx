"use client";
import type { CalendarHearing } from "../../../../../shared/capiro/operations/legiwatch-calendar-schemas";
import { hearingDate } from "../components";
import styles from "../legiwatch.module.css";
import { clockHour, displayTime, shiftDate } from "./calendar-dates";

export function HearingCalendar({
  rows,
  from,
  onOpen,
}: {
  rows: CalendarHearing[];
  from: string;
  onOpen: (id: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, index) => shiftDate(from, index));
  const times = rows
    .map((row) => clockHour(row.startsAt, row.time))
    .filter((hour): hour is number => hour !== null);
  const first = Math.min(9, ...times),
    last = Math.max(14, ...times);
  const event = (row: CalendarHearing) => (
    <button
      type="button"
      key={row.id}
      className={`${styles.event} ${row.geographicJurisdiction?.toUpperCase() === "FL" ? styles.flEvent : ""}`}
      onClick={() => onOpen(row.id)}
      title={`${displayTime(row.startsAt, row.time)} · ${row.title}`}
    >
      {displayTime(row.startsAt, row.time)} {row.title}
    </button>
  );
  return (
    <div
      className={styles.calendar}
      role="region"
      aria-label="Week hearing calendar"
      tabIndex={0}
    >
      <div className={styles.week}>
        <div className={styles.calendarHeader}>
          <div>ET</div>
          {days.map((day) => (
            <div key={day}>{hearingDate(day).toUpperCase()}</div>
          ))}
        </div>
        {rows.some((row) => clockHour(row.startsAt, row.time) === null) && (
          <div className={styles.calendarRow}>
            <div className={styles.calendarTime}>Time TBA</div>
            {days.map((day) => (
              <div key={day}>
                {rows
                  .filter(
                    (row) =>
                      row.date === day &&
                      clockHour(row.startsAt, row.time) === null,
                  )
                  .map(event)}
              </div>
            ))}
          </div>
        )}
        {Array.from(
          { length: last - first + 1 },
          (_, index) => first + index,
        ).map((hour) => (
          <div className={styles.calendarRow} key={hour}>
            <div className={styles.calendarTime}>
              {String(hour).padStart(2, "0")}:00
            </div>
            {days.map((day) => (
              <div key={day}>
                {rows
                  .filter(
                    (row) =>
                      row.date === day &&
                      clockHour(row.startsAt, row.time) === hour,
                  )
                  .map(event)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
