import { expect, test, type Page, type Route } from "@playwright/test";
import {
  fundingDetail,
  fundingPage,
  fundingRecord,
} from "../../tests/funding-calendar-fixtures";
import { clientId, installFixtures, json } from "../../tests/browser/fixtures";
import { requestCompletion } from "./core109-outreach-fixtures";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";

const destination =
  "/calendar?view=agenda&date=2026-10-15&zone=America%2FNew_York";
const fundingRoute = "**/core/intelligence/opportunities/v2/**";
const replacements = [
  "user",
  "session",
  "organization",
  "sign-out",
  "client",
] as const;
type Replacement = (typeof replacements)[number];
type HeldDetail = {
  route: Route;
  record: ReturnType<typeof fundingRecord>;
  settled: Promise<string>;
};

async function installCalendar(page: Page) {
  await onlyLocalRequests(page);
  const unexpected = await installFixtures(page);
  await operationFixtures(page, { "me.read": testIdentity });
  const records = new Map<string, ReturnType<typeof fundingRecord>>();
  const observed = {
    record: fundingRecord("former-context"),
    hold: true,
    held: [] as HeldDetail[],
    searches: [] as string[],
    details: [] as string[],
    writes: [] as string[],
    errors: [] as string[],
    unexpected,
  };
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/") && request.method() !== "GET")
      observed.writes.push(`${request.method()} ${url.pathname}`);
  });
  page.on("pageerror", (error) => observed.errors.push(error.message));
  await page.route(fundingRoute, (route) => {
    const url = new URL(route.request().url());
    expect(route.request().method()).toBe("GET");
    if (url.pathname.endsWith("/search")) {
      observed.searches.push(url.pathname + url.search);
      records.set(observed.record.sourceRecordId, observed.record);
      return json(route, fundingPage([observed.record]));
    }
    observed.details.push(url.pathname + url.search);
    const id = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
    const record = records.get(id);
    if (!record) {
      observed.unexpected.push(`Unsearched funding detail: ${id}`);
      return json(route, { message: "Synthetic detail was not searched" }, 500);
    }
    if (observed.hold) {
      observed.held.push({
        route,
        record,
        settled: requestCompletion(page, route.request()),
      });
      return;
    }
    return json(route, fundingDetail(record));
  });
  return observed;
}

async function replaceScope(page: Page, replacement: Replacement) {
  if (replacement === "client") {
    const read = page.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith(`/core/clients/${clientId}`),
    );
    await page
      .getByRole("combobox", { name: "Calendar scope" })
      .selectOption(clientId);
    await (await read).finished();
    await expect(
      page.getByRole("combobox", { name: "Calendar scope" }),
    ).toHaveValue(clientId);
    return;
  }
  const detail = {
    user: { userId: "synthetic-funding-replacement-user" },
    session: { sessionId: "synthetic-funding-replacement-session" },
    organization: { orgId: "synthetic-funding-replacement-org" },
    "sign-out": { userId: null, sessionId: null, orgId: null },
  }[replacement];
  await page.evaluate(
    (value) =>
      dispatchEvent(new CustomEvent("test:session", { detail: value })),
    detail,
  );
  if (replacement === "sign-out")
    await expect(
      page.getByRole("heading", { name: "Sign in to Capiro" }),
    ).toBeVisible();
}

async function returnToMaster(page: Page, replacement: Replacement) {
  if (replacement === "client")
    await page
      .getByRole("combobox", { name: "Calendar scope" })
      .selectOption("");
  if (replacement === "sign-out")
    await page.evaluate(() =>
      dispatchEvent(
        new CustomEvent("test:session", {
          detail: {
            userId: "synthetic-funding-returned-user",
            sessionId: "synthetic-funding-returned-session",
            orgId: "synthetic-funding-returned-org",
          },
        }),
      ),
    );
}

async function releaseDetail(held: HeldDetail, status = 200) {
  await held.route
    .fulfill({
      status,
      json:
        status === 200
          ? fundingDetail(held.record)
          : { message: "Synthetic former funding session expired" },
    })
    .catch(() => {});
  const settlement = await held.settled;
  await test
    .info()
    .attach(`funding-detail-${held.record.sourceRecordId}-${status}`, {
      contentType: "application/json",
      body: JSON.stringify({
        url: held.route.request().url(),
        status,
        settlement,
      }),
    });
}

