import { expect, test, type Locator, type Page } from "@playwright/test";
import { client, json } from "./fixtures";
import {
  firstStrategy,
  firstStrategyId,
  installWorkFixtures,
  secondStrategy,
  workDrafts,
} from "./work-boundary-fixtures";

function documents(page: Page) {
  return page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Workspace documents",
      exact: true,
    }),
  });
}

async function openWork(page: Page, query = "") {
  await page.clock.setFixedTime(new Date("2026-10-11T12:00:00Z"));
  await page.goto(`/work-boundary.html${query}`);
}

async function insideHorizontally(child: Locator, parent: Locator) {
  const childBox = await child.boundingBox();
  const parentBox = await parent.boundingBox();
  expect(childBox).not.toBeNull();
  expect(parentBox).not.toBeNull();
  expect(childBox!.x).toBeGreaterThanOrEqual(parentBox!.x);
  expect(childBox!.x + childBox!.width).toBeLessThanOrEqual(
    parentBox!.x + parentBox!.width + 1,
  );
}

test("phone Workspace cards expose each exact destination without horizontal scrolling", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { unexpected, requests } = await installWorkFixtures(page);
  await openWork(page);
  const section = documents(page);
  for (const draft of workDrafts) {
    const row = section.getByRole("row").filter({ hasText: draft.docTitle });
    const action = row.getByRole("link", { name: /Open workspace/i });
    await expect(action).toHaveAttribute(
      "href",
      `http://127.0.0.1:5191/existing/workspace/${draft.id}`,
    );
    await insideHorizontally(action, section);
    const title = await row
      .getByText(draft.docTitle, { exact: true })
      .boundingBox();
    const status = await row
      .getByText(draft.status === "draft" ? "Draft" : "Completed", {
        exact: true,
      })
      .boundingBox();
    const product = await row
      .getByText(draft.product!, { exact: true })
      .boundingBox();
    const link = await action.boundingBox();
    expect(title!.y).toBeLessThan(product!.y);
    expect(status!.y).toBeLessThan(product!.y);
    expect(product!.y + product!.height).toBeLessThanOrEqual(link!.y);
    await expect(row).toHaveCSS("padding", "16px");
    await expect(action).toHaveCSS("height", "36px");
  }
  await expect(
    section.getByText(`${client.name} · 1 draft · 1 completed`),
  ).toBeVisible();
  await expect(section.getByRole("link")).toHaveCount(3);
  await section
    .getByRole("link", { name: "Open Workspace", exact: true })
    .focus();
  await page.keyboard.press("Tab");
  await expect(
    section
      .getByRole("row")
      .filter({ hasText: workDrafts[0]!.docTitle })
      .getByRole("link"),
  ).toBeFocused();
  expect(
    await section.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    section.getByText("synthetic-owner", { exact: true }),
  ).toHaveCount(0);
  await section.screenshot({
    path: testInfo.outputPath("workspace-phone-cards.png"),
  });
  expect(requests.every((request) => request.startsWith("GET "))).toBe(true);
  expect(unexpected).toEqual([]);
});

test("narrow dark Workspace cards wrap long source text and retain readable actions", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.emulateMedia({ colorScheme: "dark" });
  const { state, unexpected } = await installWorkFixtures(page);
  state.drafts = [
    {
      ...workDrafts[0]!,
      docTitle:
        "Synthetic very long native briefing title that must wrap without hiding its Workspace destination",
      product: "SyntheticUnbrokenProductNameForTheCurrentDocumentOnly",
    },
  ];
  await openWork(page);
  const section = documents(page);
  const row = section
    .getByRole("row")
    .filter({ hasText: state.drafts[0]!.docTitle });
  await expect(
    row.getByText(state.drafts[0]!.docTitle, { exact: true }),
  ).toBeVisible();
  await insideHorizontally(row.getByRole("link"), section);
  await insideHorizontally(
    row.getByText(state.drafts[0]!.product!, { exact: true }),
    section,
  );
  await expect(row.getByRole("link")).toHaveCSS("color", "rgb(250, 250, 249)");
  expect(
    await section.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await section.screenshot({
    path: testInfo.outputPath("workspace-narrow-dark-cards.png"),
  });
  expect(unexpected).toEqual([]);
});

