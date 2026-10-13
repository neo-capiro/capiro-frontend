import { describe, expect, it, vi } from "vitest";
import { Temporal } from "temporal-polyfill";
import {
  meetingSchema,
  prepItemSchema,
  taskSchema,
} from "../src/features/portfolio/calendar/contracts";
import type { ApiClient } from "../src/shared/portfolio/api/http";
import {
  calendarRange,
  dateTimeInstant,
  instantDay,
  moveDate,
  validDay,
} from "../src/features/portfolio/calendar/range";
import {
  deduplicate,
  fetchHearings,
  fetchPlanner,
  fetchMeetings,
} from "../src/features/portfolio/calendar/feeds";
describe("verified preparation contract", () => {
  it("binds attributed preparation to its enclosing meeting and client", () => {
    const prep = {
      id: "prep-1",
      status: "approved",
      summary: null,
      agenda: [],
      talkingPoints: [],
      risks: [],
      followUps: [],
      createdAt: "2026-10-11T12:00:00Z",
    };
    const meeting = {
      id: "meeting-1",
      subject: "Synthetic meeting",
      description: null,
      location: null,
      startsAt: "2026-10-12T12:00:00Z",
      endsAt: "2026-10-12T13:00:00Z",
      status: "scheduled",
      joinLink: null,
      visibility: "private",
      isVirtual: false,
      meri: null,
      client: { id: "client-1", name: "Synthetic client" },
      attendees: [],
      preps: [prep],
    };
    expect(meetingSchema.safeParse(meeting).success).toBe(true);
    const attributed = {
      ...prep,
      meetingId: meeting.id,
      clientId: meeting.client.id,
    };
    expect(
      meetingSchema.safeParse({ ...meeting, preps: [attributed] }).success,
    ).toBe(true);
    for (const incorrect of [
      { ...attributed, meetingId: "another-meeting" },
      { ...attributed, clientId: "another-client" },
      { ...attributed, clientId: null },
    ]) {
      expect(
        meetingSchema.safeParse({ ...meeting, preps: [incorrect] }).success,
      ).toBe(false);
    }
    expect(
      meetingSchema.safeParse({
        ...meeting,
        client: null,
        preps: [{ ...prep, clientId: null }],
      }).success,
    ).toBe(true);
  });
  it("preserves comprehensive evidence-linked items and legacy edited text", () => {
    const comprehensive = {
      text: "Review the synthetic deadline",
      factIds: ["fact-1"],
    };
    expect(prepItemSchema.parse(comprehensive)).toEqual(comprehensive);
    const saved = {
      text: "Review the synthetic evidence",
      evidenceReferences: ["source-1"],
    };
    const agenda = {
      title: "Synthetic agenda",
      description: "Discuss the project",
    };
    const followUp = { ...agenda, dueDate: "2026-10-20" };
    expect(prepItemSchema.parse(saved)).toEqual(saved);
    expect(prepItemSchema.parse(agenda)).toEqual(agenda);
    expect(prepItemSchema.parse(followUp)).toEqual(followUp);
    expect(prepItemSchema.parse("Edited preparation")).toBe(
      "Edited preparation",
    );
    expect(
      prepItemSchema.safeParse({ text: "Missing source metadata" }).success,
    ).toBe(false);
    expect(prepItemSchema.safeParse({ text: {}, factIds: [] }).success).toBe(
      false,
    );
  });
});
describe("calendar ranges and source dates", () => {
  it("uses an exclusive end and honors spring daylight saving", () => {
    const range = calendarRange("2026-03-08", "week", "America/New_York");
    expect(range.startDay).toBe("2026-03-08");
    expect(range.endDay).toBe("2026-03-15");
    expect(range.from).toBe("2026-03-08T05:00:00Z");
    expect(range.to).toBe("2026-03-15T04:00:00Z");
    expect(
      Temporal.Instant.from(range.to).epochMilliseconds -
        Temporal.Instant.from(range.from).epochMilliseconds,
    ).toBe(167 * 3600000);
  });
  it("does not parse all-day values as UTC instants", () => {
    expect(validDay("2026-03-08")).toBe("2026-03-08");
    expect(validDay("2026-02-30")).toBeUndefined();
    expect(instantDay("2026-03-08T01:00:00Z", "America/Los_Angeles")).toBe(
      "2026-03-07",
    );
  });
  it("preserves the chosen local timezone for a timed Planner item", () =>
    expect(dateTimeInstant("2026-07-01", "09:30", "America/New_York")).toBe(
      "2026-07-01T13:30:00Z",
    ));
  it("clamps month navigation and moves weeks by calendar days", () => {
    expect(moveDate("2026-01-31", "month", 1)).toBe("2026-02-28");
    expect(moveDate("2026-03-08", "week", 1)).toBe("2026-03-15");
  });
  it("deduplicates stable provenance IDs without merging different activities", () => {
    const meeting = {
      key: "meeting:1",
      kind: "meeting" as const,
      sourceId: "1",
      title: "Same title",
      day: "2026-01-01",
      timeZone: "UTC",
      provenance: "meetings",
    };
    const hearing = {
      ...meeting,
      key: "hearing:1",
      kind: "hearing" as const,
      provenance: "public",
    };
    expect(deduplicate([meeting, hearing, meeting])).toEqual([
      meeting,
      hearing,
    ]);
  });
});
describe("permission-preserving feed composition", () => {
  it("omits clientId for Master scope and includes it only for selected client scope", async () => {
    const request = vi.fn().mockResolvedValue([]);
    const api = { request } as ApiClient;
    await fetchMeetings(
      api,
      "2026-01-01T00:00:00Z",
      "2026-02-01T00:00:00Z",
      "UTC",
    );
    expect(request.mock.calls[0]?.[1]).not.toContain("clientId");
    await fetchMeetings(
      api,
      "2026-01-01T00:00:00Z",
      "2026-02-01T00:00:00Z",
      "UTC",
      "client-1",
    );
    expect(request.mock.calls[1]?.[1]).toContain("clientId=client-1");
  });
  it("loads all hearing pages with an inclusive source end date", async () => {
    const row = (id: string) => ({
      id,
      title: "Synthetic hearing",
      date: "2026-01-31",
      startsAt: null,
      timezone: "America/New_York",
      eventStatus: "SCHEDULED",
      officialPageUrl: null,
    });
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [row("a")],
        total: 201,
        page: 1,
        pageSize: 200,
      })
      .mockResolvedValueOnce({
        rows: [row("b")],
        total: 201,
        page: 2,
        pageSize: 200,
      });
    const result = await fetchHearings(
      { request } as ApiClient,
      "2026-01-01",
      "2026-02-01",
    );
    expect(request.mock.calls[0]?.[1]).toContain("to=2026-01-31");
    expect(request.mock.calls[1]?.[1]).toContain("page=2");
    expect(result.items.map((item) => item.day)).toEqual([
      "2026-01-31",
      "2026-01-31",
    ]);
    expect(result.limitations).toHaveLength(1); // Deliberately inconsistent test total is surfaced.
  });
  it("traverses every Planner page before filtering due dates; never uses the five-item queue", async () => {
    const task = (id: string, dueOn: string | null) => ({
      id,
      name: id,
      status: "todo",
      archived: false,
      dueOn,
      startOn: null,
      clientId: null,
    });
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        items: [task("outside", "2025-12-31")],
        nextCursor: "cursor-1",
      })
      .mockResolvedValueOnce({
        items: [task("inside", "2026-01-31"), task("undated", null)],
        nextCursor: null,
      });
    const result = await fetchPlanner(
      { request } as ApiClient,
      "2026-01-01",
      "2026-02-01",
    );
    expect(request.mock.calls[1]?.[1]).toBe("planner/tasks?cursor=cursor-1");
    expect(result.items.map((item) => item.sourceId)).toEqual(["inside"]);
    expect(result.limitations).toEqual([]);
  });
  it("reports repeated cursors as incomplete instead of silently claiming a full feed", async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ items: [], nextCursor: "same" });
    const result = await fetchPlanner(
      { request } as ApiClient,
      "2026-01-01",
      "2026-02-01",
    );
    expect(request).toHaveBeenCalledTimes(2);
    expect(result.limitations).toHaveLength(1);
  });
});

