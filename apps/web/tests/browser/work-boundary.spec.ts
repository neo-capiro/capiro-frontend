import { expect, test, type Page } from "@playwright/test";
import { client, clientId, json } from "./fixtures";
import {
  firstNodeId,
  firstStrategy,
  firstStrategyId,
  installWorkFixtures,
  otherClientId,
  riskId,
  secondStrategy,
  secondStrategyId,
  workDrafts,
} from "./work-boundary-fixtures";

type Source = "summaries" | "details" | "documents" | "client" | "clients";

async function refresh(page: Page, source: Source) {
  await page.evaluate(async (value) => {
    if (!window.__workBoundary) throw new Error("Missing Work test controls");
    await window.__workBoundary.refresh(value);
  }, source);
}

async function openWork(page: Page) {
  await page.clock.setFixedTime(new Date("2026-10-11T12:00:00Z"));
  await page.goto("/work-boundary.html");
}

async function expectHealthy(page: Page) {
  for (const strategy of [firstStrategy, secondStrategy])
    await expect(
      page.getByRole("heading", { name: strategy.title, exact: true }),
    ).toBeVisible();
  for (const draft of workDrafts)
    await expect(page.getByText(draft.docTitle, { exact: true })).toBeVisible();
}

function count(page: Page, label: string) {
  return page.getByText(label, { exact: true }).locator("..").locator("strong");
}

async function expectUnavailablePortfolio(page: Page) {
  const band = page.getByRole("region", { name: "Client strategy portfolio" });
  await expect(band).toContainText("Strategies could not be loaded.");
  await expect(band.locator("strong")).toHaveCount(0);
  for (const label of [
    "Current strategies",
    "Active / in progress",
    "Next 30 days",
    "Open risks",
    "Linked artifacts",
  ])
    await expect(band.getByText(label, { exact: true })).toHaveCount(0);
}

