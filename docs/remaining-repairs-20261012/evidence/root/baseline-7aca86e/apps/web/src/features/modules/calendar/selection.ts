import { Temporal } from "temporal-polyfill";
import type { CalendarView } from "./range";

/** URL fields preserve presentation across the shared client/session remount. */
export function calendarSelection(
  params: Pick<URLSearchParams, "get">,
  fallbackDate: string,
) {
  const requestedView = params.get("view");
  const view: CalendarView =
    requestedView === "week" || requestedView === "agenda"
      ? requestedView
      : "month";
  const requestedDate = params.get("date");
  let date = fallbackDate;
  if (requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
    try {
      date = Temporal.PlainDate.from(requestedDate).toString();
    } catch {
      // Invalid URL hints never reach calendar range construction.
    }
  }
  return { date, view };
}
