import { test, expect } from "@playwright/test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { legiwatchFixtures, folder } from "./legiwatch-fixtures";

const route = (view: string) =>
  `/modules/intelligence?view=legiwatch&lw=more&lwMore=${view}`;
const views = [
  ["news", "News evidence"],
  ["budget", "Florida Budget"],
  ["research", "Research evidence"],
  ["monitoring", "Monitoring"],
  ["briefings", "Client briefings"],
  ["reports", "Reports"],
  ["trends", "Trends"],
  ["digest", "Legacy digest"],
  ["imports", "Import review"],
  ["research-imports", "Research import review"],
  ["settings", "LegiWatch settings"],
];
for (const [view, title] of views)
  test(`LegiWatch ${title} renders a real connected view`, async ({ page }) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    page.on("response", (response) => {
      if (response.url().includes("/api/capiro/") && !response.ok())
        failures.push(`${response.status()}:${response.url()}`);
    });
    await onlyLocalRequests(page);
    await operationFixtures(page, legiwatchFixtures);
    await page.goto(route(view!));
    await expect(
      page.getByRole("heading", { name: title, exact: true, level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText("Loading…");
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    expect(failures).toEqual([]);
    if (view === "trends")
      await expect(
        page.getByText("Unavailable", { exact: true }),
      ).toBeVisible();
    await page.screenshot({
      path: `test-results/legiwatch-${view}.png`,
      fullPage: true,
      animations: "disabled",
    });
  });

test("research continues past an empty matched page using the retained-source cursor", async ({
  page,
}) => {
  const requests: unknown[] = [];
  await onlyLocalRequests(page);
  await operationFixtures(page, {
    ...legiwatchFixtures,
    "legiwatch.research.search": (input) => {
      requests.push(input);
      return {
        items: [],
        scanned: 100,
        cursor: requests.length === 1 ? "source-boundary-page-2" : null,
        versionPolicy: "current_extractions",
        searchedKinds: "all",
        message: "Synthetic partial inventory",
        coverage: {
          complete: false,
          reason: "SOURCE_INVENTORY_NOT_QUALIFIED",
          manifestId: null,
          billIds: [],
          retainedVersionsOnly: true,
        },
      };
    },
  });
  await page.goto(route("research"));
  await page.getByLabel("Florida session", { exact: true }).fill("2026");
  await page
    .getByRole("button", { name: "Search retained text", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Next inspected page" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Next inspected page" }).click();
  await expect(
    page.getByRole("button", { name: "Next inspected page" }),
  ).toBeDisabled();
  expect(requests).toHaveLength(2);
  expect(requests[1]).toMatchObject({
    body: {
      jurisdiction: "FL",
      sessionKey: "2026",
      cursor: "source-boundary-page-2",
    },
  });
});

test("workflow changes invalidate a reviewed preview and enqueue only its exact current hash", async ({
  page,
}) => {
  const enqueued: unknown[] = [];
  const action = {
    id: "action-1",
    workflow_id: null,
    template: "hearing_preparation",
    input_hash: "reviewed-2",
    input: {
      folderIds: [folder.id],
      jurisdiction: "FL",
      sessionKey: "2026",
      template: "hearing_preparation",
      eventId: "hearing-2",
      contextHash: "context",
    },
    state: "pending",
    reason: null,
    attempts: 0,
    steps: {},
  };
  await onlyLocalRequests(page);
  await operationFixtures(page, {
    ...legiwatchFixtures,
    "legiwatch.workflow.preview": (input) => {
      const body = (input as { body: object }).body;
      return {
        input: { ...body, contextHash: "context" },
        inputHash:
          (body as { eventId: string }).eventId === "hearing-1"
            ? "reviewed-1"
            : "reviewed-2",
        effects: [{ kind: "private_preparation_draft", outbound: false }],
        limits: [],
      };
    },
    "legiwatch.workflow.enqueue": (input) => {
      enqueued.push(input);
      return action;
    },
    "legiwatch.workflow.action": action,
  });
  await page.goto(route("monitoring"));
  await page
    .getByRole("button", { name: "Internal workflows", exact: true })
    .click();
  await page.getByLabel("Workflow folder").selectOption(folder.id);
  await page.getByRole("button", { name: "Preview a follow-up" }).click();
  await page.getByLabel("Hearing reference").fill("hearing-1");
  await page.getByRole("button", { name: "Preview effects" }).click();
  await expect(
    page.getByRole("button", { name: "Create reviewed follow-up" }),
  ).toBeVisible();
  await page.getByLabel("Hearing reference").fill("hearing-2");
  await expect(
    page.getByRole("button", { name: "Create reviewed follow-up" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Preview effects" }).click();
  await page.getByRole("button", { name: "Create reviewed follow-up" }).click();
  await expect(
    page.getByRole("button", { name: "Execute / retry action" }),
  ).toBeDisabled();
  expect(enqueued).toHaveLength(1);
  expect(enqueued[0]).toMatchObject({
    body: {
      inputHash: "reviewed-2",
      input: { eventId: "hearing-2", folderIds: [folder.id] },
      requestKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
    },
  });
});

test("monitoring tabs and keyword drawer support keyboard dismissal on mobile without overflow", async ({
  page,
}) => {
  await onlyLocalRequests(page);
  await operationFixtures(page, legiwatchFixtures);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route("monitoring"));
  for (const name of [
    "Bill record rules",
    "Agenda rules",
    "Statute monitors",
    "Keyword rules",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  }
  const opener = page.getByRole("button", { name: "New keyword rule" });
  await opener.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/legiwatch-mobile.png",
    fullPage: true,
  });
});
