import { test, expect } from "@playwright/test";
import { expectRenderedContrast } from "../../test/rendered-contrast";

test("rendered contrast admits translucent layers over opaque grayscale gradient extrema", async ({
  page,
}, info) => {
  await page.setContent(
    `<main style="background:linear-gradient(90deg, #000, #202020)"><div style="background:rgba(255,255,255,0.02)"><p id="label" style="color:white;background:rgba(255,255,255,0.04)">Readable composited label</p></div></main>`,
  );
  await expectRenderedContrast(
    page.locator("#label"),
    info,
    "composited-readable",
  );
});

test("rendered contrast rejects low contrast after translucent layer composition", async ({
  page,
}, info) => {
  await page.setContent(
    `<main style="background:white"><div style="background:rgba(0,0,0,0.02)"><p id="label" style="color:white;background:rgba(255,255,255,0.02)">Unreadable composited label</p></div></main>`,
  );
  await expect(
    expectRenderedContrast(
      page.locator("#label"),
      info,
      "composited-unreadable",
    ),
  ).rejects.toThrow(/toBeGreaterThanOrEqual/);
});

test("rendered contrast retains rejection of unsupported gradient compositing", async ({
  page,
}, info) => {
  await page.setContent(
    `<main style="background:linear-gradient(90deg, red, blue)"><p id="label" style="color:white;background:rgba(255,255,255,0.02)">Unsupported gradient</p></main>`,
  );
  await expect(
    expectRenderedContrast(
      page.locator("#label"),
      info,
      "composited-unsupported",
    ),
  ).rejects.toThrow(/Nonopaque or nongrayscale gradient/);
});
