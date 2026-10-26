import { test, expect } from "@playwright/test";
import {
  providerFixture,
  selectProviderBlock,
  photo,
  asset,
  assetDetails,
  secondId,
  expectNoProviderSideEffects,
} from "./newsletter-providers-fixture";
import { button, heldResponse } from "./newsletter-document-fixtures";
import { auditDialog } from "./newsletter-provider-a11y";

async function searchStock(page: import("@playwright/test").Page) {
  await button(page, "Stock images").click();
  await page.getByLabel("Search stock images", { exact: true }).fill("Capitol");
  await button(page, "Search").click();
  await button(page, "Select photo").click();
  await button(page, "View details").click();
}
test("stock search is explicit; import then bound-current Insert preserves alt and Undo", async ({
  page,
}, info) => {
  const fixture = await providerFixture(page);
  await selectProviderBlock(page);
  await button(page, "Stock images").click();
  await expect(
    page.getByLabel("Search stock images", { exact: true }),
  ).toBeVisible();
  expect(fixture.calls("stock.search")).toEqual([]);
  await page.getByLabel("Search stock images", { exact: true }).fill("Capitol");
  expect(fixture.calls("stock.search")).toEqual([]);
  await button(page, "Search").click();
  await expect(page.getByText(photo.title, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: photo.photographer }),
  ).toHaveAttribute("href", photo.photographerUrl);
  await button(page, "Next page").click();
  await expect(
    page.getByText("Synthetic next photo", { exact: true }),
  ).toBeVisible();
  expect(fixture.calls("stock.search").at(-1)?.input).toEqual({
    query: { search: "Capitol", page: 2 },
  });
  await button(page, "Select photo").click();
  await button(page, "View details").click();
  await expect(page.getByLabel("Dimensions")).toHaveText("1600 × 1200 pixels");
  await page.evaluate(() => document.fonts.ready);
  await auditDialog(page, info, "stock-details-desktop");
  await page.screenshot({ path: info.outputPath("stock-details-desktop.png") });
  fixture.queue("stock.import", (route) =>
    route.fulfill({
      json: { ...asset(secondId), altText: "Suggested photo description" },
    }),
  );
  await button(page, "Import image").click();
  await expect(
    page.getByRole("heading", { name: "Review imported image", exact: true }),
  ).toBeVisible();
  expect(fixture.calls("stock.import")).toHaveLength(1);
  expect(fixture.calls("stock.import")[0]?.input).toEqual({
    params: { id: "123" },
    body: {},
  });
  expect(fixture.assets.calls("detail").at(-1)?.input).toEqual({
    params: { id: secondId },
  });
  await expect(button(page, "Insert")).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await auditDialog(page, info, "stock-import-narrow");
  await page.screenshot({ path: info.outputPath("stock-import-narrow.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await button(page, "Insert").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Image URL", { exact: true })).toHaveValue(
    asset(secondId).url,
  );
  await expect(page.getByLabel("Alternative text")).toHaveValue(
    "Preserved manual alt",
  );
  await button(page, "Undo").click();
  await expect(page.getByLabel("Image URL", { exact: true })).toHaveValue(
    asset().url,
  );
  await expectNoProviderSideEffects(fixture);
});

test("wrong-page stock data and unavailable credentials do not expose import", async ({
  page,
}) => {
  const fixture = await providerFixture(page);
  fixture.queue("stock.search", (route) =>
    route.fulfill({
      json: {
        provider: "pexels",
        items: [photo],
        page: 2,
        pageSize: 10,
        total: 20,
      },
    }),
  );
  await selectProviderBlock(page);
  await button(page, "Stock images").click();
  await button(page, "Search").click();
  await expect(
    page.getByText(/Stock results could not be verified/),
  ).toBeVisible();
  await expect(button(page, "Select photo")).toHaveCount(0);
  await button(page, "Close").click();
  fixture.queue("stock.status", (route) =>
    route.fulfill({
      json: {
        provider: "pexels",
        available: false,
        reason: "Synthetic Pexels connection unavailable",
      },
    }),
  );
  await button(page, "Stock images").click();
  await expect(
    page.getByText("Synthetic Pexels connection unavailable"),
  ).toBeVisible();
  await expect(button(page, "Search")).toHaveCount(0);
  expect(fixture.calls("stock.search")).toHaveLength(1);
  expect(fixture.calls("stock.import")).toEqual([]);
});

test("unknown stock import survives close and refresh without a replay", async ({
  page,
}, info) => {
  const fixture = await providerFixture(page),
    held = heldResponse();
  fixture.queue("stock.import", async (route) => {
    await held.wait;
    await route.fulfill({ json: { id: asset().id } });
    held.finished();
  });
  await selectProviderBlock(page);
  await searchStock(page);
  await button(page, "Import image").click();
  await expect(page.getByText(/Importing your selected photo/)).toBeVisible();
  await button(page, "Close").click();
  held.release();
  await held.settled;
  await button(page, "Stock images").click();
  await expect(
    page.getByText(/The import could not be confirmed/),
  ).toBeVisible();
  expect(fixture.calls("stock.search")).toHaveLength(1);
  await button(page, "Search").click();
  await expect(button(page, "Select photo")).toBeDisabled();
  expect(fixture.calls("stock.import")).toHaveLength(1);
  await page.screenshot({
    path: info.outputPath("stock-import-unconfirmed.png"),
  });
  await button(page, "Close").click();
  await expect(page.getByLabel("Image URL", { exact: true })).toHaveValue(
    asset().url,
  );
  await expectNoProviderSideEffects(fixture);
});

test("imported historical or wrong-ID details never enable Insert", async ({
  page,
}) => {
  const fixture = await providerFixture(page);
  fixture.assets.queue("detail", (route) =>
    route.fulfill({ json: assetDetails(secondId) }),
  );
  await selectProviderBlock(page);
  await searchStock(page);
  await button(page, "Import image").click();
  await expect(
    page.getByText(/imported image details could not be verified/),
  ).toBeVisible();
  await expect(button(page, "Insert")).toBeDisabled();
  fixture.assets.queue("detail", (route) =>
    route.fulfill({ json: { ...assetDetails(), currentRevision: false } }),
  );
  await button(page, "Refresh image details").click();
  await expect(page.getByText(/image is no longer current/)).toBeVisible();
  await expect(button(page, "Insert")).toBeDisabled();
  expect(fixture.calls("stock.import")).toHaveLength(1);
  await expectNoProviderSideEffects(fixture);
});
