import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamView } from "../src/features/modules/engagement/TeamView";
import type { EngagementTask } from "../src/shared/capiro/operations/engagement";

const state = vi.hoisted(() => ({
  tasks: {
    data: [] as EngagementTask[],
    loading: false,
    error: undefined as Error | undefined,
  },
  people: {
    data: [] as { id: string; name: string }[],
    loading: false,
    error: undefined as Error | undefined,
  },
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (key: string) => {
    if (key === "engagement.tasks") return { ...state.tasks, reload: vi.fn() };
    if (key === "settings.tenantMembers")
      return { ...state.people, reload: vi.fn() };
    throw new Error(`Unexpected query: ${key}`);
  },
}));
const ownerId = "60000000-0000-4000-8000-000000000001";
const closedOwnerId = "60000000-0000-4000-8000-000000000002";
const doneOwnerId = "60000000-0000-4000-8000-000000000003";
const task: EngagementTask = {
  id: "51000000-0000-4000-8000-000000000001",
  title: "Synthetic follow-up",
  status: "todo",
  dueDate: "2026-10-01T16:00:00Z",
  description: null,
  ownerUserId: ownerId,
  client: {
    id: "30000000-0000-4000-8000-000000000001",
    name: "Synthetic visible client",
  },
};
const render = () =>
  renderToStaticMarkup(createElement(TeamView, { clientId: "" }));
function bodyRows(html: string) {
  return Array.from(html.matchAll(/<tr>(.*?)<\/tr>/gs), ([, row]) =>
    Array.from(row!.matchAll(/<td[^>]*>(.*?)<\/td>/gs), ([, cell]) => cell),
  ).filter((row) => row.length);
}
beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-08T16:00:00Z"));
  Object.assign(state.tasks, {
    data: [task],
    loading: false,
    error: undefined,
  });
  Object.assign(state.people, {
    data: [
      { id: ownerId, name: "Synthetic follow-up owner" },
      { id: closedOwnerId, name: "Synthetic closed-only owner" },
      { id: doneOwnerId, name: "Synthetic done-only owner" },
    ],
    loading: false,
    error: undefined,
  });
});
afterEach(() => vi.restoreAllMocks());

describe("Engagement Team follow-up workload presentation", () => {
  it("omits closed-only owners and counts open, unassigned and overdue work", () => {
    state.tasks.data = [
      task,
      {
        ...task,
        id: "current",
        status: "in_progress",
        dueDate: "2026-10-08T16:00:00Z",
      },
      {
        ...task,
        id: "future",
        status: "blocked",
        dueDate: "2026-10-09T16:00:00Z",
      },
      { ...task, id: "done", status: "done" },
      {
        ...task,
        id: "canceled",
        ownerUserId: closedOwnerId,
        status: "canceled",
      },
      { ...task, id: "unassigned", ownerUserId: null, client: null },
      { ...task, id: "done-only", ownerUserId: doneOwnerId, status: "done" },
    ];
    const html = render();
    expect(bodyRows(html)).toEqual([
      [
        "Synthetic follow-up owner",
        "Synthetic visible client",
        "3",
        "1 overdue",
      ],
      ["Unassigned", "Unassigned", "1", "1 overdue"],
    ]);
    expect(html).not.toContain("Synthetic closed-only owner");
    expect(html).not.toContain("Synthetic done-only owner");
  });

  it("retains workload while member names are loading", () => {
    state.people.data = [];
    state.people.loading = true;
    const html = render();
    expect(html).toMatch(/role="status"[^>]*>Loading team member names…<\/p>/);
    expect(bodyRows(html)).toEqual([
      ["Team member", "Synthetic visible client", "1", "1 overdue"],
    ]);
  });

  it("shows a separate member-name failure and retry while retaining workload", () => {
    state.people.data = [];
    state.people.error = new Error("Synthetic member lookup unavailable");
    const html = render();
    expect(html).toContain('role="alert"');
    expect(html).toContain(
      "Team member names unavailable: Synthetic member lookup unavailable",
    );
    expect(html).toMatch(/<button[^>]*>Retry team member names<\/button>/);
    expect(bodyRows(html)).toEqual([
      ["Team member", "Synthetic visible client", "1", "1 overdue"],
    ]);
  });

  it("does not present supplied task data after a failed task read", () => {
    state.tasks.error = new Error("Synthetic task access denied");
    const html = render();
    expect(html).toContain("Synthetic task access denied");
    expect(html).not.toContain("Engagement follow-up owners");
    expect(html).not.toContain("1 overdue");
  });

  it("shows an empty workload when every follow-up is closed", () => {
    state.tasks.data = [
      { ...task, status: "done" },
      {
        ...task,
        id: "canceled",
        ownerUserId: closedOwnerId,
        status: "canceled",
      },
    ];
    const html = render();
    expect(html).toContain("No records found");
    expect(html).not.toContain("Synthetic follow-up owner");
    expect(html).not.toContain("Synthetic closed-only owner");
  });
});
