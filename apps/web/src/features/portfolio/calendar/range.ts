import { Temporal } from "temporal-polyfill";
export { validDay, instantDay } from "@/shared/portfolio/date/civil";
export const zones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Pacific/Honolulu",
  "UTC",
] as const;
export type CalendarZone = (typeof zones)[number];
export type CalendarView = "month" | "week" | "day" | "agenda";
export function calendarRange(
  date: string,
  view: CalendarView,
  zone: CalendarZone,
  weekStartsOn: 1 | 7 = 7,
) {
  const anchor = Temporal.PlainDate.from(date);
  const startOffset = (day: number) => (day - weekStartsOn + 7) % 7;
  const first =
    view === "day"
      ? anchor
      : view === "week"
        ? anchor.subtract({ days: startOffset(anchor.dayOfWeek) })
        : anchor.with({ day: 1 });
  const monthGridRange =
    view === "month" || (view === "agenda" && weekStartsOn === 1);
  const start = monthGridRange
    ? first.subtract({ days: startOffset(first.dayOfWeek) })
    : first;
  const end =
    view === "day"
      ? start.add({ days: 1 })
      : view === "week"
        ? start.add({ days: 7 })
        : monthGridRange
          ? first.add({ months: 1 }).add({
              days: (7 - startOffset(first.add({ months: 1 }).dayOfWeek)) % 7,
            })
          : first.add({ months: 1 });
  return {
    startDay: start.toString(),
    endDay: end.toString(),
    from: start.toZonedDateTime({ timeZone: zone }).toInstant().toString(),
    to: end.toZonedDateTime({ timeZone: zone }).toInstant().toString(),
  };
}
export function moveDate(date: string, view: CalendarView, direction: number) {
  return Temporal.PlainDate.from(date)
    .add(
      view === "day"
        ? { days: direction }
        : view === "week"
          ? { days: 7 * direction }
          : { months: direction },
    )
    .toString();
}
export function dateTimeInstant(date: string, time: string, zone: string) {
  return Temporal.PlainDate.from(date)
    .toZonedDateTime({
      timeZone: zone,
      plainTime: Temporal.PlainTime.from(time),
    })
    .toInstant()
    .toString();
}
export function formatInstant(value: string, zone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

/** A compact client meeting time with both ends visible in agenda lists. */
export function formatMeetingSlot(
  startAt: string,
  endAt: string | undefined,
  zone: string,
) {
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;
  if (!Number.isFinite(start.valueOf())) return "Time unavailable";
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    month: "short",
    day: "numeric",
  });
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
  });
  const startTime = time.format(start);
  if (!end || !Number.isFinite(end.valueOf()))
    return `${day.format(start)} · ${startTime}`;
  const endTime = time.format(end);
  const samePeriod = startTime.endsWith("AM") === endTime.endsWith("AM");
  const firstTime = samePeriod
    ? startTime.replace(/\s?(AM|PM)$/, "")
    : startTime;
  return day.format(start) === day.format(end)
    ? `${day.format(start)} · ${firstTime}–${endTime}`
    : `${day.format(start)} · ${startTime}–${day.format(end)} · ${endTime}`;
}
