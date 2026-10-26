import type { Page } from "@playwright/test";
import type { HillDayJobStatus } from "../../src/shared/capiro/operations/workspace-hillday";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import {
  client,
  clientId,
  otherClient,
  otherClientId,
} from "./next-modules-fixtures";

export const documentId = "51000000-0000-4000-8000-000000000011";
export const jobId = "52000000-0000-4000-8000-000000000011";
export const at = "2026-10-26T12:00:00.000Z";
export const resumeUrl = (phase = "generate") =>
  `/modules/workspace?clientId=${clientId}&view=hillday&hilldayId=${documentId}&hilldayPhase=${phase}`;
const section = (number: number, eventId: string) => ({
  sectionId: `meeting-${number}`,
  meetingId: `meeting-${number}`,
  eventId,
  number,
  time: "10:00 AM",
  duration: "30 min",
  member: `Saved meeting ${number}`,
  subline: "Synthetic office",
  focus: "Manual edited focus retained",
  background: "Saved background",
  status: "done",
  reason: null,
  facts: [],
  flags: [],
  edited: { focus: true, background: false, at },
});
export const savedDocument = () => ({
  id: documentId,
  name: "Synthetic saved Hill Day",
  status: "draft",
  client: { ...client, mono: "SC", hasLogo: false },
  firm: { name: "Synthetic firm" },
  owner: { id: testIdentity.user.clerkUserId, name: "Test", initials: "T" },
  timeZone: "UTC",
  lookbackDays: 30,
  weekStart: "2026-10-26",
  resolutionStatus: "clean",
  updatedAt: at,
  createdAt: at,
  meetingCount: 2,
  cover: { title: "Synthetic schedule", dateline: "Saved date", facts: [] },
  firstPage: null,
  summary: [],
  summaryColumns: [],
  sections: [section(1, "saved-event"), section(2, "manual-synthetic")],
  provenance: {
    generatedAt: null,
    model: null,
    sourceCounts: [],
    corrections: [],
    failedUnits: 0,
    quality: null,
    totalSources: 0,
  },
  generation: { lastJobId: jobId, status: "running" },
});
export const savedJob = (
  status: HillDayJobStatus["status"] = "running",
): HillDayJobStatus => ({
  jobId,
  documentId,
  status,
  units: [
    {
      meetingId: "meeting-1",
      sectionId: "meeting-1",
      state: "done",
      reason: null,
      at,
    },
    {
      meetingId: "meeting-2",
      sectionId: "meeting-2",
      state: "running",
      reason: null,
      at,
    },
  ],
  quality: null,
  error: null,
  cancelRequestedAt: null as string | null,
  startedAt: at,
  completedAt: null as string | null,
});
export async function hillDayResumeFixture(
  page: Page,
  options: {
    noJob?: boolean;
    loseStart?: boolean;
    holdStart?: boolean;
    loseRetry?: boolean;
    denyLatest?: boolean;
    unavailableLatest?: boolean;
  } = {},
) {
  const document = savedDocument();
  let job: ReturnType<typeof savedJob> | null = options.noJob
    ? null
    : savedJob();
  let identity = structuredClone(testIdentity);
  const calls: {
    key: string;
    method: string;
    input: {
      params?: Record<string, string>;
      query?: Record<string, string>;
      body?: {
        requestId?: string;
        eventIds?: string[];
        weekStart?: string;
        timeZone?: string;
      };
    };
  }[] = [];
  const starts = new Map<string, ReturnType<typeof savedJob>>();
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await onlyLocalRequests(page);
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "me.read": () => identity,
    "clients.list": [client, otherClient],
    "workspace.hillday.document": () => document,
    "workspace.hillday.blueprints": {
      blueprints: [
        {
          id: "synthetic-blueprint",
          slug: "hill-day",
          name: "Hill Day",
          implemented: true,
        },
      ],
    },
    "workspace.hillday.calendar": (input: unknown) => {
      const { query } = input as {
        query: { from: string; to: string; timeZone: string };
      };
      const events = [
        {
          eventId: "saved-event",
          subject: "Saved calendar meeting",
          startsAt: "2026-10-26T09:00:00.000Z",
          endsAt: "2026-10-26T09:30:00.000Z",
          timeZone: "UTC",
          location: "Synthetic room",
          kind: "hill",
          source: "calendar",
          clientId,
          attendees: [],
          reason: { kind: "tagged", detail: "Synthetic", matchedAddresses: [] },
        },
      ];
      return {
        clientId,
        ...query,
        events: events.filter(
          (event) =>
            Date.parse(event.startsAt) >= Date.parse(query.from) &&
            Date.parse(event.startsAt) < Date.parse(query.to),
        ),
        upcomingEventAt: null,
        sources: [],
      };
    },
    "workspace.hillday.context": (input: unknown) => ({
      meetingId: (input as { params: { meetingId: string } }).params.meetingId,
      member: null,
      units: [],
      threads: [],
      lookbackDays: 30,
      sources: [],
      record: {
        note: "Saved meeting context",
        carry: { committees: false, bio: false, issueAreas: [], staffers: [] },
        threadIds: [],
        lookbackDays: 30,
        savedAt: at,
        savedBy: testIdentity.user.clerkUserId,
      },
    }),
    "workspace.hillday.quality": {
      documentId,
      score: 100,
      checks: [],
      computedAt: at,
    },
    "workspace.hillday.meetings": {
      documentId,
      meetings: document.sections.map((section) => ({
        meetingId: section.meetingId,
        eventId: section.eventId,
        ordinal: section.number,
        resolved: true,
        event: {
          eventId: section.eventId,
          subject: section.member,
          startsAt: at,
          endsAt: at,
          timeZone: "UTC",
          location: null,
          kind: "hill",
          source: section.eventId.startsWith("manual-") ? "manual" : "calendar",
          clientId,
          attendees: [],
          reason: {
            kind: "manual",
            detail: "Synthetic saved selection",
            matchedAddresses: [],
          },
        },
      })),
      skipped: [],
      sources: [],
    },
  });
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({
      json: route.request().url().includes(otherClientId)
        ? otherClient
        : client,
    }),
  );
  await page.route("**/api/capiro/workspace.hillday.generation?*", (route) =>
    route.fulfill(
      options.denyLatest
        ? { status: 403, json: { message: "Generation access refused" } }
        : options.unavailableLatest
          ? {
              status: 503,
              json: { message: "Generation temporarily unavailable" },
            }
          : { json: { job } },
    ),
  );
  await page.route("**/api/capiro/workspace.hillday.job?*", (route) =>
    route.fulfill({ json: job }),
  );
  await page.route(
    "**/api/capiro/workspace.hillday.generate",
    async (route) => {
      const request = route.request().postDataJSON();
      const requestId = request.body?.requestId;
      if (starts.has(requestId)) job = starts.get(requestId)!;
      else {
        job = savedJob("queued");
        starts.set(requestId, job);
      }
      if (options.holdStart) await held;
      if (
        options.loseStart &&
        calls.filter((c) => c.key === "workspace.hillday.generate").length === 1
      )
        return route.abort("failed");
      try {
        await route.fulfill({ json: { jobId: job.jobId, status: job.status } });
      } catch {
        /* disposed synthetic route */
      }
    },
  );
  await page.route("**/api/capiro/workspace.hillday.retry", (route) => {
    job = {
      ...job!,
      status: "queued",
      units: job!.units.map((unit) =>
        unit.state === "done" ? unit : { ...unit, state: "queued" },
      ),
    };
    return options.loseRetry
      ? route.abort("failed")
      : route.fulfill({ json: job });
  });
  await page.route("**/api/capiro/workspace.hillday.cancel", (route) => {
    job = { ...job!, cancelRequestedAt: at };
    return route.fulfill({ json: job });
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/capiro/"))
      calls.push({
        key: url.pathname.split("/").pop()!,
        method: request.method(),
        input:
          request.method() === "GET"
            ? JSON.parse(url.searchParams.get("input") ?? "{}")
            : request.postDataJSON(),
      });
  });
  return {
    document,
    calls,
    starts,
    release,
    getJob: () => job,
    setJob: (value: typeof job) => {
      job = value;
    },
    switchActor: async () => {
      identity = {
        ...testIdentity,
        user: {
          ...testIdentity.user,
          id: "10000000-0000-4000-8000-000000000099",
          clerkUserId: "other-test-user",
        },
      };
      await page.evaluate(() =>
        window.dispatchEvent(
          new CustomEvent("test:session", {
            detail: {
              userId: "other-test-user",
              sessionId: "other-test-session",
            },
          }),
        ),
      );
    },
  };
}
