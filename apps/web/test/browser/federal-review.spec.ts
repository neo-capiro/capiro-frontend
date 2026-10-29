import { test, expect } from "@playwright/test";
async function prepare(page: import("@playwright/test").Page) {
  await page
    .getByRole("button", { name: "Browse source files and saved reviews" })
    .click();
  await page
    .getByRole("button", { name: "Open source", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("Partial source coverage.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Exact text to find", { exact: true }).fill("$100");
  await page.getByLabel("New text", { exact: true }).fill("$150");
  await page
    .getByRole("button", { name: "Prepare amendment for review" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review this revision" }),
  ).toBeVisible();
}
test("exact review requires confirmation, saves a review revision and exposes verified export download", async ({
  page,
}) => {
  await page.goto("/federal-review/index.html");
  await prepare(page);
  await expect(
    page.getByRole("button", { name: "Export operative", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Save review revision" }).click();
  await expect(
    page.getByRole("button", { name: "Show revision history" }),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Export operative", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Get verified file" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Get verified file" }).click();
  await expect(
    page.getByRole("link", { name: /Save Operative amendment/ }),
  ).toBeVisible();
});
test("a changed edit discards the reviewed output and confirmation", async ({
  page,
}) => {
  await page.goto("/federal-review/index.html");
  await prepare(page);
  await page.getByRole("checkbox").check();
  await page.getByLabel("New text", { exact: true }).fill("$175");
  await expect(
    page.getByRole("heading", { name: "Review this revision" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Export operative", exact: true }),
  ).toHaveCount(0);
});
test("remounted review recovers the original delivery and a different output sends no new publication", async ({
  page,
}) => {
  await page.goto("/federal-review/index.html?unknown=1");
  await prepare(page);
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Export operative", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Recover original operation",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Remount workbench" }).click();
  await page
    .getByRole("button", { name: "Browse source files and saved reviews" })
    .click();
  await page
    .getByRole("button", { name: "Open saved review", exact: true })
    .last()
    .click();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Recover original redline", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("original");
  expect(
    await page.evaluate(
      () =>
        window.federalCalls.filter((x) => x.route === "federal-publish").length,
    ),
  ).toBe(1);
  await page
    .getByRole("button", { name: "Recover original operative", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Get verified file" }),
  ).toBeVisible();
  const deliveries = await page.evaluate(() =>
    window.federalCalls
      .filter((x) => x.route === "federal-publish")
      .map((x) => x.body.deliveryId),
  );
  expect(deliveries).toHaveLength(2);
  expect(deliveries[0]).toBe(deliveries[1]);
});
