import { expect, it, vi } from "vitest";
import { fetchFundingDeadlines } from "../src/features/portfolio/calendar/funding-feed";
import {
  dateFact,
  fundingApi,
  fundingDetail,
  fundingPage,
  fundingRecord,
} from "./funding-calendar-fixtures";

const load = (
  api: Parameters<typeof fetchFundingDeadlines>[0],
  signal?: AbortSignal,
) =>
  fetchFundingDeadlines(
    api,
    "2026-10-01",
    "2026-11-01",
    "America/New_York",
    signal,
  );

it("reads the approved all-mode sources and exact detail lineage with GET only", async () => {
  const records = [
    fundingRecord("shared"),
    fundingRecord("shared", "sbir_sttr"),
  ];
  const fixture = fundingApi((url) =>
    url.pathname.endsWith("/search")
      ? fundingPage(records)
      : fundingDetail(
          records.find((r) =>
            url.pathname.endsWith(`/${r.source}/${r.sourceRecordId}`),
          )!,
        ),
  );
  const result = await load(fixture.api);
  expect(result.items).toHaveLength(2);
  expect(new Set(result.items.map((item) => item.key)).size).toBe(2);
  expect(result.limitations).toEqual([
    "Agency forecasts are not included: the native source does not publish response deadlines. Anticipated award dates are not response deadlines.",
  ]);
  expect(Object.fromEntries(fixture.requests[0]!.searchParams)).toEqual({
    mode: "all",
    source: "grants_gov,sam_gov,dibbs,sbir_sttr,ca_portal",
    lifecycle: "active,forecast,closed,post_award",
    deadlineWindow: "any",
    deadlineFrom: "2026-10-01T00:00:00Z",
    deadlineTo: "2026-11-01T04:00:00Z",
    sort: "deadline",
    direction: "asc",
    page: "1",
    pageSize: "25",
  });
  expect(
    fixture.requests.slice(1).map((u) => `${u.pathname}${u.search}`),
  ).toEqual(
    records.map(
      (r) =>
        `/api/backend/core/intelligence/opportunities/v2/detail/${r.source}/${r.sourceRecordId}?mode=all`,
    ),
  );
});

it("follows a second native page and binds its page echo before projecting details", async () => {
  const records = Array.from({ length: 26 }, (_, i) =>
    fundingRecord(`record-${i}`),
  );
  const fixture = fundingApi((url) => {
    if (url.pathname.endsWith("/search")) {
      const page = Number(url.searchParams.get("page"));
      return fundingPage(records.slice((page - 1) * 25, page * 25), {
        page,
        total: 26,
      });
    }
    return fundingDetail(
      records.find((r) => url.pathname.endsWith(`/${r.sourceRecordId}`))!,
    );
  });
  expect((await load(fixture.api)).items).toHaveLength(26);
  expect(
    fixture.requests
      .filter((u) => u.pathname.endsWith("/search"))
      .map((u) => u.searchParams.get("page")),
  ).toEqual(["1", "2"]);
});

it("bounds detail work at50 candidates and explicitly reports incomplete coverage", async () => {
  const records = Array.from({ length: 50 }, (_, i) =>
    fundingRecord(`record-${i}`),
  );
  const fixture = fundingApi((url) => {
    if (url.pathname.endsWith("/search")) {
      const page = Number(url.searchParams.get("page"));
      return fundingPage(records.slice((page - 1) * 25, page * 25), {
        page,
        total: 500,
      });
    }
    return fundingDetail(
      records.find((r) => url.pathname.endsWith(`/${r.sourceRecordId}`))!,
    );
  });
  const result = await load(fixture.api);
  expect(result.items).toHaveLength(50);
  expect(fixture.requests).toHaveLength(52);
  expect(result.limitations.join(" ")).toContain("first 50");
});

it("preserves disabled, missing-freshness and incomplete catalog states rather than claiming complete empty success", async () => {
  const fixture = fundingApi(() =>
    fundingPage([], {
      total: null,
      totalIsCapped: true,
      catalogComplete: false,
      freshness: [
        {
          source: "sam_gov",
          state: "not_enabled",
          lastSyncedAt: null,
          recordCount: null,
        },
      ],
    }),
  );
  const result = await load(fixture.api);
  expect(result.items).toEqual([]);
  expect(result.limitations.join(" ")).toMatch(/incomplete/);
  expect(result.limitations.join(" ")).toMatch(/SAM.gov.*not_enabled/);
  expect(result.limitations.join(" ")).toMatch(
    /SBIR\/STTR.*freshness unavailable/,
  );
});

it.each([
  { page: 2 },
  { pageSize: 100 },
  { mode: "matched" },
  { clientId: "client-other" },
  { total: -1 },
  { opportunities: [fundingRecord("other", "agency_forecast")] },
  { opportunities: [{ ...fundingRecord(), clientId: "client-other" }] },
])(
  "rejects a search receipt outside the captured Calendar request: %j",
  async (override) => {
    const fixture = fundingApi(() => fundingPage([fundingRecord()], override));
    await expect(load(fixture.api)).rejects.toMatchObject({ status: 502 });
    expect(fixture.requests).toHaveLength(1);
  },
);

