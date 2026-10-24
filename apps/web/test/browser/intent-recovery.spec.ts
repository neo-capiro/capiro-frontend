import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const wire = (name: string) =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../tests/fixtures/meri-intents/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
const awaiting = wire("listAwaiting"),
  rejected = wire("listRejected"),
  decided = wire("decideRejected"),
  context = wire("context");

async function open(page: Page) {
  await page.clock.install({ time: context.syntheticNow });
  await page.goto("/intents");
  await expect(
    page.getByRole("button", { name: "Reject…", exact: true }),
  ).toBeEnabled();
}

test("hard reload while the decision HTTP is pending recovers only the exact choice without another automatic request", async ({
  page,
}) => {
  let calls = 0,
    settled = false;
  const requests: unknown[] = [];
  await page.route("**/api/conversations/intents/list", (route) =>
    route.fulfill({ json: settled ? rejected.response : awaiting.response }),
  );
  await page.route("**/api/conversations/intents/decide", async (route) => {
    requests.push(route.request().postDataJSON());
    if (++calls === 1) return; // Deliberately never deliver the first response before hard reload.
    settled = true;
    await route.fulfill({ json: decided.response });
  });
  await open(page);
  await page.getByRole("button", { name: "Reject…", exact: true }).click();
  await page.getByRole("button", { name: "Confirm rejection" }).click();
  await expect.poll(() => calls).toBe(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Check result", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Approve…", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Reject…", exact: true }),
  ).toHaveCount(0);
  expect(calls).toBe(1);
  await page.getByRole("button", { name: "Check result", exact: true }).click();
  await expect(page.getByText("Rejected", { exact: true })).toBeVisible();
  expect(requests).toEqual([decided.request, decided.request]);
  await page.reload();
  await expect(page.getByText("Rejected", { exact: true })).toBeVisible();
  expect(calls).toBe(2);
});

test("replacement session waits for its current list and cannot adopt the original actor's pending decision", async ({
  page,
}) => {
  let listCalls = 0,
    release: (() => void) | undefined;
  let decisions = 0;
  await page.route("**/api/conversations/intents/list", async (route) => {
    if (++listCalls === 2)
      await new Promise<void>((done) => {
        release = done;
      });
    await route.fulfill({ json: awaiting.response });
  });
  await page.route("**/api/conversations/intents/decide", (route) => {
    decisions++;
    return route.abort();
  });
  await open(page);
  await page.getByRole("button", { name: "Reject…", exact: true }).click();
  await page.getByRole("button", { name: "Confirm rejection" }).click();
  await expect.poll(() => decisions).toBe(1);
  await expect.poll(() => listCalls).toBe(2);
  release!();
  await expect(
    page.getByRole("button", { name: "Check result", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Change actor" }).click();
  await expect(
    page.getByText("Needs another approver", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Check result", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Approve…", exact: true }),
  ).toHaveCount(0);
  expect(decisions).toBe(1);
});

test("replacement session hides the old list until its own response arrives", async ({
  page,
}) => {
  let count = 0,
    release: (() => void) | undefined;
  await page.route("**/api/conversations/intents/list", async (route) => {
    if (++count === 2)
      await new Promise<void>((done) => {
        release = done;
      });
    await route.fulfill({ json: awaiting.response });
  });
  await open(page);
  await page.getByRole("button", { name: "Replace session" }).click();
  await expect.poll(() => count).toBe(2);
  await expect(
    page.getByRole("button", { name: "Approve…", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Reading the actions Meri prepared…", { exact: true }),
  ).toBeVisible();
  release!();
  await expect(
    page.getByRole("button", { name: "Approve…", exact: true }),
  ).toBeEnabled();
});
