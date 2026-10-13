import { describe, expect, it, vi } from "vitest";
import { Temporal } from "temporal-polyfill";
import {
  calendarRange,
  moveDate,
  type CalendarView,
} from "../src/features/portfolio/calendar/range";
import { fetchMeetings } from "../src/features/portfolio/calendar/feeds";
import type { ApiClient } from "../src/shared/portfolio/api/http";

// The cast permits executing this new requirement against the pre-Day baseline.
const day = "day" as CalendarView;

describe("Day calendar uses the selected civil date", () => {
  it.each([
    [
      "2026-03-08",
      "America/New_York",
      "2026-03-08T05:00:00Z",
      "2026-03-09T04:00:00Z",
      23,
    ],
    [
      "2026-11-01",
      "America/New_York",
      "2026-11-01T04:00:00Z",
      "2026-11-02T05:00:00Z",
      25,
    ],
    [
      "2026-03-08",
      "America/Los_Angeles",
      "2026-03-08T08:00:00Z",
      "2026-03-09T07:00:00Z",
      23,
    ],
    [
      "2026-11-01",
      "America/Los_Angeles",
      "2026-11-01T07:00:00Z",
      "2026-11-02T08:00:00Z",
      25,
    ],
    ["2028-02-29", "UTC", "2028-02-29T00:00:00Z", "2028-03-01T00:00:00Z", 24],
    [
      "2026-12-31",
      "Pacific/Honolulu",
      "2026-12-31T10:00:00Z",
      "2027-01-01T10:00:00Z",
      24,
    ],
  ] as const)(
    "%s in %s has exact midnight boundaries",
    (date, zone, from, to, hours) => {
      const range = calendarRange(date, day, zone);
      expect(range).toEqual({
        startDay: date,
        endDay: Temporal.PlainDate.from(date).add({ days: 1 }).toString(),
        from,
        to,
      });
      expect(
        Temporal.Instant.from(range.to).epochMilliseconds -
          Temporal.Instant.from(range.from).epochMilliseconds,
      ).toBe(hours * 3600000);
    },
  );

  it.each([
    ["2028-02-28", 1, "2028-02-29"],
    ["2028-03-01", -1, "2028-02-29"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2027-01-01", -1, "2026-12-31"],
    ["2026-03-08", 1, "2026-03-09"],
    ["2026-11-01", -1, "2026-10-31"],
  ])("moves %s by %s civil day", (date, direction, expected) => {
    expect(moveDate(String(date), day, Number(direction))).toBe(expected);
  });

  it.each([undefined, "synthetic-client"])(
    "uses the existing native starts-in-range feed for scope %s",
    async (clientId) => {
      const range = calendarRange("2026-11-01", day, "America/New_York");
      const request = vi.fn().mockResolvedValue([]);
      const signal = new AbortController().signal;
      await fetchMeetings(
        { request } as unknown as ApiClient,
        range.from,
        range.to,
        "America/New_York",
        clientId,
        signal,
      );
      expect(request).toHaveBeenCalledTimes(1);
      const [service, path, , options] = request.mock.calls[0]!;
      const url = new URL(path, "https://synthetic.invalid/");
      expect(service).toBe("core");
      expect(url.pathname).toBe("/engagement/meetings");
      expect(Object.fromEntries(url.searchParams)).toEqual({
        from: "2026-11-01T04:00:00Z",
        to: "2026-11-02T05:00:00Z",
        ...(clientId ? { clientId } : {}),
      });
      expect(options).toEqual({ signal });
    },
  );
});
