import { expect, test } from "@playwright/test";
import { openFixtureScreen } from "./meri-fixture-screen-helpers";

test("06.01 approvals keeps the Figma desktop column starts", async ({
  page,
}, info) => {
  const finish = await openFixtureScreen(
    page,
    info,
    "approval-center",
    "light",
  );
  await page.evaluate(() => document.fonts.ready);
  const columns = await page
    .getByRole("table", { name: "Pending approvals" })
    .getByRole("columnheader")
    .evaluateAll((headers) =>
      headers.map((header) => header.getBoundingClientRect().left),
    );
  expect(columns).toHaveLength(4);
  // 06.01 uses 420, 140, 340, 252 px columns inside its 1152 px table.
  for (const [index, offset] of [0, 420, 560, 900].entries())
    expect(Math.abs(columns[index]! - columns[0]! - offset)).toBeLessThan(2.5);
  await page.screenshot({ path: info.outputPath("06-01-approvals.png") });
  await finish();
});

test("12.01 workflow library has the compact Figma desktop rhythm", async ({
  page,
}, info) => {
  const finish = await openFixtureScreen(
    page,
    info,
    "workflow-library",
    "light",
  );
  await page.evaluate(() => document.fonts.ready);
  const heading = page.getByRole("heading", {
    level: 1,
    name: "Start with a workflow",
  });
  await expect(heading).toHaveCSS("font-size", "20px");
  await expect(heading).toHaveCSS("line-height", "26px");
  const tiles = page
    .getByRole("list", { name: "Workflow catalog" })
    .locator("li");
  const first = await tiles.nth(0).boundingBox();
  const secondRow = await tiles.nth(2).boundingBox();
  expect(first).toBeTruthy();
  expect(secondRow).toBeTruthy();
  expect(first!.x).toBe(260);
  expect(first!.y).toBeGreaterThanOrEqual(274);
  expect(first!.y).toBeLessThanOrEqual(280);
  expect(secondRow!.y - (first!.y + first!.height)).toBeCloseTo(12, 0);
  await page.screenshot({ path: info.outputPath("12-01-workflows.png") });
  await finish();
});

test("13.21–22 conversation filters open at the Figma desktop anchors", async ({
  page,
}, info) => {
  const finish = await openFixtureScreen(
    page,
    info,
    "conversation-history",
    "light",
  );
  // Verified 2026-10-22 Figma readback and exports: docs/meri-menu-alignment-20261022.
  // Manual overlays are right-aligned, 6px below the bottom-aligned trigger row.
  for (const [name, x, width, height] of [
    ["Filter by client: All clients", 664, 120, 292],
    ["Filter by status: All statuses", 812, 136, 340],
  ] as const) {
    // Radix marks the rest of the page aria-hidden while its modal menu is open.
    const trigger = page.locator(`button[aria-label="${name}"]`);
    const inputBox = await page
      .getByRole("textbox", { name: "Search", exact: true })
      .boundingBox();
    const triggerBox = await trigger.boundingBox();
    expect(inputBox).toBeTruthy();
    expect(triggerBox).toBeTruthy();
    expect(Math.abs(triggerBox!.width - width)).toBeLessThanOrEqual(1);
    expect(Math.abs(triggerBox!.height - 36)).toBeLessThanOrEqual(1);
    expect(
      Math.abs(
        triggerBox!.y + triggerBox!.height - inputBox!.y - inputBox!.height,
      ),
    ).toBeLessThanOrEqual(1);
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(trigger).toHaveCSS("color", "rgb(255, 255, 255)");
    const menu = page.getByRole("menu");
    const box = await menu.boundingBox();
    expect(box).toBeTruthy();
    expect(Math.abs(box!.x - x)).toBeLessThanOrEqual(3);
    expect(Math.abs(box!.y - 247)).toBeLessThanOrEqual(3);
    expect(Math.abs(box!.width - 480)).toBeLessThanOrEqual(1);
    expect(Math.abs(box!.height - height)).toBeLessThanOrEqual(1);
    expect(
      Math.abs(box!.x + box!.width - triggerBox!.x - triggerBox!.width),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(box!.y - triggerBox!.y - triggerBox!.height - 6),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: info.outputPath(
        name.startsWith("Filter by client")
          ? "13-21-client.png"
          : "13-22-status.png",
      ),
    });
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
  }
  await finish();
});

test("04.04 filing review keeps bound context white and source scope explicit", async ({
  page,
}, info) => {
  const finish = await openFixtureScreen(page, info, "file-to-client", "light");
  for (const name of [
    "Artifact version",
    "Client",
    "Destination folder",
    "Who can access it",
  ]) {
    const field = page.getByRole("textbox", { name });
    await expect(field).toHaveAttribute("readonly", "");
    await expect(field).toHaveCSS("background-color", "rgb(255, 255, 255)");
  }
  const filename = page.getByRole("textbox", { name: "File name" });
  await expect(filename).not.toHaveAttribute("readonly");
  await filename.fill("Anduril meeting brief.docx");
  await expect(filename).toHaveValue("Anduril meeting brief.docx");
  await expect(
    page.getByRole("button", { name: "Review source scopes" }),
  ).toBeDisabled();
  await page.screenshot({ path: info.outputPath("04-04-filing-review.png") });
  await finish();
});
