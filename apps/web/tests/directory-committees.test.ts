import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { CommitteesScreen } from "../src/features/modules/directory/committees/CommitteesScreen";
import { committeeDirectoryHref } from "../src/features/modules/directory/public";

const state = vi.hoisted(() => ({
  search: "",
  push: vi.fn(),
  requests: [] as { operation: string; enabled: boolean }[],
  tabs: new Map<string, (id: string) => void>(),
  actions: new Map<string, () => void>(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(state.search),
  useRouter: () => ({ push: state.push }),
}));
vi.mock("../src/features/modules/intelligence/legiwatch/public", () => ({
  SourceLink: ({ children }: { children: ReactNode }) =>
    createElement("span", null, children),
  hearingDate: () => "Oct 31",
  displayTime: () => "10 AM",
}));
vi.mock("../src/shared/module-ui", () => ({
  ActionButton: ({
    children,
    onClick,
  }: {
    children: string;
    onClick: () => void;
  }) => {
    state.actions.set(children, onClick);
    return createElement("button", { onClick }, children);
  },
  Tabs: ({
    label,
    value,
    items,
    onChange,
  }: {
    label: string;
    value: string;
    items: { id: string; label: string }[];
    onChange: (id: string) => void;
  }) => {
    state.tabs.set(label, onChange);
    return createElement(
      "nav",
      { "aria-label": label },
      items.map((item) =>
        createElement(
          "button",
          { key: item.id, "aria-selected": item.id === value },
          item.label,
        ),
      ),
    );
  },
  StatusPanel: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  Badge: ({ children }: { children: ReactNode }) =>
    createElement("span", null, children),
  Field: ({ children }: { children: ReactNode }) =>
    createElement("label", null, children),
  TextInput: () => createElement("input"),
  DataTable: () => null,
  Modal: () => null,
}));
vi.mock("../src/shared/capiro/queries", () => {
  const event = {
    id: "hearing-one",
    title: "Synthetic proceeding",
    eventStatus: "SCHEDULED",
    date: "2026-10-31",
    startsAt: null,
    time: null,
    visibility: "public",
  };
  const federal = {
    systemCode: "committee-one",
    name: "Synthetic federal committee",
    chamber: "House",
    isSubcommittee: false,
    sourceHealth: "healthy",
    following: false,
    upcomingEventCount: 1,
    recentEventCount: 0,
  };
  const florida = {
    id: "fl-one",
    name: "Synthetic Florida committee",
    chamber: "Senate",
    state: "FL",
    legislativeSession: "2026",
    sourceUrl: null,
  };
  const responses: Record<string, unknown> = {
    "legiwatch.committees": {
      rows: [federal],
      parentCount: 1,
      subcommitteeCount: 0,
      asOf: "2026-10-31T00:00:00Z",
    },
    "legiwatch.stateCommittees": [florida],
    "legiwatch.committee": {
      ...federal,
      upcomingEvents: [event],
      recentEvents: [],
      subcommittees: [],
      members: [],
      updates: [],
    },
    "legiwatch.stateCommittee": {
      body: florida,
      rosterStatus: "unqualified",
      members: [],
      sourceCoverage: [],
      upcomingEvents: { rows: [event], total: 1 },
      recentEvents: { rows: [], total: 0 },
      referredBills: { rows: [], total: 0, page: 1, pageSize: 25 },
      updates: { rows: [] },
    },
    "clients.list": [],
  };
  return {
    useCapiroQuery: (
      operation: string,
      _input: unknown,
      options?: { enabled: boolean },
    ) => {
      const enabled = options?.enabled !== false;
      state.requests.push({ operation, enabled });
      return {
        data: enabled ? responses[operation] : undefined,
        loading: false,
        reload: vi.fn(),
      };
    },
    useCapiroMutation: () => ({ run: vi.fn(), pending: false }),
  };
});

beforeEach(() => {
  state.search = "view=committees&clientId=client-hint";
  state.push.mockReset();
  state.requests = [];
  state.tabs.clear();
  state.actions.clear();
});

const render = () => renderToStaticMarkup(createElement(CommitteesScreen));

it("loads the federal catalog by default and writes State selection into the URL", () => {
  const html = render();
  expect(html).toContain("Synthetic federal committee");
  expect(html).not.toContain("Synthetic Florida committee");
  expect(state.requests).toEqual([
    { operation: "legiwatch.committees", enabled: true },
    { operation: "legiwatch.stateCommittees", enabled: false },
  ]);
  state.tabs.get("Committee jurisdiction")!("FL");
  expect(state.push).toHaveBeenCalledWith(
    "/modules/directory?view=committees&clientId=client-hint&jurisdiction=FL",
    { scroll: false },
  );
});

it("restores State selection and clearly limits its room coverage to Florida", () => {
  state.search += "&jurisdiction=FL";
  const html = render();
  expect(html).toContain("State committee rooms currently cover Florida.");
  expect(html).toContain("Synthetic Florida committee");
  expect(html).not.toContain("Synthetic federal committee");
  expect(
    state.requests.find((item) => item.operation === "legiwatch.committees")
      ?.enabled,
  ).toBe(false);
  state.actions.get("Open committee")!();
  expect(state.push).toHaveBeenCalledWith(
    committeeDirectoryHref("state:FL:fl-one", "client-hint"),
    { scroll: false },
  );
});

it("restores the former state-committees destination as the Florida catalog", () => {
  state.search = "view=state-committees&clientId=client-hint";
  expect(render()).toContain("Synthetic Florida committee");
  state.actions.get("Open committee")!();
  expect(state.push).toHaveBeenCalledWith(
    committeeDirectoryHref("state:FL:fl-one", "client-hint"),
    { scroll: false },
  );
});

it.each([
  ["committee-one", "US", "Synthetic federal committee"],
  ["state:FL:fl-one", "FL", "Synthetic Florida committee"],
])(
  "opens the exact committee room and returns to its jurisdiction: %s",
  (id, jurisdiction, title) => {
    state.search += `&committeeId=${encodeURIComponent(id)}`;
    expect(render()).toContain(title);
    expect(
      state.requests
        .filter(
          (item) =>
            item.operation === "legiwatch.committees" ||
            item.operation === "legiwatch.stateCommittees",
        )
        .every((item) => !item.enabled),
    ).toBe(true);
    state.actions.get("Committee directory")!();
    const href = state.push.mock.calls.at(-1)![0] as string;
    const url = new URL(href, "https://example.test");
    expect(url.pathname).toBe("/modules/directory");
    expect(url.searchParams.get("jurisdiction")).toBe(jurisdiction);
    expect(url.searchParams.get("committeeId")).toBeNull();
    expect(url.searchParams.get("clientId")).toBe("client-hint");
  },
);

it("opens a committee proceeding in LegiWatch while preserving the client hint", () => {
  state.search += "&committeeId=committee-one";
  render();
  state.actions.get("Open hearing")!();
  expect(state.push).toHaveBeenCalledWith(
    "/modules/intelligence?view=legiwatch&lw=hearings&hearingId=hearing-one&clientId=client-hint",
    { scroll: false },
  );
});

it("encodes committee destinations without carrying unrelated LegiWatch state", () => {
  expect(committeeDirectoryHref("state:FL:fl-one", "client-hint")).toBe(
    "/modules/directory?view=committees&jurisdiction=FL&committeeId=state%3AFL%3Afl-one&clientId=client-hint",
  );
  expect(committeeDirectoryHref("committee-one")).toBe(
    "/modules/directory?view=committees&jurisdiction=US&committeeId=committee-one",
  );
});
