import { expect, it } from "vitest";
import {
  calendarRange,
  eventDay,
  inCalendarRange,
  shiftCalendarDate,
} from "./range";

it("uses Monday-based month padding and end-exclusive Eastern instants", () => {
  expect(calendarRange("2026-10-08", "month")).toEqual({
    firstDay: "2026-09-28",
    lastDay: "2026-11-01",
    from: "2026-09-28T04:00:00Z",
    to: "2026-11-02T05:00:00Z",
  });
});
it("respects the daylight-saving transition instead of assuming a 168-hour week", () => {
  const range = calendarRange("2026-11-01", "week");
  expect(range.from).toBe("2026-10-26T04:00:00Z");
  expect(range.to).toBe("2026-11-02T05:00:00Z");
  expect((Date.parse(range.to) - Date.parse(range.from)) / 3_600_000).toBe(169);
  expect(eventDay("2026-10-09T02:00:00Z")).toBe("2026-10-08");
});
it("navigates civil months and excludes dates outside inclusive source-day bounds", () => {
  expect(shiftCalendarDate("2026-01-31", "month", 1)).toBe("2026-02-28");
  const range = calendarRange("2026-10-08", "week");
  expect(inCalendarRange("2026-10-11", range)).toBe(true);
  expect(inCalendarRange("2026-10-12", range)).toBe(false);
});