it.each(["source", "sourceRecordId", "id", "clientId", "provenance"])(
  "rejects mismatched detail %s instead of projecting another record",
  async (field) => {
    const record = fundingRecord();
    const detail = fundingDetail(record);
    const corrupted =
      field === "provenance"
        ? {
            ...detail,
            opportunity: {
              ...detail.opportunity,
              sourceFacts: { provenance: "other-rail" },
            },
          }
        : field === "id" || field === "clientId"
          ? {
              ...detail,
              opportunity: { ...detail.opportunity, [field]: "other" },
            }
          : { ...detail, [field]: field === "source" ? "sbir_sttr" : "other" };
    const fixture = fundingApi((url) =>
      url.pathname.endsWith("/search") ? fundingPage([record]) : corrupted,
    );
    await expect(load(fixture.api)).rejects.toMatchObject({ status: 502 });
  },
);

it("rejects repeated exact lineage across pages instead of silently dropping it", async () => {
  const records = Array.from({ length: 25 }, (_, i) => fundingRecord(`r-${i}`));
  const fixture = fundingApi((url) =>
    fundingPage(
      url.searchParams.get("page") === "1" ? records : [records[0]!],
      { page: Number(url.searchParams.get("page")), total: 26 },
    ),
  );
  await expect(load(fixture.api)).rejects.toMatchObject({ status: 502 });
  expect(fixture.requests).toHaveLength(2);
});

it("keeps known SAM data while refusing ambiguous SBIR topic/solicitation IDs", async () => {
  const topic = fundingRecord("shared", "sbir_sttr");
  const solicitation = {
    ...topic,
    sourceFacts: { provenance: "tango_sbir_solicitation" },
  };
  const sam = fundingRecord("known");
  const fixture = fundingApi((url) =>
    url.pathname.endsWith("/search")
      ? fundingPage([topic, solicitation, sam])
      : fundingDetail(sam),
  );
  const result = await load(fixture.api);
  expect(result.items.map((i) => i.title)).toEqual([sam.title]);
  expect(fixture.requests).toHaveLength(2);
  expect(result.limitations.join(" ")).toMatch(
    /2 funding candidates.*ambiguous/,
  );
});

it.each([400, 404])(
  "reports an unavailable SBIR detail%s without inventing a deadline",
  async (status) => {
    const fixture = fundingApi((url) =>
      url.pathname.endsWith("/search")
        ? fundingPage([fundingRecord("ambiguous", "sbir_sttr")])
        : Response.json(
            { message: "Synthetic unavailable detail" },
            { status },
          ),
    );
    const result = await load(fixture.api);
    expect(result.items).toEqual([]);
    expect(result.limitations.join(" ")).toContain("could not be confirmed");
  },
);

it.each([401, 403, 503])(
  "propagates detail%s as unavailable source rather than successful empty data",
  async (status) => {
    const fixture = fundingApi((url) =>
      url.pathname.endsWith("/search")
        ? fundingPage([fundingRecord()])
        : Response.json(
            { message: "Synthetic current read denied" },
            { status },
          ),
    );
    await expect(load(fixture.api)).rejects.toMatchObject({ status });
  },
);

it("uses detail precision and exact half-open visible range, never archive or raw fallback", async () => {
  const records = ["before", "first", "last", "after", "raw"].map((id) =>
    fundingRecord(id),
  );
  const facts = [
    dateFact("2026-09-30"),
    dateFact("2026-10-01"),
    dateFact("2026-10-31"),
    dateFact("2026-11-01"),
    dateFact("2026-10-14T18:00:00Z", "raw"),
  ];
  const fixture = fundingApi((url) => {
    if (url.pathname.endsWith("/search")) return fundingPage(records);
    const i = records.findIndex((r) =>
      url.pathname.endsWith(`/${r.sourceRecordId}`),
    );
    return fundingDetail(records[i]!, facts[i]);
  });
  const result = await load(fixture.api);
  expect(result.items.map((i) => i.day)).toEqual(["2026-10-01", "2026-10-31"]);
  expect(result.limitations.join(" ")).toMatch(
    /1 funding opportunities.*Raw source text/,
  );
});

it("stops after cancellation of a held detail even when the fixture ignores the signal", async () => {
  const records = [fundingRecord("first"), fundingRecord("second")];
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const fixture = fundingApi(async (url) => {
    if (url.pathname.endsWith("/search")) return fundingPage(records);
    await held;
    return fundingDetail(records[0]);
  });
  const controller = new AbortController();
  const pending = load(fixture.api, controller.signal);
  const rejected = expect(pending).rejects.toBeInstanceOf(Error);
  await vi.waitFor(() => expect(fixture.requests).toHaveLength(2));
  controller.abort();
  release();
  await rejected;
  expect(fixture.requests).toHaveLength(2);
});
