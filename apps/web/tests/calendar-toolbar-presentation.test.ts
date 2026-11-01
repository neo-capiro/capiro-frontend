import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { CalendarItem } from "../src/features/portfolio/calendar/contracts";

const feed = vi.hoisted(() => ({
  isSuccess: true,
  isFetching: false,
  error: null as Error | null,
  data: { items: [] as CalendarItem[] },
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("date=2026-11-01&zone=UTC"),
  usePathname: () => "/portfolio/synthetic-client/calendar",
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("@/features/portfolio/index/public", () => ({
  useClients: () => ({
    isSuccess: true,
    isFetching: false,
    data: [{ id: "synthetic-client", name: "Synthetic client" }],
  }),
}));
vi.mock("@/features/portfolio/client-profile/public", () => ({
  ClientViewSwitcher: () => null,
}));
vi.mock("../src/features/portfolio/calendar/queries", () => ({
  useCalendarFeeds: () => ({ meetings: feed }),
}));

import { ClientCalendarToolbar } from "../src/features/portfolio/calendar/CalendarPageControls";
import { useCalendarPageState } from "../src/features/portfolio/calendar/useCalendarPageState";

const meeting: CalendarItem = {
  key: "meeting:synthetic-meeting",
  kind: "meeting",
  sourceId: "synthetic-meeting",
  title: "Synthetic meeting",
  day: "2026-11-01",
  timeZone: "UTC",
  clientId: "synthetic-client",
  provenance: "Synthetic fixture",
};

// Use the real state owner for feed status; model the displayed result after a local filter.
function ToolbarFixture({ filter }: { filter: "none" | "hidden" | "search" }) {
  const state = useCalendarPageState("synthetic-client");
  return createElement(ClientCalendarToolbar, {
    state: {
      ...state,
      hidden: filter === "hidden" ? ["meeting"] : [],
      search: filter === "search" ? "Unmatched search" : "",
      items: filter === "none" ? state.items : [],
    },
  });
}

it.each([
  "empty",
  "hidden",
  "search",
  "loading",
  "refetching",
  "error",
  "populated",
] as const)(
  "points to Meeting Library without claiming a verified empty range when %s",
  (scenario) => {
    feed.isSuccess = scenario !== "loading" && scenario !== "error";
    feed.isFetching = scenario === "loading" || scenario === "refetching";
    feed.error =
      scenario === "error" ? new Error("Synthetic unavailable") : null;
    // Hidden/search have a real source item; refetch/error also retain stale cached data.
    feed.data = {
      items: scenario === "empty" || scenario === "loading" ? [] : [meeting],
    };
    const markup = renderToStaticMarkup(
      createElement(ToolbarFixture, {
        filter:
          scenario === "hidden" || scenario === "search" ? scenario : "none",
      }),
    );
    expect(markup).toContain(
      scenario === "populated" ? "1 meeting" : "0 meetings",
    );
    expect(markup).toContain("Use Meeting Library to review this client");
    expect(markup).toContain("meetings across dates");
    expect(markup).not.toContain("No meetings fall in this view");
    expect(markup).not.toContain("lists every meeting");
    if (scenario === "hidden") expect(markup).toContain('aria-pressed="false"');
  },
);