function assertNoEffects(
  observed: Awaited<ReturnType<typeof installCalendar>>,
) {
  expect(observed.writes).toEqual([]);
  expect(observed.errors).toEqual([]);
  expect(observed.unexpected).toEqual([]);
}

for (const replacement of replacements) {
  for (const status of [200, 401]) {
    test(`funding detail late ${status} cannot outlive ${replacement} replacement`, async ({
      page,
    }) => {
      const observed = await installCalendar(page);
      const former = observed.record;
      await page.goto(destination);
      await expect.poll(() => observed.held.length).toBe(1);
      await expect(
        page.getByText("Loading funding…", { exact: true }),
      ).toBeVisible();
      observed.record = fundingRecord(`current-${replacement}-${status}`);
      observed.hold = false;
      await replaceScope(page, replacement);
      const leavesMaster =
        replacement === "client" || replacement === "sign-out";
      if (leavesMaster) expect(observed.searches).toHaveLength(1);
      else
        await expect(
          page.getByRole("heading", {
            name: `${observed.record.title} ↗`,
            exact: true,
          }),
        ).toBeVisible();

      await releaseDetail(observed.held[0]!, status);
      await expect(
        page.getByRole("heading", { name: `${former.title} ↗`, exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("heading", { name: "Your session expired" }),
      ).toHaveCount(0);
      if (replacement === "sign-out")
        await expect(
          page.getByRole("heading", { name: "Sign in to Capiro" }),
        ).toBeVisible();
      if (replacement === "client")
        await expect(
          page.getByRole("combobox", { name: "Calendar scope" }),
        ).toHaveValue(clientId);
      if (leavesMaster) {
        expect(observed.searches).toHaveLength(1);
        expect(observed.details).toHaveLength(1);
        await returnToMaster(page, replacement);
      }
      await expect(
        page.getByRole("heading", {
          name: `${observed.record.title} ↗`,
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: `${former.title} ↗`, exact: true }),
      ).toHaveCount(0);
      expect(observed.searches).toHaveLength(2);
      expect(observed.details).toHaveLength(2);
      expect(observed.details[1]).toContain(
        `/sam_gov/${observed.record.sourceRecordId}?mode=all`,
      );
      assertNoEffects(observed);
    });
  }
}

async function replaceDisplayedFunding(
  page: Page,
  observed: Awaited<ReturnType<typeof installCalendar>>,
  replacement: Replacement,
) {
  const former = observed.record;
  const searchesBefore = observed.searches.length;
  const heldBefore = observed.held.length;
  observed.record = fundingRecord(`displayed-${replacement}`);
  observed.hold = true;
  await replaceScope(page, replacement);
  await expect(
    page.getByRole("heading", { name: `${former.title} ↗`, exact: true }),
  ).toHaveCount(0);
  if (replacement === "client" || replacement === "sign-out") {
    expect(observed.searches).toHaveLength(searchesBefore);
    await returnToMaster(page, replacement);
  }
  await expect.poll(() => observed.held.length).toBe(heldBefore + 1);
  await expect(
    page.getByText("Loading funding…", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: `${former.title} ↗`, exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: `${observed.record.title} ↗`,
      exact: true,
    }),
  ).toHaveCount(0);
  await releaseDetail(observed.held[heldBefore]!);
  await expect(
    page.getByRole("heading", {
      name: `${observed.record.title} ↗`,
      exact: true,
    }),
  ).toBeVisible();
  expect(observed.searches).toHaveLength(searchesBefore + 1);
  expect(observed.details.at(-1)).toContain(
    `/sam_gov/${observed.record.sourceRecordId}?mode=all`,
  );
}

test("displayed funding clears across every boundary and returns only after the current detail read", async ({
  page,
}) => {
  const observed = await installCalendar(page);
  observed.hold = false;
  await page.goto(destination);
  await expect(
    page.getByRole("heading", {
      name: `${observed.record.title} ↗`,
      exact: true,
    }),
  ).toBeVisible();
  for (const replacement of replacements)
    await test.step(replacement, () =>
      replaceDisplayedFunding(page, observed, replacement),
    );
  expect(observed.searches).toHaveLength(6);
  expect(observed.details).toHaveLength(6);
  await expect(
    page.getByRole("heading", { name: "Your session expired" }),
  ).toHaveCount(0);
  assertNoEffects(observed);
});
