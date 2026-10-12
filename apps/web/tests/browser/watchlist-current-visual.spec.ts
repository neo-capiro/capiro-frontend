import { test, expect } from "@playwright/test";
import { json } from "./fixtures";
import {
  installCurrentWatchlist,
  openCurrentWatchlist,
  refreshWatchlist,
  heldWatchlistWrite,
  intelTargeting,
  settleWatchlist,
} from "./watchlist-current-fixtures";

for (const viewport of [
  { name: "desktop", width: 1440, height: 1040 },
  { name: "phone", width: 390, height: 844 },
]) {
  test(`${viewport.name} Configure keeps existing targeting fields and keyboard access within the viewport`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const fixture = await installCurrentWatchlist(page);
    const dialog = await openCurrentWatchlist(page);
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    for (const label of ["Topic name", "Term value"])
      await expect(
        dialog.getByRole("textbox", { name: label, exact: true }),
      ).toBeEnabled();
    for (const label of ["Issue area", "Position", "Priority", "Term type"])
      await expect(
        dialog.getByRole("combobox", { name: label, exact: true }),
      ).toBeEnabled();
    const geometry = await dialog.evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      left: element.getBoundingClientRect().left,
      overflow: element.scrollWidth > element.clientWidth,
    }));
    expect(geometry.width).toBeLessThanOrEqual(viewport.width - 32);
    expect(geometry.left).toBeGreaterThanOrEqual(16);
    expect(geometry.overflow).toBe(false);
    const topic = dialog.getByRole("group", { name: "Topic 1", exact: true });
    const topicGeometry = await topic.evaluate((element) => {
      const style = getComputedStyle(element);
      const card = element.getBoundingClientRect();
      const legend = element.querySelector("legend")!.getBoundingClientRect();
      return {
        radius: style.borderRadius,
        padding: style.padding,
        gap: style.gap,
        legendTop: legend.top - card.top,
        legendLeft: legend.left - card.left,
        overflow: element.scrollWidth > element.clientWidth,
      };
    });
    await testInfo.attach("topic-card-geometry", {
      body: JSON.stringify(topicGeometry, null, 2),
      contentType: "application/json",
    });
    await dialog.screenshot({
      path: testInfo.outputPath(`configure-${viewport.name}-top.png`),
    });
    expect.soft(topicGeometry).toMatchObject({
      radius: "14px",
      padding: "24px",
      gap: "16px",
      overflow: false,
    });
    expect.soft(topicGeometry.legendTop).toBeGreaterThanOrEqual(24);
    expect.soft(topicGeometry.legendTop).toBeLessThanOrEqual(25);
    expect.soft(topicGeometry.legendLeft).toBeGreaterThanOrEqual(24);
    expect.soft(topicGeometry.legendLeft).toBeLessThanOrEqual(25);
    const save = dialog.getByRole("button", {
      name: "Save targeting",
      exact: true,
    });
    await save.scrollIntoViewIfNeeded();
    await save.focus();
    await expect(save).toBeFocused();
    await dialog.screenshot({
      path: testInfo.outputPath(`configure-${viewport.name}-footer.png`),
    });
    expect(errors).toEqual([]);
    expect(fixture.writes).toEqual([]);
    expect(fixture.unexpected).toEqual([]);
  });

  test(`${viewport.name} current-data notice follows the Figma spacing and conceals retained fields`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const fixture = await installCurrentWatchlist(page);
    const dialog = await openCurrentWatchlist(page);
    await page.route("**/tracker/issue-areas", (route) =>
      json(route, { message: "Current taxonomy denied" }, 403),
    );
    await refreshWatchlist(page, "taxonomy");
    const notice = dialog.getByRole("status", {
      name: "Current data unavailable",
    });
    await expect(notice).toBeVisible();
    await expect(dialog.getByLabel("Topic name", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      dialog.getByRole("button", { name: "My alert preferences" }),
    ).toBeDisabled();
    const box = await notice.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        padding: style.padding,
        gap: style.gap,
        radius: style.borderRadius,
        font: style.fontFamily,
        overflow: element.scrollWidth > element.clientWidth,
      };
    });
    expect(box).toMatchObject({
      padding: "24px",
      gap: "16px",
      radius: "14px",
      overflow: false,
    });
    expect(box.font).toContain("Geist");
    const retry = notice.getByRole("button", { name: "Retry", exact: true });
    expect(
      await retry.evaluate((element) => element.getBoundingClientRect().height),
    ).toBe(36);
    await notice.screenshot({
      path: testInfo.outputPath(
        `configure-${viewport.name}-unavailable-card.png`,
      ),
    });
    await dialog.screenshot({
      path: testInfo.outputPath(
        `configure-${viewport.name}-unavailable-dialog.png`,
      ),
    });
    expect(fixture.writes).toEqual([]);
    expect(fixture.unexpected).toEqual([]);
  });

  test(`${viewport.name} unconfirmed-save notice promises only read-only reload and fits its container`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const fixture = await installCurrentWatchlist(page);
    const dialog = await openCurrentWatchlist(page);
    const held = await heldWatchlistWrite(page, "intelligence", intelTargeting);
    await dialog
      .getByRole("button", { name: "Save targeting", exact: true })
      .click();
    await held.started;
    held.release();
    await held.finished;
    await settleWatchlist(page);
    const notice = dialog.getByRole("alert", { name: "Save unconfirmed" });
    await expect(notice).toContainText("this session will not resend it");
    await expect(notice).toContainText("Reloading only reads saved values");
    await expect(
      dialog.getByRole("button", { name: "Save targeting", exact: true }),
    ).toBeDisabled();
    await expect(dialog.getByLabel("Topic name", { exact: true })).toHaveValue(
      "Current targeting",
    );
    expect(
      await notice.evaluate(
        (element) => element.scrollWidth > element.clientWidth,
      ),
    ).toBe(false);
    await notice.scrollIntoViewIfNeeded();
    await notice.screenshot({
      path: testInfo.outputPath(
        `configure-${viewport.name}-unconfirmed-card.png`,
      ),
    });
    await dialog.screenshot({
      path: testInfo.outputPath(
        `configure-${viewport.name}-unconfirmed-dialog.png`,
      ),
    });
    expect(held.bodies).toHaveLength(1);
    expect(fixture.unexpected).toEqual([]);
  });
}
