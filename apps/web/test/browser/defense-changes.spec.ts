import { expect, test, type Page } from "@playwright/test";
import { portfolio, ids, timestamp } from "./research-sharing-fixture";
type Input = {
  params?: Record<string, string>;
  query?: Record<string, unknown>;
};
async function intercept(
  page: Page,
  response: (key: string, input: Input) => unknown,
) {
  const calls: { key: string; input: Input; method: string }[] = [];
  await page.route("**/api/capiro/**", async (route) => {
    const url = new URL(route.request().url()),
      key = url.pathname.split("/").at(-1)!;
    const input = JSON.parse(url.searchParams.get("input") || "{}");
    calls.push({ key, input, method: route.request().method() });
    const data = response(key, input);
    if (data === "denied")
      await route.fulfill({
        status: 403,
        json: { message: "Current access denied" },
      });
    else await route.fulfill({ json: data });
  });
  return calls;
}
const delta = {
  id: "synthetic-delta",
  peCode: "synthetic-pe",
  assertedFy: 2027,
  deltaType: "mark_vs_request",
  fromRef: "request-reference",
  toRef: "mark-reference",
  amountFrom: "9007199254740993.12",
  amountTo: "0.00",
  deltaAbs: "-9007199254740993.12",
  deltaPct: -1,
  explanation: null,
  materialityScore: 0.8,
  computedAt: timestamp,
};
test("Changes preserves tab and Budget filters without applying a false Congressional FY", async ({
  page,
}) => {
  const calls = await intercept(page, (key) =>
    key === "defenseChanges.budget"
      ? { data: [delta], total: 1, page: 1, limit: 25 }
      : key === "defenseChanges.attention"
        ? { data: [delta], total: 1, minScore: 0.4 }
        : key === "defenseChanges.congressional"
          ? {
              data: [
                {
                  billId: "bill",
                  congress: 119,
                  billType: "hr",
                  billNumber: "123",
                  billTitle: "Synthetic bill",
                  peCodeCount: 1,
                  date: timestamp,
                  text: "Synthetic action",
                  type: null,
                  chamber: null,
                  stage: "introduced",
                  stageLabel: "Introduced",
                  stageRank: 1,
                },
              ],
              billCount: 1,
            }
          : [],
  );
  await page.goto("/defense-changes.html");
  await page.getByLabel("Budget program element").fill("synthetic-pe");
  await page.getByLabel("Budget fiscal year").fill("2027");
  await page.getByRole("button", { name: "Apply budget filters" }).click();
  await expect(page.getByText("9007199254740993.12 → 0.00")).toBeVisible();
  await expect(page).toHaveURL(/changesFy=2027/);
  await page.getByRole("tab", { name: "Congressional", exact: true }).click();
  await page.getByLabel("Congressional program element").fill("synthetic-pe");
  await page.getByRole("button", { name: "Open bill actions" }).click();
  await expect(
    page.getByText("Synthetic action", { exact: true }),
  ).toBeVisible();
  expect(
    calls
      .filter((call) => call.key === "defenseChanges.congressional")
      .every((call) => !call.input.query),
  ).toBe(true);
  await page.getByRole("tab", { name: "Budget", exact: true }).click();
  await expect(page.getByLabel("Budget fiscal year")).toHaveValue("2027");
  await page.goBack();
  await expect(
    page.getByText("Synthetic action", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Synthetic action", { exact: true }),
  ).toBeVisible();
  expect(calls.every((call) => call.method === "GET")).toBe(true);
});
test("General and an unverified client cannot query the Monitored owner", async ({
  page,
}) => {
  const calls = await intercept(page, () => []);
  await page.goto("/defense-changes.html?changesTab=monitored");
  await expect(
    page.getByText(/General has no client watch feed/),
  ).toBeVisible();
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({ status: 403, json: { message: "Client unavailable" } }),
  );
  await page.goto(
    `/defense-changes.html?changesTab=monitored&clientId=${ids.client}`,
  );
  await expect(page.getByText(/selected client is unavailable/)).toBeVisible();
  expect(calls.some((call) => call.key === "defenseChanges.monitored")).toBe(
    false,
  );
});
test("Monitored verifies client associations and drops retained content after current refusal", async ({
  page,
}) => {
  let denied = false,
    wrongClient = false;
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({
      json: {
        id: ids.client,
        name: "Synthetic client",
        status: "active",
        profileStatus: "ready",
      },
    }),
  );
  const calls = await intercept(page, () =>
    denied
      ? "denied"
      : [
          {
            id: "watch",
            clientId: wrongClient ? ids.portfolio : ids.client,
            targetType: "pe",
            targetKey: "synthetic-pe",
            clientReason: "Private synthetic reason",
            createdAt: timestamp,
            events: [
              {
                id: "update",
                clientId: ids.client,
                watchId: "watch",
                eventType: "material_update",
                updateEventId: null,
                materialReason: "Exact source change",
                createdAt: timestamp,
              },
            ],
          },
        ],
  );
  await page.goto(
    `/defense-changes.html?changesTab=monitored&clientId=${ids.client}`,
  );
  await expect(page.getByText("Private synthetic reason")).toBeVisible();
  await page.getByRole("button", { name: "View synthetic-pe" }).click();
  await expect(page).toHaveURL(/changesWatchId=watch/);
  await expect(page.getByText("Exact source change")).toBeVisible();
  wrongClient = true;
  await page.getByRole("button", { name: "Refresh monitored" }).click();
  await expect(
    page.getByText("Watch records do not match the selected client."),
  ).toBeVisible();
  await expect(page.getByText("Private synthetic reason")).toHaveCount(0);
  wrongClient = false;
  denied = true;
  await page.getByRole("button", { name: "Refresh monitored" }).click();
  await expect(page.getByText("Current access denied")).toBeVisible();
  await expect(page.getByText("Exact source change")).toHaveCount(0);
  expect(
    calls.every((call) => call.input.params?.clientId === ids.client),
  ).toBe(true);
});
test("Actions reuses the authorized portfolio review owner and preserves selection", async ({
  page,
}) => {
  const review = {
    id: "review",
    portfolioId: ids.portfolio,
    targetKind: "program",
    targetId: "Synthetic review target",
    trigger: "manual",
    assigneeUserId: null,
    reason: "Synthetic review reason",
    evidenceFor: [],
    evidenceAgainst: [],
    revision: 1,
    status: "open",
    updatedAt: timestamp,
  };
  const calls = await intercept(page, (key) =>
    key === "research.list"
      ? { items: [portfolio], nextCursor: null }
      : key === "research.detail"
        ? { ...portfolio, myRole: "viewer", lifecycle: "archived" }
        : key === "research.reviews"
          ? [review]
          : [],
  );
  await page.goto("/defense-changes.html?changesTab=actions");
  await page.getByRole("button", { name: "Open Synthetic research" }).click();
  await expect(page).toHaveURL(
    new RegExp(`changesPortfolioId=${ids.portfolio}`),
  );
  const queue = page.getByRole("table", {
    name: "Research portfolio review queue",
    exact: true,
  });
  await expect(queue.getByText("Synthetic review target")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review", exact: true }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Team", exact: true }).click();
  await expect(page).toHaveURL(/reviewLane=team/);
  await page.reload();
  await expect(queue.getByText("Synthetic review target")).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Team", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  expect(
    calls.some(
      (call) =>
        call.key === "research.reviews" && call.input.query?.lane === "team",
    ),
  ).toBe(true);
  expect(
    calls
      .filter((call) => call.key === "research.reviews")
      .every((call) => call.input.params?.id === ids.portfolio),
  ).toBe(true);
  expect(calls.every((call) => call.method === "GET")).toBe(true);
});
test("Actions refuses a mismatched portfolio before opening reviews", async ({
  page,
}) => {
  const calls = await intercept(page, () => ({ ...portfolio, id: ids.client }));
  await page.goto(
    `/defense-changes.html?changesTab=actions&changesPortfolioId=${ids.portfolio}`,
  );
  await expect(
    page.getByText("The portfolio response does not match this selection."),
  ).toBeVisible();
  expect(calls.some((call) => call.key === "research.reviews")).toBe(false);
});
