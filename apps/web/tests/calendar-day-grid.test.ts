import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CalendarGrid } from "../src/features/portfolio/calendar/CalendarGrid";
import type { CalendarView } from "../src/features/portfolio/calendar/range";

type ObservedConfig = {
  views: { name: string }[];
  defaultView: string;
  selectedDate: { toString(): string };
  timezone: string;
  dayBoundaries: { start: string; end: string };
  callbacks: {
    onEventClick(event: { id: string }): void;
    onSelectedDateUpdate(date: { toString(): string }): void;
  };
};
const observed = vi.hoisted(() => ({
  config: undefined as ObservedConfig | undefined,
}));
vi.mock("@schedule-x/react", () => ({
  useNextCalendarApp: (config: ObservedConfig) => {
    observed.config = config;
    return undefined;
  },
  ScheduleXCalendar: () => null,
}));
beforeEach(() => {
  observed.config = undefined;
});

function render(view: CalendarView) {
  const onMeeting = vi.fn();
  const onDate = vi.fn();
  const markup = renderToStaticMarkup(
    createElement(CalendarGrid, {
      items: [],
      date: "2026-11-01",
      view,
      zone: "America/Los_Angeles",
      onDate,
      onMeeting,
    }),
  );
  if (!observed.config)
    throw new Error("Calendar did not configure its existing Schedule-X owner");
  return { config: observed.config, markup, onMeeting, onDate };
}

describe("Day view composes the existing Schedule-X calendar", () => {
  it("selects a real Day view and retains the complete local day", () => {
    const { config, markup } = render("day" as CalendarView);
    expect(config.views.map((view) => view.name)).toContain("day");
    expect(config.defaultView).toBe("day");
    expect(config.selectedDate.toString()).toBe("2026-11-01");
    expect(config.timezone).toBe("America/Los_Angeles");
    expect(config.dayBoundaries).toEqual({ start: "00:00", end: "24:00" });
    expect(markup).toContain('data-view="day"');
  });
  it.each([
    ["month", "month-grid"],
    ["week", "week"],
  ] as const)("preserves the %s configuration", (view, expected) => {
    const { config } = render(view);
    expect(config.defaultView).toBe(expected);
    expect(config.dayBoundaries).toEqual({ start: "06:00", end: "22:00" });
  });
  it("preserves meeting and civil date callbacks in Day view", () => {
    const { config, onMeeting, onDate } = render("day" as CalendarView);
    config.callbacks.onEventClick({ id: "meeting:synthetic-meeting" });
    config.callbacks.onSelectedDateUpdate({ toString: () => "2026-11-02" });
    expect(onMeeting).toHaveBeenCalledExactlyOnceWith("synthetic-meeting");
    expect(onDate).toHaveBeenCalledExactlyOnceWith("2026-11-02");
  });
});