describe("Planner scheduled starts and deadlines", () => {
  const task = {
    id: "task-start",
    name: "Synthetic scheduled work",
    status: "todo",
    archived: false,
    startOn: "2026-10-12",
    dueOn: null,
    startTime: null,
    dueTime: null,
    timeZone: null,
    clientId: "client-1",
  };
  async function calendarFor(rows: unknown[]) {
    return fetchPlanner(
      {
        request: vi.fn().mockResolvedValue({ items: rows, nextCursor: null }),
      } as unknown as ApiClient,
      "2026-10-01",
      "2026-11-01",
    );
  }
  it.each([
    { startOn: "2026-02-30" },
    { startTime: "25:00", timeZone: "UTC" },
    { startTime: "09:00", timeZone: null },
    { startTime: "09:00", timeZone: "Not/A_Timezone" },
    { startOn: null, startTime: "09:00", timeZone: "UTC" },
  ])(
    "refuses malformed or unzoned source dates instead of inventing a time",
    (invalid) => {
      expect(taskSchema.safeParse({ ...task, ...invalid }).success).toBe(false);
    },
  );
  it("retains a scheduled task with no due date without inventing midnight", async () => {
    const feed = await calendarFor([task]);
    expect(feed.items).toEqual([
      {
        key: "planner:task-start:start",
        kind: "planner",
        sourceId: task.id,
        title: task.name,
        day: "2026-10-12",
        timeZone: "UTC",
        clientId: "client-1",
        status: "todo",
        provenance: "Planner tasks you can access; scheduled start",
      },
    ]);
  });
  it("preserves separate start and due occurrences of one task", async () => {
    const feed = await calendarFor([{ ...task, dueOn: "2026-10-16" }]);
    expect(feed.items.map((item) => [item.key, item.day])).toEqual([
      ["planner:task-start:start", "2026-10-12"],
      ["planner:task-start:due", "2026-10-16"],
    ]);
    expect(deduplicate(feed.items)).toHaveLength(2);
    expect(feed.items.map((item) => item.sourceId)).toEqual([task.id, task.id]);
  });
  it("combines identical date-only start/due occurrences with both meanings", async () => {
    const feed = await calendarFor([{ ...task, dueOn: task.startOn }]);
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0]).toMatchObject({
      key: "planner:task-start:due",
      day: "2026-10-12",
      provenance: "Planner tasks you can access; scheduled start and due date",
    });
    expect(feed.items[0]).not.toHaveProperty("startAt");
  });
  it("retains distinct same-day start/due times in their supplied source zone", async () => {
    const feed = await calendarFor([
      {
        ...task,
        dueOn: task.startOn,
        startTime: "09:00",
        dueTime: "17:00",
        timeZone: "America/Los_Angeles",
      },
    ]);
    expect(feed.items.map((item) => item.startAt)).toEqual([
      "2026-10-12T16:00:00Z",
      "2026-10-13T00:00:00Z",
    ]);
    expect(feed.items.map((item) => item.day)).toEqual([
      "2026-10-12",
      "2026-10-12",
    ]);
  });
  it("filters each occurrence independently at exclusive range boundaries", async () => {
    const feed = await calendarFor([
      { ...task, startOn: "2026-09-30", dueOn: "2026-10-01" },
      { ...task, id: "end-edge", startOn: "2026-10-31", dueOn: "2026-11-01" },
      { ...task, id: "archived", archived: true },
    ]);
    expect(feed.items.map((item) => [item.key, item.day])).toEqual([
      ["planner:task-start:due", "2026-10-01"],
      ["planner:end-edge:start", "2026-10-31"],
    ]);
  });
});
