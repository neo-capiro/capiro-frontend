import { test, expect } from "@playwright/test";
import {
  filingIntent,
  memoryReviewIntent,
  nativeTaskIntent,
} from "../../tests/meri-intents-native-fixtures";
import { onlyLocalRequests } from "./fixtures";

test("memory submission and withheld history render without task approval or automatic effects", async ({
  page,
}) => {
  const visible = memoryReviewIntent();
  const withheld = memoryReviewIntent(true).response.intents[0];
  withheld.deliveryId = `sdk:${"2".repeat(64)}`;
  visible.response.intents.push(withheld);
  let decisions = 0;
  await onlyLocalRequests(page);
  await page.route("**/api/conversations/intents/list", (route) =>
    route.fulfill({ json: visible.response }),
  );
  await page.route("**/api/conversations/intents/decide", (route) => {
    decisions++;
    return route.abort();
  });
  await page.goto("/intents");
  await expect(
    page.getByText("Submitted for review", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Withheld", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/This receipt does not confirm a saved or published memory/),
  ).toBeVisible();
  await expect(
    page.getByText("Candidate reference", { exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: /Approve|Reject|Check result/ }),
  ).toHaveCount(0);
  expect(decisions).toBe(0);
});

test("filing history displays partial results and indexing separately without repeating the action", async ({
  page,
}) => {
  const fixture = filingIntent();
  let decisions = 0;
  await onlyLocalRequests(page);
  await page.route("**/api/conversations/intents/list", (route) =>
    route.fulfill({ json: fixture.response }),
  );
  await page.route("**/api/conversations/intents/decide", (route) => {
    decisions++;
    return route.abort();
  });
  await page.goto("/intents");
  await expect(
    page.getByText("Filing needs attention", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/1 saved, 1 pending, 1 failed/)).toBeVisible();
  const results = page.getByRole("definition");
  await expect(results.filter({ hasText: /^saved-1.txt$/ })).toBeVisible();
  await expect(results.filter({ hasText: /^pending-2.txt$/ })).toBeVisible();
  await expect(results.filter({ hasText: /^failed-3.txt$/ })).toBeVisible();
  await expect(results.filter({ hasText: /^Not indexed$/ })).toBeVisible();
  await expect(
    page.getByText("File was not stored", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Approve|Reject|Check result/ }),
  ).toHaveCount(0);
  expect(decisions).toBe(0);
});

test("native task execution history shows the actual create and update results", async ({
  page,
}) => {
  const created = nativeTaskIntent();
  const updated = nativeTaskIntent(true).response.intents[0];
  updated.deliveryId = `sdk:${"2".repeat(64)}`;
  created.response.intents.push(updated);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await onlyLocalRequests(page);
  await page.route("**/api/conversations/intents/list", (route) =>
    route.fulfill({ json: created.response }),
  );
  await page.goto("/intents");
  await expect(page.getByText("Task created", { exact: true })).toBeVisible();
  await expect(page.getByText("Task updated", { exact: true })).toBeVisible();
  await expect(page.getByText("in progress", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Approve|Reject|Check result/ }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
