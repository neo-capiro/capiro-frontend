import { expect, it } from "vitest";
import { calendarSelection } from "./selection";
const fallback = "2026-10-08";
it.each(["month", "week", "agenda"])(
  "restores a validated %s and civil date from the route",
  (view) => {
    expect(
      calendarSelection(
        new URLSearchParams({ view, date: "2027-02-17" }),
        fallback,
      ),
    ).toEqual({ view, date: "2027-02-17" });
  },
);
it.each([
  "2026-02-30",
  "2026-13-01",
  "2026-10-08T12:00:00Z",
  "../2027-02-17",
  "not-a-date",
  "",
])("rejects invalid civil-date URL hint %s", (date) => {
  expect(
    calendarSelection(
      new URLSearchParams({ view: "unrecognized", date }),
      fallback,
    ),
  ).toEqual({ view: "month", date: fallback });
});
it("retains leap-day civil date without timezone conversion", () => {
  expect(
    calendarSelection(
      new URLSearchParams({ date: "2028-02-29", view: "week" }),
      fallback,
    ),
  ).toEqual({ view: "week", date: "2028-02-29" });
});
