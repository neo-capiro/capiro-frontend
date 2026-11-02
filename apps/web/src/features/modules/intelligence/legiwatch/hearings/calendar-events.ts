import { Temporal } from "temporal-polyfill";
import type { CalendarHearing } from "../../../../../shared/capiro/operations/legiwatch-calendar-schemas";

function startTime(row: CalendarHearing) {
  try {
    if (row.startsAt)
      return Temporal.Instant.from(row.startsAt).toZonedDateTimeISO(
        "America/New_York",
      );
    const match = row.time?.match(
      /^(\d{1,2})(?::(\d{2})(?::\d{2})?)?\s*(AM|PM)?$/i,
    );
    if (!match) return null;
    let hour = Number(match[1]);
    if (match[3] && (hour < 1 || hour > 12)) return null;
    if (match[3])
      hour = (hour % 12) + (match[3].toUpperCase() === "PM" ? 12 : 0);
    if (hour > 23 || Number(match[2] ?? 0) > 59) return null;
    return Temporal.PlainDate.from(row.date)
      .toZonedDateTime({
        timeZone: row.timezone || "America/New_York",
        plainTime: Temporal.PlainTime.from({
          hour,
          minute: Number(match[2] ?? 0),
        }),
      })
      .withTimeZone("America/New_York");
  } catch {
    return null;
  }
}

export function calendarEvents(rows: CalendarHearing[]) {
  return rows.map((row) => {
    const start = startTime(row);
    const date = Temporal.PlainDate.from(row.date);
    const source =
      row.geographicJurisdiction?.toUpperCase() === "FL"
        ? "Florida"
        : "Federal";
    return {
      id: row.id,
      calendarId: source === "Florida" ? "FL" : "US",
      title: `${source} · ${start ? "" : "Time TBA · "}${row.title}`,
      description: `${row.committeeName ?? ""} · ${row.eventStatus.replaceAll("_", " ")}`,
      start: start ?? date,
      // This is a visual slot only: the feed supplies no official end time.
      end: start ? start.add({ minutes: 30 }) : date,
    };
  });
}