test("desktop Workspace keeps semantic table columns and exact native icon geometry", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1088, height: 1040 });
  const { unexpected } = await installWorkFixtures(page);
  await openWork(page);
  const section = documents(page);
  await expect(section.getByRole("columnheader")).toHaveText([
    "Document",
    "Status",
    "Updated",
    "Open",
  ]);
  await expect(section.getByRole("row")).toHaveCount(3);
  const first = section
    .getByRole("row")
    .filter({ hasText: workDrafts[0]!.docTitle });
  const icon = first.locator(
    'img[src="/design/411-52106-imgIconFileText.svg"]',
  );
  await expect(icon).toBeVisible();
  await expect(icon).toHaveCSS("width", "16px");
  await expect(icon).toHaveCSS("height", "16px");
  expect(
    await icon.evaluate(
      (element) => (element as HTMLImageElement).naturalWidth,
    ),
  ).toBe(16);
  const title = await first
    .getByText(workDrafts[0]!.docTitle, { exact: true })
    .boundingBox();
  const status = await first.getByText("Draft", { exact: true }).boundingBox();
  const action = await first.getByRole("link").boundingBox();
  expect(status!.x).toBeGreaterThan(title!.x + title!.width);
  expect(action!.x).toBeGreaterThan(status!.x + status!.width);
  await section.screenshot({
    path: testInfo.outputPath("workspace-desktop-table.png"),
  });
  expect(unexpected).toEqual([]);
});

test("an unavailable Strategy list uses the compact band and error card while documents remain usable", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1088, height: 1040 });
  const { state, unexpected } = await installWorkFixtures(page);
  state.statuses.summaries = 503;
  await openWork(page);
  const band = page.getByRole("region", { name: "Client strategy portfolio" });
  await expect(band).toContainText("Strategies could not be loaded.");
  await expect(band.locator("strong")).toHaveCount(0);
  await expect(band).toHaveCSS("padding", "18px 24px");
  const error = page.getByRole("alert");
  await expect(
    error.getByRole("heading", {
      name: "Strategies could not be loaded",
      exact: true,
    }),
  ).toBeVisible();
  await expect(error).toHaveCSS("border-top-style", "solid");
  await expect(error).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(error).toHaveCSS("padding", "48px 24px");
  await expect(
    page.getByRole("heading", { name: "Upcoming work", exact: true }),
  ).toHaveCount(0);
  await expect(documents(page).getByRole("row")).toHaveCount(3);
  await band.screenshot({
    path: testInfo.outputPath("work-unavailable-band.png"),
  });
  await error.screenshot({
    path: testInfo.outputPath("work-unavailable-card.png"),
  });
  state.statuses.summaries = 200;
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started = false;
  await page.route("**/strategy/strategies", async (route) => {
    started = true;
    await gate;
    await json(route, state.summaries);
  });
  try {
    await error.getByRole("button", { name: "Retry", exact: true }).click();
    await expect.poll(() => started).toBe(true);
    await expect(
      error.getByRole("button", { name: "Retry", exact: true }),
    ).toBeDisabled();
    await expect(error).toContainText("Retrying the Strategies service…");
    await expect(band).toContainText("Strategies could not be loaded.");
    await expect(band.locator("strong")).toHaveCount(0);
    await expect(documents(page).getByRole("row")).toHaveCount(3);
  } finally {
    release();
  }
  await expect(
    page.getByRole("heading", { name: firstStrategy.title, exact: true }),
  ).toBeVisible();
  await expect(
    band
      .getByText("Current strategies", { exact: true })
      .locator("..")
      .locator("strong"),
  ).toHaveText("2");
  await expect(error).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

