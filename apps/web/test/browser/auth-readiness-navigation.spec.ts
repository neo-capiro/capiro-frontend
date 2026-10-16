import { expect, test } from "@playwright/test";
import { onlyLocalRequests, testIdentity } from "./fixtures";

const path = "/auth-lifecycle.html?providerStatus=loading&view=overview";
test.beforeEach(async ({ page }) => {
  await onlyLocalRequests(page);
});

test("delayed SDK readiness survives navigation and reload without admitting backend reads early", async ({
  page,
}) => {
  let reads = 0;
  await page.route("**/api/capiro/me.read*", (route) => {
    reads++;
    return route.fulfill({ json: testIdentity });
  });
  await page.goto(path);
  await expect(
    page.getByText("Loading sign-in…", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    const url = new URL(location.href);
    url.searchParams.set("view", "team");
    history.pushState({}, "", url);
    dispatchEvent(new PopStateEvent("popstate"));
  });
  expect(reads).toBe(0);
  await page.evaluate(() =>
    dispatchEvent(
      new CustomEvent("test:session", {
        detail: { providerStatus: "ready", isLoaded: true },
      }),
    ),
  );
  await expect(page.getByTestId("identity")).toHaveText(
    testIdentity.tenant.name,
  );
  await expect(page.getByRole("heading")).toHaveText(
    "Synthetic authenticated view: team",
  );
  expect(reads).toBe(1);
  await page.reload();
  await expect(
    page.getByText("Loading sign-in…", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("identity")).toHaveCount(0);
  expect(reads).toBe(1);
  await page.evaluate(() =>
    dispatchEvent(
      new CustomEvent("test:session", {
        detail: { providerStatus: "ready", isLoaded: true },
      }),
    ),
  );
  await expect(page.getByTestId("identity")).toHaveText(
    testIdentity.tenant.name,
  );
  await expect(page.getByRole("heading")).toHaveText(
    "Synthetic authenticated view: team",
  );
  expect(reads).toBe(2);
});

test("provider loaded and auth loaded remain separate; backend refusal still expires the session", async ({
  page,
}) => {
  let reads = 0;
  await page.route("**/api/capiro/me.read*", (route) => {
    reads++;
    return route.fulfill({
      status: 401,
      json: { message: "Synthetic expired" },
    });
  });
  await page.goto(path);
  await page.evaluate(() =>
    dispatchEvent(
      new CustomEvent("test:session", {
        detail: {
          providerStatus: "ready",
          providerLoaded: true,
          isLoaded: false,
        },
      }),
    ),
  );
  await expect(
    page.getByText("Loading your session…", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("identity")).toHaveCount(0);
  expect(reads).toBe(0);
  await page.evaluate(() =>
    dispatchEvent(
      new CustomEvent("test:session", {
        detail: { providerStatus: "ready", isLoaded: true },
      }),
    ),
  );
  await expect(
    page.getByRole("heading", { name: "Your session expired", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("identity")).toHaveCount(0);
  expect(reads).toBe(1);
});

test("ClerkLoaded fixture follows loaded independently of status", async ({
  page,
}) => {
  let reads = 0;
  await page.route("**/api/capiro/me.read*", (route) => {
    reads++;
    return route.fulfill({ json: testIdentity });
  });
  await page.goto(path);
  await page.evaluate(() =>
    dispatchEvent(
      new CustomEvent("test:session", {
        detail: {
          providerStatus: "ready",
          providerLoaded: false,
          isLoaded: true,
        },
      }),
    ),
  );
  await expect(page.getByTestId("fixture-readiness")).toHaveText(
    "ready:false:true",
  );
  await expect(page.getByTestId("identity")).toHaveCount(0);
  await expect(page.getByRole("heading")).toHaveCount(0);
  expect(reads).toBe(0);
  await page.evaluate(() =>
    dispatchEvent(
      new CustomEvent("test:session", {
        detail: {
          providerStatus: "ready",
          providerLoaded: true,
          isLoaded: true,
        },
      }),
    ),
  );
  await expect(page.getByTestId("identity")).toHaveText(
    testIdentity.tenant.name,
  );
  expect(reads).toBe(1);
});
