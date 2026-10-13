import { Temporal } from "temporal-polyfill";

export const calendarTimeZone = "America/New_York";
export type CalendarView = "month" | "week" | "agenda";
export type CalendarRange = {
  from: string;
  to: string;
  firstDay: string;
  lastDay: string;
};

export function calendarRange(date: string, view: CalendarView): CalendarRange {
  const selected = Temporal.PlainDate.from(date);
  const first = view === "week" ? selected : selected.with({ day: 1 });
  const start = first.subtract({ days: first.dayOfWeek - 1 });
  const monthLast = selected
    .with({ day: 1 })
    .add({ months: 1 })
    .subtract({ days: 1 });
  const end =
    view === "week"
      ? start.add({ days: 7 })
      : monthLast.add({ days: 8 - monthLast.dayOfWeek });
  const atMidnight = (value: Temporal.PlainDate) =>
    value
      .toZonedDateTime({ timeZone: calendarTimeZone, plainTime: "00:00" })
      .toInstant()
      .toString();
  return {
    from: atMidnight(start),
    to: atMidnight(end),
    firstDay: start.toString(),
    lastDay: end.subtract({ days: 1 }).toString(),
  };
}

export function currentCalendarDate() {
  return Temporal.Now.plainDateISO(calendarTimeZone).toString();
}
export function shiftCalendarDate(
  date: string,
  view: CalendarView,
  direction: -1 | 1,
) {
  return Temporal.PlainDate.from(date)
    .add(view === "week" ? { weeks: direction } : { months: direction })
    .toString();
}
export function calendarTitle(date: string, view: CalendarView) {
  const selected = Temporal.PlainDate.from(date);
  if (view !== "week")
    return selected.toLocaleString("en-US", { month: "long", year: "numeric" });
  const first = selected.subtract({ days: selected.dayOfWeek - 1 });
  const last = first.add({ days: 6 });
  const finalDay =
    first.month === last.month
      ? String(last.day)
      : last.toLocaleString("en-US", { month: "long", day: "numeric" });
  return `${first.toLocaleString("en-US", { month: "long", day: "numeric" })} to ${finalDay}, ${last.year}`;
}
export function eventTime(instant: string) {
  return Temporal.Instant.from(instant)
    .toZonedDateTimeISO(calendarTimeZone)
    .toLocaleString("en-US", { hour: "numeric", minute: "2-digit" });
}
export function eventDay(instant: string) {
  return Temporal.Instant.from(instant)
    .toZonedDateTimeISO(calendarTimeZone)
    .toPlainDate()
    .toString();
}
export function eventClock(instant: string) {
  return Temporal.Instant.from(instant)
    .toZonedDateTimeISO(calendarTimeZone)
    .toPlainTime()
    .toString();
}
export function inCalendarRange(date: string, range: CalendarRange) {
  return date >= range.firstDay && date <= range.lastDay;
}
