import { expect, test } from "@playwright/test";
import { expectAccessibleHome } from "../accessibility";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";

const path = "/__test/auth-initialization?providerStatus=loading";
test.beforeEach(async ({ page }) => {
  await onlyLocalRequests(page);
  await operationFixtures(page, { "me.read": testIdentity });
  await page.clock.install();
});

for (const width of [1440, 390]) {
  test(`prolonged sign-in loading offers keyboard reload without admitting private content at ${width}px`, async ({
    page,
  }, info) => {
    const reads: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/"))
        reads.push(request.url());
    });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(path);
    await expect(
      page.getByText("Loading sign-in…", { exact: true }),
    ).toBeVisible();
    await page.clock.fastForward(15_000);
    await expect(
      page.getByRole("heading", {
        name: "Sign-in is taking longer than expected",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText(/contact your administrator/)).toBeVisible();
    await expect(page.getByTestId("identity")).toHaveCount(0);
    await expect(page.locator("[data-portfolio-root]")).toHaveCount(0);
    await expect(page.getByRole("main")).toHaveCSS("display", "flex");
    expect(reads).toEqual([]);
    await expectAccessibleHome(page, info);
    await page.screenshot({
      path: info.outputPath(`auth-loading-${width}.png`),
      fullPage: true,
    });
    const reload = page.getByRole("button", { name: "Reload", exact: true });
    await reload.focus();
    await expect(reload).toBeFocused();
    const navigation = page.waitForEvent("load");
    await page.keyboard.press("Enter");
    await navigation;
    await expect(
      page.getByText("Loading sign-in…", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Sign-in is taking longer than expected",
        exact: true,
      }),
    ).toHaveCount(0);
    expect(reads).toEqual([]);
  });
}

test("SDK ready disposes delayed loading state and permits only the existing protected path", async ({
  page,
}) => {
  await page.goto(path);
  await expect(
    page.getByText("Loading sign-in…", { exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(10_000);
  await page.evaluate(() =>
    dispatchEvent(
      new CustomEvent("test:session", {
        detail: { providerStatus: "ready", isLoaded: true },
      }),
    ),
  );
  await expect(page.getByTestId("identity")).toContainText(
    testIdentity.tenant.name,
  );
  await page.clock.fastForward(20_000);
  await expect(
    page.getByRole("button", { name: "Reload", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByTestId("identity")).toBeVisible();
});

test("SDK failed replaces delayed loading with the existing failure state and no private reads", async ({
  page,
}) => {
  const reads: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      reads.push(request.url());
  });
  await page.goto(path);
  await expect(
    page.getByText("Loading sign-in…", { exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(15_000);
  await expect(
    page.getByRole("heading", {
      name: "Sign-in is taking longer than expected",
      exact: true,
    }),
  ).toBeVisible();
  await page.evaluate(() =>
    dispatchEvent(
      new CustomEvent("test:session", {
        detail: { providerStatus: "error", isLoaded: false },
      }),
    ),
  );
  await expect(
    page.getByRole("heading", { name: "Sign-in unavailable", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(20_000);
  await expect(
    page.getByRole("heading", {
      name: "Sign-in is taking longer than expected",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(reads).toEqual([]);
});

test("returning to SDK loading starts a fresh feedback window and conceals the previous private view", async ({
  page,
}) => {
  await page.goto(path);
  await expect(
    page.getByText("Loading sign-in…", { exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(15_000);
  await expect(
    page.getByRole("button", { name: "Reload", exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    dispatchEvent(
      new CustomEvent("test:session", {
        detail: { providerStatus: "ready", isLoaded: true },
      }),
    ),
  );
  await expect(page.getByTestId("identity")).toBeVisible();
  await page.evaluate(() =>
    dispatchEvent(
      new CustomEvent("test:session", {
        detail: { providerStatus: "loading", isLoaded: false },
      }),
    ),
  );
  await expect(
    page.getByText("Loading sign-in…", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("identity")).toHaveCount(0);
  await page.clock.fastForward(14_000);
  await expect(
    page.getByRole("button", { name: "Reload", exact: true }),
  ).toHaveCount(0);
  await page.clock.fastForward(1_000);
  await expect(
    page.getByRole("heading", {
      name: "Sign-in is taking longer than expected",
      exact: true,
    }),
  ).toBeVisible();
});
