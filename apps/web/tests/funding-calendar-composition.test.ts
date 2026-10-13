import { beforeEach, expect, it, vi } from "vitest";
import { useCalendarFeeds } from "../src/features/portfolio/calendar/queries";

const state = vi.hoisted(() => ({
  queries: [] as {
    queryKey: readonly unknown[];
    enabled?: boolean;
  }[],
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: (typeof state.queries)[number]) => {
    state.queries.push(options);
    return {};
  },
}));
vi.mock("../src/shared/portfolio/api/provider", () => ({
  useApi: () => ({ request: vi.fn() }),
}));

const range = {
  from: "2026-10-01T04:00:00Z",
  to: "2026-11-01T04:00:00Z",
  startDay: "2026-10-01",
  endDay: "2026-11-01",
};
beforeEach(() => {
  state.queries.length = 0;
});

it("composes funding deadlines independently of regulatory comments in Master Agenda", () => {
  useCalendarFeeds(range, "America/New_York", undefined, true);
  expect(
    state.queries.find(({ queryKey }) => queryKey[1] === "funding"),
  ).toMatchObject({ enabled: true });
  expect(
    state.queries.find(({ queryKey }) => queryKey[1] === "deadlines"),
  ).toMatchObject({ enabled: true });
});

it("does not activate funding reads for meeting-only Calendar scopes", () => {
  useCalendarFeeds(range, "America/New_York", "client-one", false);
  expect(
    state.queries.find(({ queryKey }) => queryKey[1] === "funding"),
  ).toMatchObject({ enabled: false });
});

it("separates funding projections for different visible zones and ranges", () => {
  useCalendarFeeds(range, "America/New_York", undefined, true);
  useCalendarFeeds(range, "America/Los_Angeles", undefined, true);
  useCalendarFeeds(
    { ...range, startDay: "2026-10-02" },
    "America/New_York",
    undefined,
    true,
  );
  const keys = state.queries
    .filter(({ queryKey }) => queryKey[1] === "funding")
    .map(({ queryKey }) => JSON.stringify(queryKey));
  expect(keys).toHaveLength(3);
  expect(new Set(keys).size).toBe(3);
});

it("preserves the original client meeting scope and disabled public sources", () => {
  useCalendarFeeds(range, "America/New_York", "client-one", false);
  expect(state.queries[0]?.queryKey).toEqual([
    "calendar",
    "meetings",
    range.from,
    range.to,
    "client-one",
    "America/New_York",
  ]);
  expect(
    state.queries
      .filter(({ queryKey }) => queryKey[1] !== "meetings")
      .every(({ enabled }) => enabled === false),
  ).toBe(true);
});
