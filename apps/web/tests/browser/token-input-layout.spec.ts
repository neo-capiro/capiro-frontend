import { expect, test } from "@playwright/test";
import { installFixtures } from "./fixtures";
import {
  expectNoCapabilityOverflow,
  installCapabilityPresentation,
  openPresentedCapability,
} from "./capability-presentation-fixtures";

test("existing intake keeps stacked token geometry and Enter, comma, blur and removal behavior", async ({
  page,
}, info) => {
  const unexpected = await installFixtures(page);
  await page.goto("/portfolio");
  await page
    .getByRole("button", { name: "Add profile", exact: true })
    .first()
    .click();
  const chooser = page.getByRole("dialog", {
    name: "Add profile",
    exact: true,
  });
  await chooser.getByRole("button", { name: /Manual entry/ }).click();
  const intake = page.getByRole("dialog", { name: "Add profile", exact: true });
  await intake
    .getByLabel("Legal name *", { exact: true })
    .fill("Synthetic token layout");
  await intake
    .getByLabel("Website *", { exact: true })
    .fill("tokens.example.test");
  await intake
    .getByLabel("Company description *", { exact: true })
    .fill("Synthetic shared primitive check");
  await intake
    .getByRole("button", { name: "3. Sector & Tracks", exact: true })
    .click();
  const input = intake.getByLabel("Funding priorities", { exact: true });
  await input.fill("  Research  ");
  await input.press("Enter");
  await input.fill("Research, Development");
  await input.press(",");
  await input.fill("Procurement");
  await intake
    .getByLabel("LDA issue codes (bill/policy matching)", { exact: true })
    .click();
  await expect(
    intake.getByRole("button", {
      name: "Remove Research from Funding priorities",
      exact: true,
    }),
  ).toHaveCount(1);
  const remove = intake.getByRole("button", {
    name: "Remove Development from Funding priorities",
    exact: true,
  });
  await expect(remove).toBeVisible();
  const inputBox = await input.boundingBox();
  const chipBox = await remove.boundingBox();
  expect(chipBox!.y).toBeGreaterThan(inputBox!.y + inputBox!.height);
  expect(await input.evaluate((node) => node.parentElement?.tagName)).toBe(
    "LABEL",
  );
  expect(await remove.evaluate((node) => node.closest("label") === null)).toBe(
    true,
  );
  await remove.focus();
  await remove.press("Enter");
  await expect(remove).toHaveCount(0);
  await expect(
    intake.getByRole("button", {
      name: "Remove Procurement from Funding priorities",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("canonical-stacked-tokens.png"),
    fullPage: true,
  });
  expect(unexpected).toEqual([]);
});

test("inline capability tokens wrap long values on a phone without overlapping or nesting delete controls in labels", async ({
  page,
}, info) => {
  const unexpected = await installCapabilityPresentation(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const editor = await openPresentedCapability(page);
  const input = editor.getByLabel("Tags", { exact: true });
  const long = "SyntheticCapabilityTagWithNoSpaces".repeat(5);
  await input.fill(long);
  await input.press("Enter");
  const remove = editor.getByRole("button", {
    name: `Remove ${long} from Tags`,
    exact: true,
  });
  await expect(remove).toBeVisible();
  const field = input.locator("..");
  expect(
    await field.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  ).toBe(true);
  await expectNoCapabilityOverflow(page, editor);
  expect(
    await input.evaluate((node) =>
      node instanceof HTMLInputElement ? node.labels?.length : 0,
    ),
  ).toBe(1);
  expect(await remove.evaluate((node) => node.closest("label") === null)).toBe(
    true,
  );
  await input.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath("canonical-inline-tokens-phone.png"),
    fullPage: true,
  });
  await remove.focus();
  await remove.press("Space");
  await expect(remove).toHaveCount(0);
  expect(unexpected).toEqual([]);
});
