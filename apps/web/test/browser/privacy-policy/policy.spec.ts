import { test, expect, type Page } from "@playwright/test";
import { policyRead } from "../../../tests/memory-retention-policy-fixture";
const endpoint = "**/api/capiro/memory.retentionPolicy.read?*";
async function open(page: Page) {
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.goto("/privacy-policy/index.html");
  await page
    .getByRole("tab", { name: "Privacy and retention", exact: true })
    .click();
}
test("connected Settings shows installed rules and links to canonical conversation actions", async ({
  page,
}) => {
  const methods: string[] = [];
  await page.route(endpoint, (route) => {
    methods.push(route.request().method());
    return route.fulfill({ json: policyRead });
  });
  await open(page);
  await expect(
    page.getByRole("cell", {
      name: "Hidden immediately after offboarding; eligible for cleanup after 30 days.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: /after 90 days/ })).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /Saving again does not extend/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("note", { name: "Legal holds and related records" }),
  ).toContainText("remain retained");
  await expect(
    page.getByRole("link", {
      name: "Choose a conversation to export or delete",
    }),
  ).toHaveAttribute("href", "/meri/conversations#chat-title-search");
  await expect(
    page.getByRole("button", { name: "Delete conversation" }),
  ).toHaveCount(0);
  expect(methods.length).toBeGreaterThan(0);
  expect(methods.every((method) => method === "GET")).toBe(true);
});
test("failed refresh removes prior policy values and can recover a current read", async ({
  page,
}) => {
  let fail = false;
  await page.route(endpoint, (route) =>
    fail
      ? route.fulfill({
          status: 503,
          json: { message: "Installed policy unavailable" },
        })
      : route.fulfill({ json: policyRead }),
  );
  await open(page);
  await expect(
    page.getByText(/eligible for cleanup after 30 days/),
  ).toBeVisible();
  fail = true;
  await page.getByRole("button", { name: "Refresh policy" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Installed policy unavailable",
  );
  await expect(
    page.getByText(/eligible for cleanup after 30 days/),
  ).toHaveCount(0);
  await expect(
    page.getByRole("cell", {
      name: "Current installed policy unavailable. Refresh to try again.",
      exact: true,
    }),
  ).toHaveCount(4);
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByText(/eligible for cleanup after 30 days/),
  ).toBeVisible();
});
test("account change discards a delayed policy and rechecks the new session", async ({
  page,
}) => {
  let release!: () => void,
    changed = false;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(endpoint, async (route) => {
    if (changed)
      return route.fulfill({ status: 401, json: { message: "Expired" } });
    await held;
    await route.fulfill({ json: policyRead }).catch(() => {});
  });
  await open(page);
  changed = true;
  await page.getByRole("button", { name: "Change account" }).click();
  await page
    .getByRole("tab", { name: "Privacy and retention", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText("Session expired");
  release();
  await expect(
    page.getByText(/eligible for cleanup after 30 days/),
  ).toHaveCount(0);
});
