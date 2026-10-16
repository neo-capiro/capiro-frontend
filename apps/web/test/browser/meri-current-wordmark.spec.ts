import { test, expect } from "@playwright/test";
import { filesFixture } from "./meri-files-fixtures";

for (const [name, path] of [
  ["Home", "/meri/fixture/home"],
  ["inner page", "/meri/fixture/evidence-sources"],
  ["document workspace", "/meri/fixture/word-document"],
] as const) {
  test(`synthetic desktop ${name} reuses the exact current Meri mask in its62x20 slot`, async ({
    page,
  }, info) => {
    const fixture = await filesFixture(page);
    await page.setViewportSize({ width: 1440, height: 1040 });
    await page.goto(path);
    const mark = page.getByRole("img", { name: "Meri", exact: true });
    await expect(mark).toBeVisible();
    await expect(mark).toHaveCSS("width", "62px");
    await expect(mark).toHaveCSS("height", "20px");
    await expect(mark).toHaveCSS(
      "mask-image",
      /\/design\/cited-answer\/meri-ink\.png/,
    );
    const dimensions = await page.evaluate(async () => {
      const image = new Image();
      image.src = "/design/cited-answer/meri-ink.png";
      await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    });
    expect(dimensions).toEqual([124, 40]);
    await page.screenshot({
      path: info.outputPath(`${name}-current-mask.png`),
    });
    expect(fixture.requests).toEqual([]);
  });
}
