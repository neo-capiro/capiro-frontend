import { expect, test } from "@playwright/test";
import {
  clientId,
  file,
  installFixtures,
  json,
} from "../../tests/browser/fixtures";

test("Mobile Files preserves readable name width, long-name wrapping and keyboard scrolling", async ({
  page,
}, info) => {
  await installFixtures(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/portfolio/${clientId}/files`);
  const list = page.getByRole("region", { name: "File list" });
  await list.scrollIntoViewIfNeeded();
  const name = page.getByRole("button", {
    name: "pdf Test report.pdf",
    exact: true,
  });
  await expect(name).toBeVisible();
  const geometry = await name.evaluate((button) => {
    const text = Array.from(button.childNodes).find(
      (node) =>
        node.nodeType === Node.TEXT_NODE &&
        node.textContent?.includes("Test report.pdf"),
    )!;
    const range = document.createRange();
    range.selectNode(text);
    return {
      buttonWidth: button.getBoundingClientRect().width,
      cellWidth: button.closest("td")!.getBoundingClientRect().width,
      textLines: range.getClientRects().length,
      textWidth: range.getBoundingClientRect().width,
    };
  });
  expect(geometry.buttonWidth).toBeGreaterThanOrEqual(214);
  expect(geometry.cellWidth).toBeGreaterThan(geometry.buttonWidth);
  expect(geometry.textLines).toBe(1);
  expect(geometry.textWidth).toBeGreaterThan(80);
  await info.attach("filename-geometry", {
    body: JSON.stringify(geometry),
    contentType: "application/json",
  });
  await list.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => list.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  await list.evaluate((element) => {
    element.scrollLeft = 0;
  });
  await page
    .getByRole("checkbox", { name: "Select Test report.pdf", exact: true })
    .check();
  await expect(
    page.getByRole("checkbox", { name: "Select Test report.pdf", exact: true }),
  ).toBeChecked();
  await expect
    .poll(() =>
      page
        .locator("img")
        .evaluateAll((images) =>
          images
            .filter((image) => image.getBoundingClientRect().width > 0)
            .every((image) => image.complete && image.naturalWidth > 0),
        ),
    )
    .toBe(true);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: info.outputPath("files-mobile-readable.png") });
  const longName =
    "Quarterly-program-implementation-and-delivery-evidence-".repeat(3) +
    ".pdf";
  await page.route("**/api/backend/core/engagement/attachments?*", (route) =>
    json(route, [{ ...file, fileName: longName }]),
  );
  await page.reload();
  const longButton = page.getByRole("button", {
    name: `pdf ${longName}`,
    exact: true,
  });
  await expect(longButton).toBeVisible();
  await list.scrollIntoViewIfNeeded();
  const wrapped = await longButton.evaluate((button) => {
    const text = Array.from(button.childNodes).find(
      (node) =>
        node.nodeType === Node.TEXT_NODE &&
        node.textContent?.includes("Quarterly-program"),
    )!;
    const range = document.createRange();
    range.selectNode(text);
    return {
      lines: range.getClientRects().length,
      width: button.getBoundingClientRect().width,
      scrollWidth: button.scrollWidth,
      clientWidth: button.clientWidth,
    };
  });
  expect(wrapped.lines).toBeGreaterThan(1);
  expect(wrapped.width).toBeGreaterThanOrEqual(214);
  expect(wrapped.scrollWidth).toBeLessThanOrEqual(wrapped.clientWidth + 1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await info.attach("long-filename-geometry", {
    body: JSON.stringify(wrapped),
    contentType: "application/json",
  });
  await page.screenshot({
    path: info.outputPath("files-mobile-long-name.png"),
  });
});

test("Desktop Files keeps its existing name sizing", async ({ page }, info) => {
  await installFixtures(page);
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.goto(`/portfolio/${clientId}/files`);
  const name = page.getByRole("button", {
    name: "pdf Test report.pdf",
    exact: true,
  });
  await expect(name).toHaveCSS("min-width", "0px");
  await expect
    .poll(() =>
      page
        .locator("img")
        .evaluateAll((images) =>
          images
            .filter((image) => image.getBoundingClientRect().width > 0)
            .every((image) => image.complete && image.naturalWidth > 0),
        ),
    )
    .toBe(true);
  await page
    .locator("img")
    .evaluateAll(async (images) =>
      Promise.all(
        images
          .filter((image) => image.getBoundingClientRect().width > 0)
          .map((image) => image.decode()),
      ),
    );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: info.outputPath("files-desktop-1440.png") });
});
