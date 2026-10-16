import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import {
  client,
  clientId,
  otherClientId,
  setup,
} from "./next-modules-fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";

const strategyId = "51000000-0000-4000-8000-000000000001";
const stepId = "61000000-0000-4000-8000-000000000001";
const node = {
  id: stepId,
  strategyId,
  kind: "action",
  subject: "deliverable",
  title: "Synthetic current step",
  note: "Current saved step",
  ownerUserId: null,
  status: "active",
  startsOn: "2026-10-20",
  endsOn: null,
  openEnded: false,
  dependsOnIds: [],
  updatedAt: "2026-10-15T12:00:00Z",
  archivedAt: null,
};
const strategy = {
  id: strategyId,
  clientId,
  title: "Synthetic current Strategy",
  type: "appropriations",
  ownerUserId: null,
  goal: "Synthetic goal",
  meriContext: null,
  targetDate: null,
  lastEditedAt: "2026-10-15T12:00:00Z",
  nodes: [node],
};
const summary = {
  ...strategy,
  createdByUserId: "test-user",
  lastEditedByUserId: null,
  createdAt: strategy.lastEditedAt,
  nodeCount: 1,
  summary: {
    assignedCount: 0,
    unassignedCount: 1,
    completedCount: 0,
    reviewCount: 0,
  },
};
const calendars = {
  congress: [],
  ppbeLanes: [],
  ppbeCurrentPhases: [],
  source: {},
};
const href = `/modules/strategies?clientId=${clientId}&strategy=${strategyId}&step=${stepId}`;

test("Work's step destination opens exactly the current verified Strategy node and survives reload", async ({
  page,
}) => {
  await setup(page, {
    ...moduleRouteFixtures,
    "clients.list": [client],
    "strategies.detail": strategy,
    "strategies.calendars": calendars,
  });
  await page.goto(href);
  await expect(
    page.getByRole("dialog", { name: node.title, exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Title *", { exact: true })).toHaveValue(
    node.title,
  );
  await page.reload();
  await expect(
    page.getByRole("dialog", { name: node.title, exact: true }),
  ).toBeVisible();
});

for (const [label, nodes] of [
  ["missing", []],
  [
    "foreign",
    [{ ...node, strategyId: "51000000-0000-4000-8000-000000000002" }],
  ],
  ["archived", [{ ...node, archivedAt: "2026-10-15T13:00:00Z" }]],
  ["duplicate", [node, node]],
] as const)
  test(`${label} requested step shows unavailable rather than opening a different surface`, async ({
    page,
  }) => {
    await setup(page, {
      ...moduleRouteFixtures,
      "clients.list": [client],
      "strategies.detail": { ...strategy, nodes },
    });
    await page.goto(href);
    await expect(
      page.getByText(
        "This Strategy step is unavailable in the current Strategy.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: strategy.title, exact: true }),
    ).toHaveCount(0);
  });

test("malformed and duplicate step selectors do not issue a Strategy detail read", async ({
  page,
}) => {
  let reads = 0;
  await setup(page, {
    ...moduleRouteFixtures,
    "strategies.detail": () => {
      reads++;
      return strategy;
    },
  });
  for (const url of [
    href.replace(stepId, "invalid"),
    `${href}&step=${stepId}`,
  ]) {
    await page.goto(url);
    await expect(
      page.getByText("This Strategy link is invalid.", { exact: true }),
    ).toBeVisible();
  }
  expect(reads).toBe(0);
});

test("view/client navigation is reflected by URL, history and reload; library opens an exact-client detail", async ({
  page,
}) => {
  await setup(page, {
    ...moduleRouteFixtures,
    "clients.list": [client],
    "strategies.list": [summary],
    "strategies.detail": strategy,
    "strategies.calendars": calendars,
    "strategies.context.documents": [],
  });
  await page.goto(`/modules/strategies?clientId=${clientId}&view=context`);
  await expect(
    page.getByRole("heading", { name: "Context library", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Strategies", exact: true }).click();
  await expect(page).toHaveURL(`/modules/strategies?clientId=${clientId}`);
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Context library", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Context library", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Strategies", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Strategy client scope", exact: true })
    .click();
  await page.getByRole("option", { name: "All clients", exact: true }).click();
  await expect(page).toHaveURL("/modules/strategies");
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Strategy client scope", exact: true }),
  ).toContainText("All clients");
  await page.getByRole("button", { name: strategy.title, exact: true }).click();
  await expect(page).toHaveURL(
    `/modules/strategies?clientId=${clientId}&strategy=${strategyId}`,
  );
  await expect(
    page.getByRole("heading", { name: strategy.title, exact: true }),
  ).toBeVisible();
});

test("New strategy consumes the current catalog-backed client hint and routes only after acknowledgement", async ({
  page,
}) => {
  const writes: unknown[] = [];
  await setup(page, {
    ...moduleRouteFixtures,
    "clients.list": [client],
    "strategies.detail": strategy,
    "strategies.calendars": calendars,
    "strategies.create": (input) => {
      writes.push(input);
      return strategy;
    },
  });
  await page.goto(`/modules/strategies?clientId=${clientId}&create=strategy`);
  const dialog = page.getByRole("dialog", {
    name: "New strategy",
    exact: true,
  });
  await expect(
    dialog.getByRole("combobox", { name: "Client *", exact: true }),
  ).toContainText(client.name);
  await dialog
    .getByLabel("Goal statement *", { exact: true })
    .fill("Synthetic goal");
  await dialog
    .getByRole("button", { name: "Create strategy", exact: true })
    .click();
  await expect(page).toHaveURL(
    `/modules/strategies?clientId=${clientId}&strategy=${strategyId}`,
  );
  expect(writes).toEqual([
    {
      body: {
        clientId,
        type: "appropriations",
        goal: "Synthetic goal",
        meriContext: "",
      },
    },
  ]);
});

test("a client hint missing from the current creation catalog cannot enable Create", async ({
  page,
}) => {
  await setup(page, { ...moduleRouteFixtures, "clients.list": [client] });
  await page.goto(
    `/modules/strategies?clientId=${otherClientId}&create=strategy`,
  );
  const dialog = page.getByRole("dialog", {
    name: "New strategy",
    exact: true,
  });
  await dialog
    .getByLabel("Goal statement *", { exact: true })
    .fill("Synthetic goal");
  await expect(
    dialog.getByRole("button", { name: "Create strategy", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("combobox", { name: "Client *", exact: true }),
  ).toContainText("Selected client unavailable");
});
