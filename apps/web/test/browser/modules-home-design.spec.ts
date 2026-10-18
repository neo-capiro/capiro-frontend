import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { operationFixtures, testIdentity } from "./fixtures";
import { expectAccessibleHome } from "../accessibility";
import {
  observeHomeIsolation,
  tabTo,
  expectFocusEvidence,
} from "../accessibility-interaction";

test.beforeEach(async ({ page }, info) => {
  const isolation = await observeHomeIsolation(page, info);
  await operationFixtures(page, {
    "me.read": testIdentity,
    "clients.list": [],
  });
  page.on("close", isolation);
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.goto("/modules");
  await expect(
    page.getByLabel("Client profile scope", { exact: true }),
  ).toBeEnabled();
});

test("Figma Modules landscape keeps the authored wide card", async ({
  page,
}, info) => {
  const intelligence = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Intelligence", exact: true }),
  });
  const geometry = await intelligence.boundingBox();
  await info.attach("baseline-landscape-width", {
    body: JSON.stringify(geometry),
    contentType: "application/json",
  });
  expect(geometry!.width).toBeCloseTo(646, 0);
});

test("Figma 3.4 desktop hub keeps its hierarchy and Outreach-only entry", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", {
      name: "Everything in Capiro, across the whole firm",
      exact: true,
      level: 1,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Modules · the whole firm" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Client profile · just that client" }),
  ).toBeVisible();
  const engagement = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Engagement", exact: true }),
  });
  await expect(
    engagement.getByRole("link", { name: "Outreach" }),
  ).toBeVisible();
  await expect(engagement.getByRole("link", { name: "Reports" })).toHaveCount(
    0,
  );
  await expect(engagement.getByRole("link", { name: "Meetings" })).toHaveCount(
    0,
  );
  await mkdir("test-results/figma34-desktop", { recursive: true });
  await page.screenshot({ path: "test-results/figma34-desktop/modules.png" });
});

test("Figma Modules card SVGs preserve native rendered geometry", async ({
  page,
}, info) => {
  for (const name of [
    "Planner",
    "Strategies",
    "Intelligence",
    "Research Portfolios",
  ]) {
    const icon = page
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name, exact: true }) })
      .getByRole("link", { name, exact: true })
      .locator("img");
    const rect = await icon.boundingBox();
    await info.attach(`asset-${name}`, {
      body: JSON.stringify(rect),
      contentType: "application/json",
    });
    expect.soft(rect!.width).toBeCloseTo(24, 0);
    expect.soft(rect!.height).toBeCloseTo(24, 0);
  }
});

for (const [width, colorScheme] of [
  [1440, "light"],
  [390, "light"],
  [1440, "dark"],
  [390, "dark"],
  [320, "light"],
] as const) {
  test(`Figma Modules information is available by keyboard at ${width}px ${colorScheme} without changing the heading`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1040 : 844 });
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    const heading = page.getByRole("heading", {
      name:
        width === 1440
          ? "Everything in Capiro, across the whole firm"
          : "Everything in Capiro",
      exact: true,
      level: 1,
    });
    await expect(heading).toBeVisible();
    const help = page.getByRole("button", {
      name: "About Modules",
      exact: true,
    });
    await expect(help).toBeVisible();
    const target = await help.boundingBox();
    expect(target!.width).toBeGreaterThanOrEqual(24);
    expect(target!.height).toBeGreaterThanOrEqual(24);
    await tabTo(page, help);
    await expectFocusEvidence(help, info);
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toContainText("Every client and every activity");
    await expect(tooltip).toHaveCount(1);
    await expect(help).toHaveAccessibleDescription(
      "Every client and every activity available to your account. Choose a client profile to show just that client’s work.",
    );
    await expect(help).toHaveAttribute(
      "aria-describedby",
      (await tooltip.getAttribute("id"))!,
    );
    await expect(page.getByRole("main").getByRole("tooltip")).toHaveCount(1);
    const visibleContent = page.locator('[data-slot="tooltip-content"]');
    const bounds = await visibleContent.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: info.outputPath("information-focus.png") });
    const surface = await visibleContent.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        color: style.color,
        zIndex: style.zIndex,
        padding: style.paddingTop,
        radius: style.borderRadius,
      };
    });
    await info.attach("information-surface", {
      body: JSON.stringify(surface),
      contentType: "application/json",
    });
    expect.soft(surface.background).toBe("rgb(10, 10, 10)");
    expect.soft(surface.color).toBe("rgb(245, 245, 244)");
    expect.soft(Number(surface.zIndex)).toBeGreaterThanOrEqual(110);
    expect.soft(parseFloat(surface.padding)).toBeGreaterThanOrEqual(6);
    expect.soft(parseFloat(surface.radius)).toBeGreaterThanOrEqual(6);
    await expectAccessibleHome(page, info);
    await page.keyboard.press("Escape");
    await expect(tooltip).toBeHidden();
    await expect(help).toBeFocused();
    await expect(heading).toBeVisible();
  });
}
