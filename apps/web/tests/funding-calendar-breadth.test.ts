import { expect, it } from "vitest";
import { fetchFundingDeadlines } from "../src/features/portfolio/calendar/funding-feed";
import { fundingDeadlineItem } from "../src/features/portfolio/calendar/funding-deadline";
import {
  dateFact,
  fundingApi,
  fundingDetail,
  fundingPage,
  fundingRecord,
} from "./funding-calendar-fixtures";

const rails = [
  ["grants_gov", "Grants.gov", "federal_grant"],
  ["sam_gov", "SAM.gov", "sam_opportunity"],
  ["dibbs", "DIBBS", "tango_dibbs_solicitation"],
  ["sbir_sttr", "SBIR/STTR", "tango_sbir_topic"],
  ["ca_portal", "California Grants Portal", "california_grant_opportunity"],
] as const;

const records = () =>
  rails.map(([source, , provenance]) => ({
    ...fundingRecord("same-key", source),
    sourceFacts: { provenance },
  }));
const read = (api: Parameters<typeof fetchFundingDeadlines>[0]) =>
  fetchFundingDeadlines(api, "2026-10-01", "2026-11-01", "Pacific/Honolulu");

it.each(rails)(
  "retains precise permitted %s response deadlines with their source identity",
  (source, label, provenance) => {
    const record = {
      ...fundingRecord("same-key", source),
      sourceFacts: { provenance },
    };
    const item = fundingDeadlineItem(
      fundingDetail(record).opportunity,
      null,
      "Pacific/Honolulu",
    );
    expect(item).toMatchObject({
      day: "2026-10-14",
      status: `${label} · active`,
      sourceId: "same-key",
    });
    expect(item?.startAt).toBeUndefined();
    expect(item?.provenance).toBe(
      `${label} response deadline · source date only · ${provenance}`,
    );
  },
);

it("requests every deadline-capable source and preserves native provenance across the five-source receipt", async () => {
  const rows = records();
  const fixture = fundingApi((url) =>
    url.pathname.endsWith("/search")
      ? fundingPage(rows, {
          freshness: rails.map(([source]) => ({
            source,
            state: "current",
            lastSyncedAt: "2026-10-13T11:00:00Z",
            recordCount: 1,
          })),
        })
      : fundingDetail(
          rows.find((row) =>
            url.pathname.endsWith(`/${row.source}/${row.sourceRecordId}`),
          )!,
        ),
  );
  const result = await read(fixture.api);
  expect(result.items.map((item) => item.title)).toEqual(
    rows.map((row) => row.title),
  );
  expect(new Set(result.items.map((item) => item.key)).size).toBe(5);
  expect(fixture.requests[0]!.searchParams.get("source")).toBe(
    rails.map(([source]) => source).join(","),
  );
  expect(fixture.requests).toHaveLength(6);
});

it("always discloses absent agency forecast response deadlines even when all queried sources are current", async () => {
  const fixture = fundingApi(() => fundingPage([]));
  expect((await read(fixture.api)).limitations.join(" ")).toContain(
    "Agency forecasts are not included: the native source does not publish response deadlines. Anticipated award dates are not response deadlines.",
  );
});

it.each([
  ["grants_gov", "Grants.gov", "federal_grant", "forecast"],
  [
    "ca_portal",
    "California Grants Portal",
    "california_grant_opportunity",
    "post_award",
  ],
] as const)(
  "retains a native %s %s response deadline without claiming it is pursuable",
  async (source, label, provenance, lifecycle) => {
    const record = {
      ...fundingRecord("non-active", source),
      lifecycle,
      isPursuable: false,
      sourceFacts: { provenance },
    };
    const fixture = fundingApi((url) =>
      url.pathname.endsWith("/search")
        ? fundingPage([record])
        : fundingDetail(record),
    );
    const result = await read(fixture.api);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.status).toBe(`${label} · ${lifecycle}`);
    expect(fixture.requests[0]!.searchParams.get("lifecycle")).toBe(
      "active,forecast,closed,post_award",
    );
  },
);

it("does not substitute an agency forecast award date for its absent response deadline", () => {
  const detail = fundingDetail(
    {
      ...fundingRecord("forecast", "agency_forecast"),
      lifecycle: "forecast",
      sourceFacts: { provenance: "tango_procurement_forecast" },
    },
    dateFact(null, null),
  );
  const row = {
    ...detail.opportunity,
    dates: {
      ...detail.opportunity.dates,
      forecast: { anticipatedAwardDate: dateFact("2026-10-14") },
    },
  };
  expect(fundingDeadlineItem(row, null, "UTC")).toBeUndefined();
});
