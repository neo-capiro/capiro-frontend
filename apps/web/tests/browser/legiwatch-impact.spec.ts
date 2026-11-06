import { test, expect, type Page } from "@playwright/test";
import { installFixtures, json } from "./fixtures";
import {
  impactRow,
  impactPage,
  impactDetail,
  syntheticClient,
  otherSyntheticClient,
} from "../legiwatch-impact-fixtures";

async function install(page: Page) {
  await installFixtures(page);
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.fallback()
      : route.abort(),
  );
  const rows = [
    impactRow(),
    impactRow({
      clientId: otherSyntheticClient,
      clientName: "Synthetic Energy",
      position: "oppose",
    }),
  ];
  await page.route("**/api/capiro/legiwatch.tracker?**", (route) => {
    const input = JSON.parse(
      new URL(route.request().url()).searchParams.get("input") ?? "{}",
    );
    return json(
      route,
      impactPage(
        input.query?.clientId
          ? rows.filter((row) => row.clientId === input.query.clientId)
          : rows,
      ),
    );
  });
  await page.route("**/api/capiro/legiwatch.impact?**", (route) => {
    const input = JSON.parse(
      new URL(route.request().url()).searchParams.get("input") ?? "{}",
    );
    return json(
      route,
      impactDetail(rows.find((row) => row.clientId === input.params.clientId)!),
    );
  });
  return rows;
}

