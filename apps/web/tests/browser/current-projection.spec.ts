import { test, expect, type Page } from "@playwright/test";
import { client, clientId, installFixtures, json } from "./fixtures";

async function refresh(page: Page, source: "clients" | "client" | "activity") {
  await page.evaluate(
    (detail) =>
      window.dispatchEvent(
        new CustomEvent("projection-check-refresh", { detail }),
      ),
    source,
  );
}

const otherClient = {
  ...client,
  id: "10000000-0000-4000-8000-000000000002",
  name: "Synthetic Energy",
  sectorTag: "ENERGY",
  profileStatus: "ONBOARDING",
};

for (const status of [403, 503]) {
  test(`failed client refresh ${status} hides retained totals, choices and cards until recovery`, async ({
    page,
  }, testInfo) => {
    const unexpected = await installFixtures(page);
    let failing = false;
    let recovered = false;
    let gate = Promise.resolve();
    await page.route("**/api/backend/core/clients", async (route) => {
      await gate;
      return json(
        route,
        failing
          ? { message: "Synthetic current catalog unavailable" }
          : recovered
            ? [{ ...client, name: "Test Aerospace refreshed" }]
            : [client, otherClient],
        failing ? status : 200,
      );
    });
    await page.goto("/current-projection.html?mode=index&status=ACTIVE&q=Test");
    const title = page.getByRole("heading", { level: 1, name: /^Portfolio/ });
    const pulse = page.getByRole("region", { name: "Portfolio pulse" });
    const clientCount = pulse
      .getByText("Clients", { exact: true })
      .locator("..")
      .locator("strong");
    await expect(title).toHaveText("Portfolio 2");
    await expect(clientCount).toHaveText("2");
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(
      page.getByLabel("Sector", { exact: true }).locator("option"),
    ).toHaveCount(3);
    failing = true;
    await refresh(page, "clients");
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(title).toHaveText("Portfolio —");
    await expect(clientCount).toHaveText("—");
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(
      page.getByLabel("Sector", { exact: true }).locator("option"),
    ).toHaveCount(1);
    await expect(
      page.getByLabel("Profile status", { exact: true }),
    ).toHaveValue("ACTIVE");
    await expect(
      page.getByLabel("Profile status", { exact: true }),
    ).toContainText("ACTIVE (not available)");
    await expect(page.getByLabel("Search profiles")).toHaveValue("Test");
    await expect(
      page.getByRole("heading", { name: /No profiles/ }),
    ).toHaveCount(0);

    let release!: () => void;
    gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    failing = false;
    recovered = true;
    try {
      await page
        .getByRole("alert")
        .getByRole("button", { name: "Retry" })
        .click();
      await expect(title).toHaveText("Portfolio —");
      await expect(page.getByRole("article")).toHaveCount(0);
    } finally {
      release();
    }
    await expect(title).toHaveText("Portfolio 1");
    await expect(page.getByRole("article")).toContainText(
      "Test Aerospace refreshed",
    );
    await expect(page.getByLabel("Search profiles")).toHaveValue("Test");
    await page.screenshot({
      path: testInfo.outputPath(`catalog-recovered-${status}.png`),
      fullPage: true,
    });
    expect(unexpected).toEqual([]);
  });

  test(`failed activity refresh ${status} hides retained history, kinds, limit and overview count`, async ({
    page,
  }, testInfo) => {
    const unexpected = await installFixtures(page);
    const length = status === 503 ? 500 : 2;
    const rows = Array.from({ length }, (_, index) => ({
      id: `activity-${index}`,
      title: `Saved activity row ${index}`,
      occurredAt: "2026-10-10T12:00:00Z",
      kind: "synthetic_kind",
      body: null,
      origin: "recorded",
      sourceType: null,
      sourceId: null,
      dueAt: null,
      settledAt: null,
      pinned: false,
    }));
    let failing = false;
    let currentRows = rows;
    await page.route(
      `**/api/backend/core/clients/${clientId}/activity*`,
      (route) =>
        json(
          route,
          failing
            ? { message: "Synthetic current activity unavailable" }
            : currentRows,
          failing ? status : 200,
        ),
    );
    await page.goto("/current-projection.html?mode=overview");
    const timeline = page.getByRole("region", {
      name: "Activity timeline",
      exact: true,
    });
    const count = page
      .getByRole("region", { name: "Engagement pulse" })
      .getByText("Recent activity items", { exact: true })
      .locator("../..")
      .locator("strong");
    await expect(
      timeline.getByText("Saved activity row 0", { exact: true }),
    ).toBeVisible();
    await expect(count).toHaveText(String(length));
    await timeline
      .getByRole("searchbox", { name: "Search activity" })
      .fill("Saved");
    if (length === 500)
      await expect(timeline.getByText(/latest 500 items/)).toBeVisible();
    failing = true;
    await refresh(page, "activity");
    await expect(timeline.getByRole("alert")).toBeVisible();
    await expect(
      timeline.getByText("Saved activity row 0", { exact: true }),
    ).toHaveCount(0);
    await expect(count).toHaveText("—");
    await expect(timeline.getByText(/latest 500 items/)).toHaveCount(0);
    await expect(timeline.getByText("No activity to show.")).toHaveCount(0);
    await timeline
      .getByRole("button", { name: "Activity type", exact: true })
      .click();
    await expect(
      page.getByRole("menuitemradio", { name: "synthetic_kind", exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("heading", { name: "Test Aerospace", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "District nexus", exact: true }),
    ).toBeVisible();
    await expect(
      timeline.getByRole("searchbox", { name: "Search activity" }),
    ).toHaveValue("Saved");
    if (status === 403) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ colorScheme: "dark" });
      await timeline.screenshot({
        path: testInfo.outputPath("activity-unavailable-phone-dark.png"),
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    failing = false;
    currentRows = [{ ...rows[0]!, title: "Saved refreshed activity" }];
    await timeline.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(
      timeline.getByText("Saved refreshed activity", { exact: true }),
    ).toBeVisible();
    await expect(count).toHaveText("1");
    await expect(
      timeline.getByRole("searchbox", { name: "Search activity" }),
    ).toHaveValue("Saved");
    expect(unexpected).toEqual([]);
  });
}

test("failed current client read removes its retained name from the frame and recovers", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  let failing = false;
  await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
    json(
      route,
      failing ? { message: "Synthetic current client unavailable" } : client,
      failing ? 403 : 200,
    ),
  );
  await page.goto("/current-projection.html?mode=overview");
  await expect(
    page.getByRole("heading", { name: "Test Aerospace", exact: true }),
  ).toBeVisible();
  failing = true;
  await refresh(page, "client");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("Test Aerospace", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("region", { name: "Activity timeline", exact: true }),
  ).toHaveCount(0);
  failing = false;
  await page
    .getByRole("alert")
    .getByRole("button", { name: "Retry", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Test Aerospace", exact: true }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});
