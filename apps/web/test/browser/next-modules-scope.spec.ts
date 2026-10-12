import { expect, test, type Route } from "@playwright/test";
import {
  client,
  clientId,
  meeting,
  navigate,
  nextTask,
  otherClient,
  otherClientId,
  setup,
} from "./next-modules-fixtures";

test("Calendar picker and history share verified scope and discard a held former-client read", async ({
  page,
}) => {
  let old: Route | undefined;
  const reads: string[] = [];
  await setup(page);
  await page.route("**/api/capiro/engagement.meetings*", async (route) => {
    const input = JSON.parse(
      new URL(route.request().url()).searchParams.get("input")!,
    );
    reads.push(input.query.clientId ?? "master");
    if (input.query.clientId === clientId && !old) {
      old = route;
      return;
    }
    await route.fulfill({
      json:
        input.query.clientId === otherClientId
          ? [
              {
                ...meeting,
                subject: "Other current meeting",
                client: { id: otherClientId, name: otherClient.name },
              },
            ]
          : [],
    });
  });
  await page.goto(`/modules/calendar?clientId=${clientId}`);
  await expect.poll(() => Boolean(old)).toBe(true);
  await page.getByLabel("Calendar client scope").selectOption(otherClientId);
  await expect(page).toHaveURL(`/modules/calendar?clientId=${otherClientId}`);
  await expect(page.getByLabel("Calendar client scope")).toHaveValue(
    otherClientId,
  );
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.getByRole("table")).toContainText("Other current meeting");
  await old!.fulfill({ json: [meeting] }).catch(() => {});
  await expect(page.getByRole("table")).not.toContainText(meeting.subject);
  await page.goBack();
  await expect(page.getByLabel("Calendar client scope")).toHaveValue(clientId);
  await page.goForward();
  await expect(page.getByLabel("Calendar client scope")).toHaveValue(
    otherClientId,
  );
  await page.getByLabel("Calendar client scope").selectOption("");
  await expect(page).toHaveURL("/modules/calendar");
  await expect(page.getByLabel("Calendar client scope")).toHaveValue("");
  expect(reads).toContain("master");
});

for (const reason of ["denied", "wrong-client"] as const)
  test(`Calendar ${reason} client verification never falls back to master reads`, async ({
    page,
  }) => {
    let meetings = 0;
    await setup(page, {
      "engagement.meetings": () => {
        meetings++;
        return [];
      },
    });
    await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
      route.fulfill(
        reason === "denied"
          ? { status: 403, json: { message: "No current access" } }
          : { json: otherClient },
      ),
    );
    await page.goto(`/modules/calendar?clientId=${clientId}`);
    await expect(
      page.getByRole("heading", { name: "Selected client unavailable" }),
    ).toBeVisible();
    expect(meetings).toBe(0);
  });

test("Calendar current scope label survives optional picker-list failure", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/api/capiro/clients.list*", (route) =>
    route.fulfill({ status: 503, json: { message: "Picker unavailable" } }),
  );
  await page.goto(`/modules/calendar?clientId=${clientId}`);
  await expect(page.getByLabel("Calendar client scope")).toHaveValue(clientId);
  await expect(page.getByLabel("Calendar client scope")).toBeDisabled();
  await expect(
    page.getByText(new RegExp(`${client.name} · Client-associated`)),
  ).toBeVisible();
});

test("Calendar meeting retry preserves other feeds and reports partial empty coverage", async ({
  page,
}, info) => {
  let failed = true;
  await setup(page);
  await page.route("**/api/capiro/engagement.meetings*", (route) =>
    route.fulfill(
      failed
        ? { status: 503, json: { message: "Current meetings unavailable" } }
        : { json: [meeting] },
    ),
  );
  await page.goto("/modules/calendar");
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.getByRole("table")).toContainText(nextTask.name);
  await expect(
    page.getByRole("button", { name: /Meetings Unavailable/ }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("independent-feeds.png") });
  await page.getByLabel("Search calendar events").fill("no matching events");
  await expect(
    page.getByText(
      "No matching events in the available sources. Some source coverage is unavailable or incomplete.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No events match this view" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  failed = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("table")).toContainText(meeting.subject);
  await expect(page.getByRole("table")).toContainText(nextTask.name);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("Calendar tenant replacement and failed current read hide prior agenda rows", async ({
  page,
}) => {
  let failed = false;
  await setup(page);
  await page.route("**/api/capiro/planner.tasks*", (route) =>
    route.fulfill(
      failed
        ? { status: 403, json: { message: "Task feed denied" } }
        : { json: { items: [nextTask], nextCursor: null } },
    ),
  );
  await page.goto("/modules/calendar");
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.getByRole("table")).toContainText(nextTask.name);
  failed = true;
  await page.evaluate(() =>
    dispatchEvent(
      new CustomEvent("test:session", {
        detail: { orgId: "replacement-org", sessionId: "replacement-session" },
      }),
    ),
  );
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.getByText(/Planner unavailable:/)).toBeVisible();
  await expect(page.getByRole("table")).not.toContainText(nextTask.name);
  await navigate(page, `/modules/calendar?clientId=${clientId}`);
  await expect(page.getByLabel("Calendar client scope")).toHaveValue(clientId);
  await expect(page.getByText(nextTask.name, { exact: true })).toHaveCount(0);
});
