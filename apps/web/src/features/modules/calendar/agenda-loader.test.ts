import { expect, it } from "vitest";
import {
  commentPage,
  commentRecord,
} from "../../../../tests/comment-calendar-fixtures";
import { createCapiroApi } from "../../../shared/capiro/http";
import { capiroOperations } from "../../../shared/capiro/registry";
import { loadAgendaSources, loadFunding, loadPlanner } from "./agenda-loader";
import { calendarRange } from "./range";

const task = {
  id: "51000000-0000-4000-8000-000000000001",
  name: "Synthetic work",
  description: "",
  ownerId: "test-user",
  assigneeId: null,
  version: 1,
  archived: false,
  status: "todo",
  priority: "none",
  subtype: "task",
  approval: "pending",
  startOn: null,
  dueOn: "2026-10-07",
  parentId: null,
  dependencies: [],
  collaborators: [],
  tags: [],
  memberships: [],
  customValues: {},
  estimateMinutes: 0,
  actualMinutes: 0,
  recurrence: null,
  clientId: null,
  meetingId: null,
  completedAt: null,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  access: "admin",
};
const funding = {
  opportunities: [],
  page: 1,
  pageSize: 100,
  total: 0,
  totalIsCapped: false,
  catalogComplete: true,
  counts: { grants: 0, contracts: 0, active: 0, closed: 0 },
  emptyReason: null,
  generatedAt: "2026-10-01T00:00:00Z",
  freshness: [],
};
function fixtureApi(
  resolve: (key: string, input: { query?: Record<string, string> }) => Response,
) {
  return createCapiroApi(capiroOperations, {
    fetcher: async (request) => {
      const url = new URL(String(request), "https://fixture.example.test");
      return resolve(
        decodeURIComponent(url.pathname.split("/").at(-1)!),
        JSON.parse(url.searchParams.get("input") ?? "{}"),
      );
    },
  });
}

it("loads all Planner cursors and reports repeated cursors without claiming complete coverage", async () => {
  const cursors: (string | undefined)[] = [];
  const api = fixtureApi((key, input) => {
    expect(key).toBe("planner.tasks");
    cursors.push(input.query?.cursor);
    return Response.json({
      items: [
        {
          ...task,
          id:
            cursors.length === 1
              ? task.id
              : "51000000-0000-4000-8000-000000000002",
        },
      ],
      nextCursor: "51000000-0000-4000-8000-000000000099",
    });
  });
  const result = await loadPlanner(api, new AbortController().signal);
  expect(cursors).toEqual([undefined, "51000000-0000-4000-8000-000000000099"]);
  expect(result.items).toHaveLength(2);
  expect(result.warning).toContain("repeated a cursor");
});

it("keeps permitted successful source rows when another source fails and filters civil dates locally", async () => {
  const range = calendarRange("2026-10-08", "agenda");
  const api = fixtureApi((key) => {
    switch (key) {
      case "planner.tasks":
        return Response.json({
          items: [
            task,
            {
              ...task,
              id: "51000000-0000-4000-8000-000000000002",
              name: "Outside selected range",
              dueOn: "2026-12-01",
            },
          ],
          nextCursor: null,
        });
      case "legiwatch.calendar":
        return Response.json({ rows: [], total: 0, page: 1, pageSize: 200 });
      case "calendar.commentDeadlineCalendar":
        return Response.json(
          commentPage(
            [
              {
                ...commentRecord("2026-TEST-1", "2026-10-09"),
                title: "Synthetic comment deadline",
              },
            ],
            range.firstDay,
            range.lastDay,
          ),
        );
      default:
        return Response.json(
          { message: "Synthetic unavailable funding source" },
          { status: 503 },
        );
    }
  });
  const result = await loadAgendaSources(
    api,
    range,
    new AbortController().signal,
  );
  expect(result.items.map((item) => item.title)).toEqual([
    "Synthetic work",
    "Synthetic comment deadline",
  ]);
  expect(
    result.warnings.some((warning) =>
      warning.startsWith("Funding deadlines unavailable:"),
    ),
  ).toBe(true);
  expect(
    result.warnings.some((warning) =>
      warning.includes("coverage is incomplete"),
    ),
  ).toBe(true);
});

it("retains the funding source completeness signal even for an empty deadline page", async () => {
  const api = fixtureApi(() =>
    Response.json({ ...funding, catalogComplete: false, totalIsCapped: true }),
  );
  const result = await loadFunding(
    api,
    calendarRange("2026-10-08", "agenda"),
    new AbortController().signal,
  );
  expect(result.items).toEqual([]);
  expect(result.warning).toContain("incomplete or capped coverage");
});
