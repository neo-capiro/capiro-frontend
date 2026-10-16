import { test, expect, type Locator, type Page } from "@playwright/test";
import { clientId, file, installFixtures, json, prospectId } from "./fixtures";

const viewports = [
  { name: "desktop", width: 1440, height: 1040 },
  { name: "phone", width: 390, height: 844 },
] as const;

const surfaces = [
  {
    name: "standard",
    path: `/portfolio/${clientId}/files`,
    trigger: `pdf ${file.fileName}`,
    title: file.fileName,
    width: 640,
    drawer: false,
    compact: false,
  },
  {
    name: "drawer",
    path: `/portfolio/${clientId}/objectives`,
    trigger: "Open objective",
    title: "Edit objective",
    width: 600,
    drawer: true,
    compact: false,
  },
  {
    name: "wide",
    path: "/portfolio/prospects",
    trigger: "Pipeline",
    title: "Prospects pipeline",
    width: 1280,
    drawer: false,
    compact: false,
  },
  {
    name: "compact contact drawer",
    path: `/portfolio/prospects/${prospectId}`,
    trigger: "+ Add",
    title: "Add prospect contact",
    width: 600,
    drawer: true,
    compact: true,
  },
] as const;
type Surface = (typeof surfaces)[number];
type Viewport = (typeof viewports)[number];

async function expectDialogGeometry(
  page: Page,
  dialog: Locator,
  surface: Surface,
  viewport: Viewport,
) {
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("data-slot", "dialog-content");
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog).toHaveCSS("display", surface.compact ? "flex" : "grid");
  await expect(dialog).toHaveCSS("row-gap", surface.compact ? "0px" : "20px");
  await expect(dialog).toHaveCSS(
    "column-gap",
    surface.compact ? "0px" : "20px",
  );
  if (surface.compact) {
    await expect(dialog).toHaveCSS("flex-direction", "column");
  } else {
    // Used grid tracks expose the actual page-grid collision, including CSS order.
    await expect(dialog).toHaveCSS("grid-template-columns", /^\d+(\.\d+)?px$/);
  }
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) throw new Error("The dialog has no rendered bounds.");
  const gutter = surface.drawer ? 0 : 16;
  expect(bounds.width).toBeCloseTo(
    Math.min(surface.width, viewport.width - gutter * 2),
    1,
  );
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
  if (surface.drawer) {
    expect(bounds.x + bounds.width).toBeCloseTo(viewport.width, 1);
    expect(bounds.y).toBeCloseTo(0, 1);
    expect(bounds.height).toBeCloseTo(viewport.height, 1);
  } else {
    expect(bounds.x + bounds.width / 2).toBeCloseTo(viewport.width / 2, 1);
    expect(bounds.y + bounds.height / 2).toBeCloseTo(viewport.height / 2, 1);
  }
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  return bounds;
}

async function expectOverlayAndFocus(page: Page, dialog: Locator) {
  const overlay = page.locator('[data-slot="dialog-overlay"]');
  await expect(overlay).toHaveCount(1);
  await expect(overlay).toBeVisible();
  await expect(overlay).not.toHaveCSS("background-color", "rgb(10, 10, 10)");
  await expect(overlay).toHaveCSS("position", "fixed");
  const coverage = await overlay.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      zIndex: Number(getComputedStyle(element).zIndex),
    };
  });
  expect(coverage.left).toBe(0);
  expect(coverage.top).toBe(0);
  expect(coverage.width).toBe(coverage.viewportWidth);
  expect(coverage.height).toBe(coverage.viewportHeight);
  expect(
    await dialog.evaluate((element) =>
      Number(getComputedStyle(element).zIndex),
    ),
  ).toBeGreaterThan(coverage.zIndex);
  const close = dialog.getByRole("button", { name: "Close", exact: true });
  await expect(close).toHaveCount(1);
  await close.focus();
  await page.keyboard.press("Shift+Tab");
  await expect
    .poll(() =>
      dialog.evaluate((element) => element.contains(document.activeElement)),
    )
    .toBe(true);
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
}

for (const viewport of viewports) {
  for (const surface of surfaces) {
    test(`${surface.name} keeps its canonical layout, overlay and focus on ${viewport.name}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      const unexpected = await installFixtures(page);
      if (surface.compact) {
        await page.route(
          `**/business-development/prospects/${prospectId}/contacts`,
          (route) =>
            route.request().method() === "GET"
              ? json(route, {
                  prospectId,
                  readOnly: false,
                  contacts: [],
                  nextCursor: null,
                })
              : route.fallback(),
        );
      }
      await page.goto(surface.path);
      const scope = surface.compact
        ? page.getByRole("region", { name: "Prospect contacts", exact: true })
        : page;
      const trigger = scope.getByRole("button", {
        name: surface.trigger,
        exact: true,
      });
      const dialog = page.getByRole("dialog", {
        name: surface.title,
        exact: true,
      });
      await trigger.click();
      const bounds = await expectDialogGeometry(
        page,
        dialog,
        surface,
        viewport,
      );
      await expectOverlayAndFocus(page, dialog);
      await page.screenshot({ path: testInfo.outputPath("dialog-layout.png") });

      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
      if (surface.compact) await expect(trigger).toBeFocused();

      await trigger.click();
      await dialog.getByRole("button", { name: "Close", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
      if (surface.compact) await expect(trigger).toBeFocused();

      // Full-width phone drawers leave no exposed overlay to click.
      if (bounds.x > 4) {
        await trigger.click();
        await expect(dialog).toBeVisible();
        await page.mouse.click(4, 4);
        await expect(dialog).toHaveCount(0);
        await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(
          0,
        );
        if (surface.compact) await expect(trigger).toBeFocused();
      }
      expect(unexpected).toEqual([]);
    });
  }
}
