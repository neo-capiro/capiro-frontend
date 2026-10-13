import { expect, test, type Page } from "@playwright/test";
import {
  dateFact,
  fundingDetail,
  fundingPage,
  fundingRecord,
} from "../funding-calendar-fixtures";
import { installFixtures, json } from "./fixtures";

const path =
  "/calendar-boundary.html?view=agenda&date=2026-10-15&zone=America/New_York";
const fundingRoute = "**/core/intelligence/opportunities/v2/**";
const regulatory = {
  id: "synthetic-regulatory",
  documentNumber: "2026-synthetic",
  title: "Synthetic regulatory comment deadline",
  commentEndDate: "2026-10-14",
  effectiveDate: null,
  htmlUrl: null,
};

async function installCalendar(page: Page) {
  const unexpected = await installFixtures(page);
  await page.route("**/core/federal-register/upcoming-deadlines", (route) =>
    json(route, [regulatory]),
  );
  return unexpected;
}

test("Master Agenda composes distinct funding deadlines with source precision and existing regulatory rows", async ({
  page,
}) => {
  const unexpected = await installCalendar(page);
  const sam = fundingRecord("same-key");
  const sbir = fundingRecord("same-key", "sbir_sttr");
  const reads: URL[] = [];
  await page.route(fundingRoute, (route) => {
    expect(route.request().method()).toBe("GET");
    const url = new URL(route.request().url());
    reads.push(url);
    return json(
      route,
      url.pathname.endsWith("/search")
        ? fundingPage([sam, sbir])
        : url.pathname.includes("/sam_gov/")
          ? fundingDetail(sam)
          : fundingDetail(sbir, dateFact("2026-10-15T02:30:00Z", "timestamp")),
    );
  });
  await page.goto(path);
  const samRow = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: sam.title }) });
  const sbirRow = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: sbir.title }) });
  await expect(samRow).toContainText("Date only · time not supplied");
  await expect(samRow).toContainText(
    "SAM.gov response deadline · source date only · sam_opportunity",
  );
  await expect(sbirRow).toContainText("Oct 14, 10:30 PM EDT");
  await expect(sbirRow).toContainText(
    "SBIR/STTR response deadline · source timestamp, displayed in America/New_York · tango_sbir_topic",
  );
  await expect(
    page.getByRole("heading", { name: regulatory.title }),
  ).toBeVisible();
  await expect(page.getByText(/30.*50|50.*30/)).toBeVisible();
  expect(reads).toHaveLength(3);
  expect(Object.fromEntries(reads[0]!.searchParams)).toEqual({
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
  expect(reads.slice(1).map((url) => url.pathname + url.search)).toEqual(
    [sam, sbir].map(
      (record) =>
        `/api/backend/core/intelligence/opportunities/v2/detail/${record.source}/${record.sourceRecordId}?mode=all`,
    ),
  );
  await page.getByRole("button", { name: "Deadline", exact: true }).click();
  await expect(samRow).toHaveCount(0);
  await expect(sbirRow).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: regulatory.title }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(samRow).toBeVisible();
  expect(reads).toHaveLength(3);
  expect(unexpected).toEqual([]);
});

test("Master Agenda exposes raw and ambiguous funding omissions without choosing a first SBIR match", async ({
  page,
}) => {
  const unexpected = await installCalendar(page);
  const known = fundingRecord("known");
  const raw = fundingRecord("raw");
  const topic = fundingRecord("ambiguous", "sbir_sttr");
  const solicitation = {
    ...topic,
    sourceFacts: { provenance: "tango_sbir_solicitation" },
  };
  const detailPaths: string[] = [];
  await page.route(fundingRoute, (route) => {
    expect(route.request().method()).toBe("GET");
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/search"))
      return json(route, fundingPage([known, raw, topic, solicitation]));
    detailPaths.push(url.pathname);
    return json(
      route,
      url.pathname.endsWith("/known")
        ? fundingDetail(known)
        : fundingDetail(raw, dateFact("2026-10-14T00:00:00Z", "raw")),
    );
  });
  await page.goto(path);
  await expect(page.getByRole("heading", { name: known.title })).toBeVisible();
  await expect(
    page.getByText(/1 funding opportunities could not be placed/),
  ).toBeVisible();
  await expect(
    page.getByText(/2 funding candidates could not be confirmed/),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: raw.title })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: topic.title })).toHaveCount(0);
  expect(detailPaths).toEqual(
    [known, raw].map(
      (record) =>
        `/api/backend/core/intelligence/opportunities/v2/detail/${record.source}/${record.sourceRecordId}`,
    ),
  );
  await expect(
    page.getByRole("heading", { name: regulatory.title }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});

test("a failed current funding read hides retained deadlines and requires successful retry", async ({
  page,
}) => {
  const unexpected = await installCalendar(page);
  const record = fundingRecord("retained");
  let denied = false;
  let searches = 0;
  await page.route(fundingRoute, (route) => {
    expect(route.request().method()).toBe("GET");
    if (new URL(route.request().url()).pathname.endsWith("/search")) {
      searches += 1;
      return denied
        ? json(route, { message: "Synthetic funding access changed" }, 403)
        : json(route, fundingPage([record]));
    }
    return json(route, fundingDetail(record));
  });
  await page.goto(path);
  await expect(page.getByRole("heading", { name: record.title })).toBeVisible();
  denied = true;
  await page.evaluate(async () => {
    if (!window.__calendarBoundary) throw new Error("Missing test controls");
    await window.__calendarBoundary.refreshFeeds();
  });
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => window.__calendarBoundary?.snapshots()),
  ).toContainEqual({ status: "error", retained: true });
  await expect(page.getByRole("heading", { name: record.title })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("heading", { name: regulatory.title }),
  ).toBeVisible();
  denied = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("heading", { name: record.title })).toBeVisible();
  expect(searches).toBe(3);
  expect(unexpected).toEqual([]);
});

test("Master Agenda shows all five native deadline rails and discloses the agency forecast gap", async ({
  page,
}) => {
  const unexpected = await installCalendar(page);
  const sources = [
    ["grants_gov", "Grants.gov"],
    ["sam_gov", "SAM.gov"],
    ["dibbs", "DIBBS"],
    ["sbir_sttr", "SBIR/STTR"],
    ["ca_portal", "California Grants Portal"],
  ] as const;
  const records = sources.map(([source]) => fundingRecord("same-key", source));
  await page.route(fundingRoute, (route) => {
    expect(route.request().method()).toBe("GET");
    const url = new URL(route.request().url());
    return json(
      route,
      url.pathname.endsWith("/search")
        ? fundingPage(records)
        : fundingDetail(
            records.find((record) =>
              url.pathname.endsWith(
                `/${record.source}/${record.sourceRecordId}`,
              ),
            )!,
          ),
    );
  });
  await page.goto(path);
  for (const [source, label] of sources) {
    const record = records.find((candidate) => candidate.source === source)!;
    const row = page
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: record.title }) });
    await expect(row).toContainText("Date only · time not supplied");
    await expect(row).toContainText(
      `${label} response deadline · source date only · ${record.sourceFacts.provenance}`,
    );
  }
  await expect(
    page.getByText(
      "Agency forecasts are not included: the native source does not publish response deadlines. Anticipated award dates are not response deadlines.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});