test("phone Strategy permission errors retain refusal meaning and healthy document cards", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { state, unexpected } = await installWorkFixtures(page);
  state.statuses.summaries = 403;
  await openWork(page);
  const error = page.getByRole("alert");
  await expect(
    error.getByRole("heading", {
      name: "Strategies could not be loaded",
      exact: true,
    }),
  ).toBeVisible();
  await expect(error).toContainText(
    "You do not have permission for this operation.",
  );
  await expect(
    page.getByText("The Strategies service did not answer.", { exact: true }),
  ).toHaveCount(0);
  await insideHorizontally(error.getByRole("button", { name: "Retry" }), error);
  const first = documents(page)
    .getByRole("row")
    .filter({ hasText: workDrafts[0]!.docTitle });
  await insideHorizontally(first.getByRole("link"), documents(page));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("work-permission-phone.png"),
    fullPage: true,
  });
  expect(unexpected).toEqual([]);
});

test("a failed Strategy detail keeps healthy work and disables duplicate Retry while refreshing", async ({
  page,
}) => {
  const { state, unexpected } = await installWorkFixtures(page);
  state.statuses.first = 410;
  await openWork(page);
  const error = page.getByRole("alert");
  await expect(
    error.getByRole("heading", {
      name: "Some strategies could not be loaded",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: secondStrategy.title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: firstStrategy.title, exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByText("Linked artifacts", { exact: true })
      .locator("..")
      .locator("strong"),
  ).toHaveText("—");
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started = false;
  await page.route(
    `**/strategy/strategies/${firstStrategyId}`,
    async (route) => {
      started = true;
      await gate;
      await json(route, firstStrategy);
    },
  );
  try {
    await error.getByRole("button", { name: "Retry", exact: true }).click();
    await expect.poll(() => started).toBe(true);
    await expect(
      error.getByRole("button", { name: "Retry", exact: true }),
    ).toBeDisabled();
    await expect(error).toContainText("Retrying the Strategies service…");
    await expect(
      page.getByRole("heading", { name: secondStrategy.title, exact: true }),
    ).toBeVisible();
    await expect(documents(page).getByRole("row")).toHaveCount(3);
  } finally {
    release();
  }
  await expect(
    page.getByRole("heading", { name: firstStrategy.title, exact: true }),
  ).toBeVisible();
  await expect(error).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

test("phone document cards and their links disappear on a failed Workspace read and recover together", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { state, unexpected } = await installWorkFixtures(page);
  await openWork(page);
  const section = documents(page);
  await expect(section.getByRole("row")).toHaveCount(3);
  state.statuses.documents = 403;
  await page.evaluate(() => window.__workBoundary?.refresh("documents"));
  await expect(section.getByRole("table")).toHaveCount(0);
  for (const draft of workDrafts) {
    await expect(
      section.getByText(draft.docTitle, { exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(`a[href$="/workspace/${draft.id}"]`)).toHaveCount(
      0,
    );
  }
  await expect(
    page.getByRole("heading", { name: firstStrategy.title, exact: true }),
  ).toBeVisible();
  state.statuses.documents = 200;
  await section.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(section.getByRole("row")).toHaveCount(3);
  for (const draft of workDrafts)
    await insideHorizontally(
      section
        .getByRole("row")
        .filter({ hasText: draft.docTitle })
        .getByRole("link"),
      section,
    );
  expect(unexpected).toEqual([]);
});

test("unavailable Workspace destinations and timestamps remain explicit without fabricated links", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { state, unexpected } = await installWorkFixtures(page);
  state.drafts = [{ ...workDrafts[0]!, updatedAt: "unavailable" }];
  await openWork(page, "?missing-destinations");
  const section = documents(page);
  await expect(
    section.getByText(workDrafts[0]!.docTitle, { exact: true }),
  ).toBeVisible();
  await expect(section.getByRole("link")).toHaveCount(0);
  await expect(
    section.getByText("Workspace destination unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    section.getByText("Updated time unavailable", { exact: true }),
  ).toBeVisible();
  await expect(section.getByText("Invalid Date", { exact: true })).toHaveCount(
    0,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(unexpected).toEqual([]);
});
