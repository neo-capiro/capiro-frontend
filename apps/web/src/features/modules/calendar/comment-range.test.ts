import { expect, it, vi } from "vitest";
import {
  commentPage,
  commentRecord,
} from "../../../shared/federal-register/comment-deadline-fixtures";
import { createCapiroApi } from "../../../shared/capiro/http";
import { capiroOperations } from "../../../shared/capiro/registry";
import type { CommentDeadlineQuery } from "../../../shared/federal-register/comment-deadlines";
import { loadAgendaSources } from "./agenda-loader";
import { calendarRange } from "./range";

const range = calendarRange("2026-03-08", "agenda");
const pageForRange = (data = [commentRecord()], page = 1) =>
  commentPage(data, range.firstDay, range.lastDay, page);

function fixture(
  respond: (
    query: CommentDeadlineQuery | undefined,
  ) => unknown | Promise<unknown>,
) {
  const queries: (CommentDeadlineQuery | undefined)[] = [];
  const keys: string[] = [];
  const expired = vi.fn();
  const api = createCapiroApi(capiroOperations, {
    onSessionExpired: expired,
    fetcher: async (input, options) => {
      expect(options?.method).toBe("GET");
      expect(options?.body).toBeUndefined();
      const url = new URL(String(input), "https://synthetic.example.test");
      const key = decodeURIComponent(url.pathname.split("/").at(-1)!);
      if (!key.startsWith("calendar.commentDeadline"))
        return Response.json(
          { message: "Synthetic independent source unavailable" },
          { status: 503 },
        );
      const inputValue: { query?: CommentDeadlineQuery } = JSON.parse(
        url.searchParams.get("input") ?? "{}",
      );
      keys.push(key);
      queries.push(inputValue.query);
      const value = await respond(inputValue.query);
      if (value instanceof Response) return value;
      // The preserved legacy endpoint legitimately has no historical entries.
      return Response.json(key === "calendar.commentDeadlines" ? [] : value);
    },
  });
  return { api, queries, keys, expired };
}

it("loads the selected historical padded range inclusively without shifting date-only comments across DST", async () => {
  const records = [
    commentRecord("2026-FIRST", "2026-02-23"),
    commentRecord("2026-DST", "2026-03-08"),
    commentRecord("2026-LAST", "2026-04-05"),
  ];
  const source = fixture(() => pageForRange(records));
  const result = await loadAgendaSources(
    source.api,
    range,
    new AbortController().signal,
  );
  expect(source.keys).toEqual(["calendar.commentDeadlineCalendar"]);
  expect(source.queries).toEqual([
    { dateFrom: "2026-02-23", dateTo: "2026-04-05", page: 1, limit: 100 },
  ]);
  expect(result.items.map((item) => item.date)).toEqual([
    "2026-02-23",
    "2026-03-08",
    "2026-04-05",
  ]);
  expect(result.items[1]).toMatchObject({
    key: "federal-register:2026-DST",
    source: "Deadlines",
    title: "Synthetic comment notice 2026-DST",
    time: "Comments close · date only",
    href: records[1]!.htmlUrl,
  });
  expect(result.items[1]!.effectiveDate).toBeUndefined();
  expect(result.items[1]!.sortTime).toBeUndefined();
  expect(result.warnings.join(" ")).toContain("coverage is incomplete");
  expect(result.warnings.join(" ")).toContain("Raw publisher value unverified");
  expect(result.warnings.join(" ")).not.toContain("next 30 days");
});

it("advances candidate pages after zero accepted rows and preserves exclusions", async () => {
  const source = fixture((query) => {
    const page = query?.page ?? 1;
    return {
      ...pageForRange(page === 1 ? [] : [commentRecord()], page),
      pagination: {
        totalCandidates: 101,
        returned: page === 1 ? 0 : 1,
        excludedOnPage: page === 1 ? 100 : 0,
        hasMoreCandidates: page === 1,
      },
    };
  });
  const result = await loadAgendaSources(
    source.api,
    range,
    new AbortController().signal,
  );
  expect(source.queries.map((query) => query?.page)).toEqual([1, 2]);
  expect(result.items.map((item) => item.key)).toEqual([
    "federal-register:2026-12345",
  ]);
  expect(result.warnings.join(" ")).toContain("100 excluded");
  expect(result.warnings.join(" ")).toContain("101 candidates");
});