async function expectNoFirstStrategy(page: Page) {
  await expect(
    page.getByRole("heading", { name: firstStrategy.title, exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText(firstStrategy.nodes[0]!.title, { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText(firstStrategy.nodes[1]!.title, { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator(
      `a[href*="/strategies/${firstStrategyId}"], a[href*="&strategy=${firstStrategyId}"]`,
    ),
  ).toHaveCount(0);
}

async function expectDocuments(page: Page, visible: boolean) {
  for (const draft of workDrafts) {
    const title = page.getByText(draft.docTitle, { exact: true });
    if (visible) await expect(title).toBeVisible();
    else await expect(title).toHaveCount(0);
    await expect(page.locator(`a[href$="/workspace/${draft.id}"]`)).toHaveCount(
      visible ? 1 : 0,
    );
  }
}

for (const status of [403, 503]) {
  test(`a failed ${status} Strategy list refresh removes cached Strategy content but retains documents`, async ({
    page,
  }, testInfo) => {
    const { state, unexpected } = await installWorkFixtures(page);
    await openWork(page);
    await expectHealthy(page);
    state.statuses.summaries = status;
    await refresh(page, "summaries");
    await expect(page.getByRole("alert")).toBeVisible();
    expect(
      await page.evaluate(() => window.__workBoundary?.snapshots()),
    ).toContainEqual({
      key: ["strategies", clientId],
      status: "error",
      retained: true,
    });
    await expectUnavailablePortfolio(page);
    await expectNoFirstStrategy(page);
    await expect(
      page.getByRole("heading", { name: secondStrategy.title, exact: true }),
    ).toHaveCount(0);
    await expect(
      page.locator(
        `a[href*="/strategies/${secondStrategyId}"], a[href*="&strategy=${secondStrategyId}"]`,
      ),
    ).toHaveCount(0);
    await expect(
      page.getByText("No current strategies for this client."),
    ).toHaveCount(0);
    await expect(page.getByText("No open risks.")).toHaveCount(0);
    await expectDocuments(page, true);
    if (status === 403) {
      await page.screenshot({
        path: testInfo.outputPath("work-failed-strategies-desktop.png"),
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath("work-failed-strategies-phone.png"),
        fullPage: true,
      });
    }
    state.statuses.summaries = 200;
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expectHealthy(page);
    await expect(count(page, "Current strategies")).toHaveText("2");
    expect(unexpected).toEqual([]);
  });
}

for (const status of [403, 410, 503]) {
  test(`a failed ${status} Strategy detail refresh removes only that Strategy and its derived links`, async ({
    page,
  }) => {
    const { state, unexpected } = await installWorkFixtures(page);
    await openWork(page);
    await expectHealthy(page);
    state.statuses.first = status;
    await refresh(page, "details");
    await expect(page.getByRole("alert")).toBeVisible();
    expect(
      await page.evaluate(
        (id) =>
          window.__workBoundary
            ?.snapshots()
            .find(
              (query) =>
                query.key[0] === "strategy-detail" && query.key.includes(id),
            ),
        firstStrategyId,
      ),
    ).toMatchObject({ status: "error", retained: true });
    await expectNoFirstStrategy(page);
    await expect(
      page.getByRole("heading", { name: secondStrategy.title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(secondStrategy.nodes[0]!.title, { exact: true }),
    ).toHaveCount(2);
    await expectDocuments(page, true);
    await expect(count(page, "Current strategies")).toHaveText("2");
    for (const label of [
      "Active / in progress",
      "Next 30 days",
      "Open risks",
      "Linked artifacts",
    ])
      await expect(count(page, label)).toHaveText("—");
    state.statuses.first = 200;
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expectHealthy(page);
    await expect(count(page, "Linked artifacts")).toHaveText("3");
    expect(unexpected).toEqual([]);
  });
}

for (const source of ["documents", "client", "clients"] as const) {
  test(`a failed ${source} refresh removes cached Workspace rows without hiding healthy Strategies`, async ({
    page,
  }) => {
    const { state, unexpected } = await installWorkFixtures(page);
    await openWork(page);
    await expectHealthy(page);
    state.statuses[source] = 403;
    await refresh(page, source);
    expect(
      await page.evaluate(() =>
        window.__workBoundary
          ?.snapshots()
          .some((query) => query.status === "error" && query.retained),
      ),
    ).toBe(true);
    await expectDocuments(page, false);
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(
      page.getByText("No documents can be matched to this client."),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: firstStrategy.title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: secondStrategy.title, exact: true }),
    ).toBeVisible();
    await expect(count(page, "Linked artifacts")).toHaveText("3");
    state.statuses[source] = 200;
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expectDocuments(page, true);
    expect(unexpected).toEqual([]);
  });
}

for (const mismatch of ["strategy", "client"] as const) {
  test(`a Strategy detail with a different ${mismatch} ID is rejected before presentation`, async ({
    page,
  }) => {
    const { state, unexpected } = await installWorkFixtures(page);
    state.details[firstStrategyId] = {
      ...firstStrategy,
      ...(mismatch === "strategy"
        ? { id: secondStrategyId }
        : { clientId: otherClientId }),
    };
    await openWork(page);
    await expect(page.getByRole("alert")).toBeVisible();
    await expectNoFirstStrategy(page);
    await expect(
      page.getByRole("heading", { name: secondStrategy.title, exact: true }),
    ).toBeVisible();
    await expect(count(page, "Linked artifacts")).toHaveText("—");
    await expectDocuments(page, true);
    expect(
      await page.evaluate(
        (id) =>
          window.__workBoundary
            ?.snapshots()
            .find(
              (query) =>
                query.key[0] === "strategy-detail" && query.key.includes(id),
            ),
        firstStrategyId,
      ),
    ).toMatchObject({ status: "error", retained: false });
    state.details[firstStrategyId] = firstStrategy;
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expectHealthy(page);
    expect(unexpected).toEqual([]);
  });
}

test("a unique same-name catalog row for another client cannot supply current-client Workspace documents", async ({
  page,
}) => {
  const { state, unexpected } = await installWorkFixtures(page);
  state.clients = [{ ...client, id: otherClientId }];
  await openWork(page);
  await expect(
    page.getByRole("heading", { name: firstStrategy.title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No documents can be matched to this client."),
  ).toBeVisible();
  await expectDocuments(page, false);
  expect(unexpected).toEqual([]);
});

test("a mismatched current Client response cannot establish the Workspace association", async ({
  page,
}) => {
  const { state, unexpected } = await installWorkFixtures(page);
  state.client = { ...client, id: otherClientId };
  state.clients = [state.client];
  await openWork(page);
  await expect(
    page.getByRole("heading", { name: firstStrategy.title, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toBeVisible();
  await expectDocuments(page, false);
  await expect(
    page.getByText("No documents can be matched to this client."),
  ).toHaveCount(0);
  state.client = client;
  state.clients = [client];
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expectDocuments(page, true);
  expect(unexpected).toEqual([]);
});

test("a Strategy removed from the latest list cannot return through a late detail response", async ({
  page,
}) => {
  const { state, unexpected } = await installWorkFixtures(page);
  await openWork(page);
  await expectHealthy(page);
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started = false;
  let finished = false;
  await page.route(
    `**/strategy/strategies/${firstStrategyId}`,
    async (route) => {
      started = true;
      await held;
      try {
        await json(route, {
          ...firstStrategy,
          title: "Synthetic stale late strategy",
        });
      } finally {
        finished = true;
      }
    },
  );
  await page.evaluate(() => {
    void window.__workBoundary?.refresh("details");
  });
  await expect.poll(() => started).toBe(true);
  state.summaries = state.summaries.filter(
    (summary) => summary.id !== firstStrategyId,
  );
  await refresh(page, "summaries");
  await expectNoFirstStrategy(page);
  release();
  await expect.poll(() => finished).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Synthetic stale late strategy" }),
  ).toHaveCount(0);
  await expect(count(page, "Current strategies")).toHaveText("1");
  await expect(
    page.getByRole("heading", { name: secondStrategy.title, exact: true }),
  ).toBeVisible();
  await expectDocuments(page, true);
  expect(unexpected).toEqual([]);
});

test("changing client scope requires a matching detail read even when the strategy ID is cached", async ({
  page,
}) => {
  const { state, unexpected } = await installWorkFixtures(page);
  await openWork(page);
  await expectHealthy(page);
  const otherClient = {
    ...client,
    id: otherClientId,
    name: "Synthetic other client",
  };
  await page.route(`**/core/clients/${otherClientId}`, (route) =>
    json(route, otherClient),
  );
  state.clients = [client, otherClient];
  state.summaries = [
    {
      ...firstStrategy,
      clientId: otherClientId,
      nodeCount: firstStrategy.nodes.length,
    },
  ];
  await page.evaluate(
    (id) => window.__workBoundary?.changeClient(id),
    otherClientId,
  );
  await expect(page.getByRole("alert")).toBeVisible();
  await expectNoFirstStrategy(page);
  await expectDocuments(page, false);
  await expect(
    page.getByRole("link", { name: "Open Strategies", exact: true }),
  ).toHaveAttribute("href", `/modules/strategies?clientId=${otherClientId}`);
  state.details[firstStrategyId] = {
    ...firstStrategy,
    clientId: otherClientId,
    title: "Synthetic verified other-client strategy",
  };
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Synthetic verified other-client strategy",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: firstStrategy.title, exact: true }),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

test("a failed refresh of an empty Strategy list does not retain a successful empty claim", async ({
  page,
}) => {
  const { state, unexpected } = await installWorkFixtures(page);
  state.summaries = [];
  await openWork(page);
  await expect(
    page.getByText("No current strategies for this client."),
  ).toBeVisible();
  await expectDocuments(page, true);
  state.statuses.summaries = 403;
  await refresh(page, "summaries");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByText("No current strategies for this client."),
  ).toHaveCount(0);
  await expectUnavailablePortfolio(page);
  await expectDocuments(page, true);
  expect(unexpected).toEqual([]);
});

test("healthy Work keeps native counts, the five-node preview and exact Strategy links", async ({
  page,
}) => {
  const { state, unexpected, requests } = await installWorkFixtures(page);
  state.details[firstStrategyId] = {
    ...firstStrategy,
    nodes: [
      ...firstStrategy.nodes,
      ...Array.from({ length: 5 }, (_, index) => ({
        ...firstStrategy.nodes[0]!,
        id: `93300000-0000-4000-8000-00000000000${index + 1}`,
        title: `Synthetic draft step ${index + 1}`,
        status: "draft",
      })),
    ],
  };
  await openWork(page);
  await expectHealthy(page);
  for (const [label, value] of [
    ["Current strategies", "2"],
    ["Active / in progress", "2"],
    ["Next 30 days", "2"],
    ["Open risks", "1"],
    ["Linked artifacts", "3"],
  ])
    await expect(count(page, label!)).toHaveText(value!);
  const firstCard = page.getByRole("article").filter({
    has: page.getByRole("heading", {
      name: firstStrategy.title,
      exact: true,
    }),
  });
  await expect(firstCard.getByRole("link", { name: "Open step" })).toHaveCount(
    5,
  );
  await expect(
    page.getByText("Synthetic draft step 4", { exact: true }),
  ).toHaveCount(0);
  await expect(
    firstCard.getByRole("link", { name: "Open strategy" }),
  ).toHaveAttribute(
    "href",
    `/modules/strategies?clientId=${clientId}&strategy=${firstStrategyId}`,
  );
  await expect(
    firstCard.getByRole("link", { name: "Open step" }).first(),
  ).toHaveAttribute(
    "href",
    `/modules/strategies?clientId=${clientId}&strategy=${firstStrategyId}&step=${firstNodeId}`,
  );
  await expect(
    firstCard.locator(
      `a[href="/modules/strategies?clientId=${clientId}&strategy=${firstStrategyId}&step=${firstNodeId}"]`,
    ),
  ).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Open risk" })).toHaveAttribute(
    "href",
    `/modules/strategies?clientId=${clientId}&strategy=${firstStrategyId}&step=${riskId}`,
  );
  await expect(
    page.getByRole("link", { name: "New strategy", exact: true }),
  ).toHaveAttribute(
    "href",
    `/modules/strategies?clientId=${clientId}&create=strategy`,
  );
  expect(requests.every((request) => request.startsWith("GET "))).toBe(true);
  expect(requests.some((request) => request.includes("planner"))).toBe(false);
  expect(unexpected).toEqual([]);
});