test("Modules defaults to all authorized clients and uses the same detail as the scoped profile", async ({
  page,
}) => {
  await install(page);
  const reads: unknown[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/capiro/legiwatch.tracker?"))
      reads.push(JSON.parse(new URL(request.url()).searchParams.get("input")!));
  });
  await page.goto("/modules/legiwatch");
  await expect(
    page.getByRole("heading", { name: "Bill tracker", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Synthetic Aerospace", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Synthetic Energy", exact: true }),
  ).toBeVisible();
  expect(reads[0]).toEqual({ query: { limit: 25 } });
  await expect(
    page.getByRole("button", { name: "Track bill", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("row")
    .filter({ hasText: "Synthetic Energy" })
    .getByRole("button", { name: "H.R. 1", exact: true })
    .click();
  const drawer = page.getByRole("dialog", { name: "H.R. 1", exact: true });
  await expect(drawer).toContainText("Synthetic Energy");
  await expect(drawer).toContainText("Domestic component requirement");
  await expect(drawer).toContainText("Applies if");
  await expect(
    drawer.getByRole("link", { name: "Synthetic bill text" }),
  ).toHaveAttribute("href", "https://example.test/bill/text");
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await page.goto(`/portfolio/${syntheticClient}/bills`);
  await expect(
    page.getByRole("button", { name: "H.R. 1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Client", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "H.R. 1", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Domestic component requirement",
  );
});

test("context saves bind the selected row client and preserve analyst choice separately", async ({
  page,
}) => {
  const rows = await install(page);
  const writes: unknown[] = [];
  await page.route("**/api/capiro/legiwatch.bill.context", (route) => {
    const input = route.request().postDataJSON();
    writes.push(input);
    rows[1] = {
      ...rows[1]!,
      position: input.body.position,
      priority: input.body.priority,
      note: input.body.analystNote,
    };
    return json(route, impactDetail(rows[1]));
  });
  await page.goto("/modules/legiwatch");
  await page
    .getByRole("row")
    .filter({ hasText: "Synthetic Energy" })
    .getByRole("button", { name: "H.R. 1", exact: true })
    .click();
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("tab", { name: "Position and notes" }).click();
  await drawer
    .getByLabel("Analyst note")
    .fill("Confirm source-backed eligibility.");
  await drawer.getByRole("button", { name: "Save client context" }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toEqual({
    params: { clientId: otherSyntheticClient, billId: "hr-1-119" },
    body: {
      position: "oppose",
      priority: "high",
      analystNote: "Confirm source-backed eligibility.",
    },
  });
  await expect(drawer.getByLabel("Analyst note")).toHaveValue(
    "Confirm source-backed eligibility.",
  );
});

test("queued impact is polled until complete without showing fabricated findings", async ({
  page,
}) => {
  await install(page);
  let queued = false,
    reads = 0,
    completed = false;
  const detail = impactDetail();
  detail.row.impact = {
    ...detail.row.impact,
    status: "needs_evidence",
    findings: [],
    analyzedAt: null,
    summary: "No analysis has been produced.",
  };
  await page.route("**/api/capiro/legiwatch.tracker?**", (route) =>
    json(route, impactPage([completed ? impactRow() : detail.row])),
  );
  await page.route("**/api/capiro/legiwatch.impact?**", (route) => {
    if (queued) reads++;
    if (queued && reads > 1) completed = true;
    return json(
      route,
      queued && reads > 1
        ? impactDetail()
        : {
            ...detail,
            refresh: queued
              ? {
                  state: "running",
                  requestedAt: "2026-11-06T12:00:00Z",
                  nextCheckAt: null,
                  errorCode: null,
                }
              : null,
          },
    );
  });
  await page.route("**/api/capiro/legiwatch.impact.analyze", (route) => {
    queued = true;
    expect(route.request().postDataJSON()).toEqual({
      params: { clientId: syntheticClient, billId: "hr-1-119" },
      body: {},
    });
    return json(
      route,
      {
        ...detail,
        refresh: {
          state: "queued",
          requestedAt: "2026-11-06T12:00:00Z",
          nextCheckAt: null,
          errorCode: null,
        },
      },
      202,
    );
  });
  await page.goto(`/portfolio/${syntheticClient}/bills`);
  await page.getByRole("button", { name: "H.R. 1", exact: true }).click();
  const drawer = page.getByRole("dialog");
  await expect(
    drawer.getByText("Domestic component requirement", { exact: true }),
  ).toHaveCount(0);
  await drawer
    .getByRole("button", { name: "Analyze impact", exact: true })
    .click();
  await expect(drawer).toContainText("Impact analysis is queued");
  await expect(
    drawer.getByRole("button", { name: "Analysis queued…" }),
  ).toBeDisabled();
  await expect(
    drawer.getByText("Domestic component requirement", { exact: true }),
  ).toBeVisible({ timeout: 12000 });
  await expect(
    drawer.getByRole("button", { name: "Update impact", exact: true }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("cell").filter({ hasText: "Mixed" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell").filter({ hasText: "Needs evidence" }),
  ).toHaveCount(0);
});

for (const status of [403, 404])
  test(`refused detail ${status} exposes no stale sources or write controls`, async ({
    page,
  }) => {
    await install(page);
    await page.route("**/api/capiro/legiwatch.impact?**", (route) =>
      json(route, { message: "Synthetic unavailable record" }, status),
    );
    await page.goto(`/portfolio/${syntheticClient}/bills`);
    await page.getByRole("button", { name: "H.R. 1", exact: true }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer.getByRole("alert")).toBeVisible();
    await expect(
      drawer.getByRole("button", { name: /Analyze impact|Untrack bill/ }),
    ).toHaveCount(0);
    await expect(drawer.getByRole("link")).toHaveCount(0);
  });

test("source versions and mobile detail remain keyboard accessible", async ({
  page,
}) => {
  await install(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/modules/legiwatch");
  await page
    .getByRole("button", { name: "H.R. 1", exact: true })
    .first()
    .click();
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("tab", { name: "Actions and text" }).click();
  await expect(
    drawer.getByRole("link", { name: "Introduced text" }),
  ).toHaveAttribute("href", "https://example.test/bill/text");
  const box = await drawer.boundingBox();
  expect(box?.width).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/legiwatch-impact-mobile.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "H.R. 1", exact: true }).first(),
  ).toBeFocused();
});

for (const status of [403, 404])
  test(`denied untrack ${status} conceals loaded evidence and write controls`, async ({
    page,
  }) => {
    await install(page);
    await page.route("**/clients/*/tracker/untrack", (route) =>
      json(route, { message: "Synthetic denied untrack" }, status),
    );
    await page.goto(`/portfolio/${syntheticClient}/bills`);
    await page.getByRole("button", { name: "H.R. 1", exact: true }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toContainText("Domestic component requirement");
    await drawer
      .getByRole("button", { name: "Untrack bill", exact: true })
      .click();
    await drawer
      .getByRole("button", { name: "Confirm untrack", exact: true })
      .click();
    await expect(drawer.getByRole("alert")).toBeVisible();
    await expect(
      drawer.getByText("Domestic component requirement", { exact: true }),
    ).toHaveCount(0);
    await expect(
      drawer.getByRole("button", {
        name: /Update impact|Confirm untrack|Save client context/,
      }),
    ).toHaveCount(0);
    await expect(drawer.getByRole("link")).toHaveCount(0);
  });