it("retains old read time and failed unfinished ingestion as limitations rather than freshness", async () => {
  const page = pageForRange();
  const source = fixture(() => ({
    ...page,
    coverage: {
      ...page.coverage,
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
  const result = await loadAgendaSources(
    source.api,
    range,
    new AbortController().signal,
  );
  expect(result.items).toHaveLength(1);
  expect(result.warnings.join(" ")).toContain(
    "2020-01-01T00:00:00.000Z (read time, not publisher freshness)",
  );
  expect(result.warnings.join(" ")).toContain("failed; 4 errors; not finished");
  expect(result.warnings.join(" ")).toContain("not effective dates");
});

it.each([
  { range: { dateFrom: "2026-03-01", dateTo: "2026-03-31" } },
  { data: [commentRecord("outside", "2026-04-06")] },
  {
    pagination: {
      totalCandidates: 1,
      returned: 0,
      excludedOnPage: 0,
      hasMoreCandidates: false,
    },
  },
])(
  "does not admit mismatched range or candidate receipts: %j",
  async (change) => {
    const source = fixture(() => ({ ...pageForRange(), ...change }));
    const result = await loadAgendaSources(
      source.api,
      range,
      new AbortController().signal,
    );
    expect(result.items).toEqual([]);
    expect(
      result.warnings.some((warning) =>
        warning.startsWith("Federal Register deadlines unavailable:"),
      ),
    ).toBe(true);
  },
);

it.each([401, 403, 503])(
  "keeps native%s unavailable instead of claiming an empty complete calendar",
  async (status) => {
    const source = fixture(() =>
      Response.json(
        { message: "Synthetic current read unavailable" },
        { status },
      ),
    );
    const result = await loadAgendaSources(
      source.api,
      range,
      new AbortController().signal,
    );
    expect(result.items).toEqual([]);
    expect(
      result.warnings.some((warning) =>
        warning.startsWith("Federal Register deadlines unavailable:"),
      ),
    ).toBe(true);
    expect(source.expired).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
  },
);

it.each([200, 401])(
  "does not admit a held old range or expire its replacement after late%s",
  async (status) => {
    const entered = Promise.withResolvers<void>();
    const held = Promise.withResolvers<unknown>();
    const currentRange = calendarRange("2026-04-12", "week");
    const source = fixture((query) => {
      if (!query || query.dateFrom === range.firstDay) {
        entered.resolve();
        return held.promise;
      }
      return commentPage(
        [commentRecord("2026-CURRENT", "2026-04-12")],
        currentRange.firstDay,
        currentRange.lastDay,
      );
    });
    const oldController = new AbortController();
    const old = loadAgendaSources(source.api, range, oldController.signal);
    await entered.promise;
    oldController.abort();
    const current = loadAgendaSources(
      source.api,
      currentRange,
      new AbortController().signal,
    );
    // Release every actually dispatched old read, including the legacy baseline.
    held.resolve(
      status === 200
        ? pageForRange()
        : Response.json({ message: "Synthetic old session" }, { status }),
    );
    const [oldResult, currentResult] = await Promise.all([old, current]);
    expect(oldResult.items).toEqual([]);
    expect(currentResult.items.map((item) => item.key)).toEqual([
      "federal-register:2026-CURRENT",
    ]);
    expect(source.queries[1]).toEqual({
      dateFrom: "2026-04-06",
      dateTo: "2026-04-12",
      page: 1,
      limit: 100,
    });
    expect(source.expired).not.toHaveBeenCalled();
  },
);

it("does not dispatch comment pages for an already revoked range", async () => {
  const source = fixture(() => pageForRange());
  const controller = new AbortController();
  controller.abort();
  const result = await loadAgendaSources(source.api, range, controller.signal);
  expect(result.items).toEqual([]);
  expect(source.keys).toEqual([]);
});
