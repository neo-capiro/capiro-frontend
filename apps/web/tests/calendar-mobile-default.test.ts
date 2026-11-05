import { expect, it } from "vitest";
import { initialCalendarView } from "../src/features/portfolio/calendar/range";

it("uses a readable agenda on narrow screens without overriding explicit calendar views", () => {
  expect(initialCalendarView(null, false)).toBe("month");
  expect(initialCalendarView(null, true)).toBe("agenda");
  expect(initialCalendarView("month", true)).toBe("month");
  expect(initialCalendarView("week", true)).toBe("week");
  expect(initialCalendarView("day", true)).toBe("day");
  expect(initialCalendarView("agenda", false)).toBe("agenda");
  expect(initialCalendarView("unexpected", true)).toBe("agenda");
});
