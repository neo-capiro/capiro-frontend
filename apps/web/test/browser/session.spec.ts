import { test, expect } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await onlyLocalRequests(page);
});
test("missing configuration renders setup without issuing service requests", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/capiro/")) requests.push(request.url());
  });
  await page.goto("/__test/unconfigured");
  await expect(
    page.getByRole("heading", { name: "Connection setup required" }),
  ).toBeVisible();
  expect(requests).toEqual([]);
});
test("org/session change clears prior records and sign-out removes all protected content", async ({
  page,
}) => {
  let current = testIdentity;
  await operationFixtures(page, { "me.read": () => current });
  await page.goto("/__test/session");
  await expect(page.getByTestId("identity")).toContainText("Test Firm");
  current = {
    ...testIdentity,
    tenant: { ...testIdentity.tenant, name: "Second Test Firm" },
  };
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { orgId: "second-test-org", sessionId: "second-test-session" },
      }),
    ),
  );
  await expect(page.getByTestId("identity")).toHaveText(
    "Second Test Firm · Test",
  );
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { userId: null, sessionId: null, orgId: null },
      }),
    ),
  );
  await expect(
    page.getByRole("heading", { name: "Sign in to Capiro" }),
  ).toBeVisible();
  await expect(page.getByTestId("identity")).toHaveCount(0);
});
test("401 removes protected content and asks for sign-in without replaying a request", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/capiro/me.read*", (route) => {
    requests += 1;
    return route.fulfill({ status: 401, json: { message: "Expired" } });
  });
  await page.goto("/__test/session");
  await expect(
    page.getByRole("heading", { name: "Your session expired" }),
  ).toBeVisible();
  await expect(page.getByTestId("identity")).toHaveCount(0);
  expect(requests).toBe(1);
});

test("development StrictMode remount establishes a valid request scope before child reads", async ({
  page,
}) => {
  await operationFixtures(page, { "me.read": testIdentity });
  await page.goto("/__test/strict");
  await expect(page.getByTestId("identity")).toHaveText("Test Firm · Test");
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
});
