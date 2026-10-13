import { expect, it, vi } from "vitest";
import { fetchUpcomingDeadlines } from "../src/features/portfolio/calendar/feeds";
import { calendarRange } from "../src/features/portfolio/calendar/range";
import {
  commentApi,
  commentPage,
  commentRecord,
} from "./comment-calendar-fixtures";

const read = (
  api: Parameters<typeof fetchUpcomingDeadlines>[0],
  signal?: AbortSignal,
) => fetchUpcomingDeadlines(api, "2026-03-01", "2026-04-01", signal);

it("reads the selected historical civil range with an inclusive native end and no DST shift", async () => {
  const record = commentRecord("2026-12345", "2026-03-08");
  const fixture = commentApi(() => commentPage([record]));
  const range = calendarRange("2026-03-08", "agenda", "America/New_York");
  const result = await fetchUpcomingDeadlines(
    fixture.api,
    range.startDay,
    range.endDay,
  );
  expect(fixture.requests[0]!.pathname).toBe(
    "/api/backend/core/federal-register/comment-deadline-calendar",
  );
  expect(Object.fromEntries(fixture.requests[0]!.searchParams)).toEqual({
    dateFrom: "2026-03-01",
    dateTo: "2026-03-31",
    page: "1",
    limit: "100",
  });
  expect(result.items).toMatchObject([
    {
      key: "deadline:2026-12345",
      sourceId: "2026-12345",
      day: "2026-03-08",
      kind: "deadline",
    },
  ]);
  expect(result.items[0]!.startAt).toBeUndefined();
  expect(result.items[0]!.provenance).toContain(
    "raw publisher value unverified",
  );
});

it("continues candidate paging after an empty accepted page and retains exclusions", async () => {
  const fixture = commentApi((url) => {
    const page = Number(url.searchParams.get("page") ?? 1);
    const result = commentPage(
      page === 1 ? [] : [commentRecord()],
      undefined,
      undefined,
      page,
    );
    return {
      ...result,
      pagination: {
        totalCandidates: 101,
        returned: page === 1 ? 0 : 1,
        excludedOnPage: page === 1 ? 100 : 0,
        hasMoreCandidates: page === 1,
      },
    };
  });
  const result = await read(fixture.api);
  expect(fixture.requests.map((u) => u.searchParams.get("page"))).toEqual([
    "1",
    "2",
  ]);
  expect(result.items).toHaveLength(1);
  expect(result.limitations.join(" ")).toContain("100 excluded");
});

it.each([
  { range: { dateFrom: "2026-02-01", dateTo: "2026-03-31" } },
  { page: 2 },
  { limit: 50 },
  {
    pagination: {
      totalCandidates: 1,
      returned: 0,
      excludedOnPage: 0,
      hasMoreCandidates: false,
    },
  },
  {
    pagination: {
      totalCandidates: 1,
      returned: 1,
      excludedOnPage: 0,
      hasMoreCandidates: true,
    },
  },
  { data: [{ ...commentRecord(), date: "2026-04-01" }] },
  { data: [{ ...commentRecord(), date: "2026-02-30" }] },
  { data: [{ ...commentRecord(), date: "2026-03-08T00:00:00Z" }] },
  { data: [{ ...commentRecord(), precision: "timestamp" }] },
  { data: [{ ...commentRecord(), dateKind: "effective" }] },
  {
    data: [
      {
        ...commentRecord(),
        provenance: {
          ...commentRecord().provenance,
          sourceField: "effective_on",
        },
      },
    ],
  },
  {
    data: [
      {
        ...commentRecord(),
        provenance: {
          ...commentRecord().provenance,
          cachedField: "publicationDate",
        },
      },
    ],
  },
  {
    data: [
      {
        ...commentRecord(),
        provenance: {
          ...commentRecord().provenance,
          rawPublisherValueVerified: true,
        },
      },
    ],
  },
  { coverage: { ...commentPage().coverage, complete: true } },
])(
  "rejects an inconsistent comment range, precision or provenance receipt: %j",
  async (change) => {
    const fixture = commentApi(() => ({ ...commentPage(), ...change }));
    await expect(read(fixture.api)).rejects.toThrow();
  },
);

it("retains cache-only coverage with old read time and failed unfinished ingestion rather than inventing freshness", async () => {
  const fixture = commentApi(() => ({
    ...commentPage(),
    coverage: {
      ...commentPage().coverage,
      asOf: "2020-01-01T00:00:00.000Z",
      latestIngestion: {
        source: "sync-federal-register",
        startedAt: "2019-12-31T12:00:00.000Z",
        finishedAt: null,
        status: "failed",
        rowsUpdated: 0,
        errorCount: 4,
        stats: {},
      },
    },
  }));
  const result = await read(fixture.api);
  expect(result.items).toHaveLength(1);
  expect(result.limitations.join(" ")).toMatch(/coverage is incomplete/);
  expect(result.limitations.join(" ")).toContain(
    "read time, not publisher freshness",
  );
  expect(result.limitations.join(" ")).toMatch(/failed.*4 errors/);
  expect(result.limitations.join(" ")).toContain("not finished");
});

it("bounds100 candidate pages and visibly reports remaining pages even when every accepted page is empty", async () => {
  const fixture = commentApi((url) => ({
    ...commentPage(
      [],
      undefined,
      undefined,
      Number(url.searchParams.get("page") ?? 1),
    ),
    pagination: {
      totalCandidates: 20000,
      returned: 0,
      excludedOnPage: 100,
      hasMoreCandidates: true,
    },
  }));
  const result = await read(fixture.api);
  expect(fixture.requests).toHaveLength(100);
  expect(result.items).toEqual([]);
  expect(result.limitations.join(" ")).toContain("100-page safety limit");
  expect(result.limitations.join(" ")).toContain("10000 excluded");
});

it.each([401, 403, 503])(
  "preserves native%s as an error instead of successful empty data",
  async (status) => {
    const fixture = commentApi(() =>
      Response.json({ message: "Synthetic read denied" }, { status }),
    );
    await expect(read(fixture.api)).rejects.toMatchObject({ status });
  },
);

it("never admits a held old response after its read signal is aborted", async () => {
  let release!: (value: unknown) => void;
  const fixture = commentApi(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const controller = new AbortController();
  const result = read(fixture.api, controller.signal);
  const rejected = expect(result).rejects.toMatchObject({ name: "AbortError" });
  await vi.waitFor(() => expect(fixture.requests).toHaveLength(1));
  controller.abort();
  release(commentPage());
  await rejected;
  expect(fixture.requests).toHaveLength(1);
});
