import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  clientId,
  prospectId,
  installFixtures,
  json,
} from "../../tests/browser/fixtures";
import { installGovernmentFixtures } from "../../tests/browser/government-fixtures";
import { searchBill } from "../../tests/browser/acceptance-bill-search-fixtures";

const overviewPath = `/portfolio/${clientId}`;
const tileLabels = [
  "Client identity",
  "Government & federal profile",
  "District nexus",
  "Engagement pulse",
  "Deadline stress and requests",
  "Objectives summary",
];

async function overviewLayout(page: Page) {
  const identity = page.getByRole("region", { name: "Client identity" });
  await expect(identity).toBeVisible();
  return identity.locator("..").locator("..");
}

async function sequentialTiles(page: Page, layout: Locator) {
  await page.getByRole("button", { name: "Notes", exact: true }).focus();
  const sequence: { tile: number; name: string }[] = [];
  for (let step = 0; step < 40; step++) {
    const current = await layout.evaluate((root) => ({
      tile: Array.from(root.children).findIndex((tile) =>
        tile.contains(document.activeElement),
      ),
      name:
        document.activeElement?.getAttribute("aria-label") ??
        document.activeElement?.textContent?.trim() ??
        "",
    }));
    if (current.tile < 0) break;
    sequence.push(current);
    await page.keyboard.press("Tab");
  }
  return sequence;
}

for (const width of [1440, 1024, 390]) {
  test(`Overview DOM and sequential focus follow card order at ${width}px`, async ({
    page,
  }, info) => {
    await installFixtures(page);
    await page.setViewportSize({ width, height: 1100 });
    await page.goto(overviewPath);
    const layout = await overviewLayout(page);
    const labels = await layout.evaluate((root) =>
      Array.from(root.children).map((tile) =>
        tile.querySelector("[aria-label]")?.getAttribute("aria-label"),
      ),
    );
    expect(labels).toEqual(tileLabels);
    const trace = await sequentialTiles(page, layout);
    expect([...new Set(trace.map((entry) => entry.tile))]).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
    expect(trace.map((entry) => entry.tile)).toEqual(
      trace.map((entry) => entry.tile).sort((a, b) => a - b),
    );
    await info.attach("sequential-focus", {
      body: JSON.stringify(trace, null, 2),
      contentType: "application/json",
    });
    const boxes = await layout.locator(":scope > div").evaluateAll((tiles) =>
      tiles.map((tile) => {
        const rect = tile.getBoundingClientRect();
        return { x: rect.x, y: rect.y, height: rect.height };
      }),
    );
    if (width === 1440) {
      expect(boxes[1].y).toBe(boxes[0].y);
      expect(boxes[2].y).toBeCloseTo(boxes[1].y + boxes[1].height + 16);
      expect(boxes[3].y).toBeCloseTo(boxes[0].y + boxes[0].height + 16);
      expect(boxes[4].y).toBeCloseTo(boxes[2].y + boxes[2].height + 16);
      expect(boxes[5].y).toBeCloseTo(boxes[3].y + boxes[3].height + 16);
    } else {
      expect(boxes.map((box) => box.y)).toEqual(
        boxes.map((box) => box.y).sort((a, b) => a - b),
      );
    }
    await page.getByRole("main").evaluate((main) => {
      main.scrollTop = 0;
    });
    await page.screenshot({ path: info.outputPath(`overview-${width}.png`) });
  });
}

test("Overview card state and DOM identity survive viewport changes", async ({
  page,
}) => {
  await installFixtures(page);
  await page.goto(overviewPath);
  const opener = page.getByRole("button", {
    name: "Government & federal profile",
    exact: true,
  });
  const element = await opener.elementHandle();
  await opener.click();
  const dialog = page.getByRole("dialog", {
    name: "Government & federal profile",
  });
  await dialog
    .getByRole("button", { name: "Federal activity", exact: true })
    .click();
  for (const width of [1024, 390, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Federal activity", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(await element!.evaluate((node) => node.isConnected)).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
});

test("Selected client icons use their target exports and Prospect details stay selected", async ({
  page,
}, info) => {
  await installFixtures(page);
  for (const [tab, label, icon] of [
    ["objectives", "Objectives", 4],
    ["calendar", "Calendar", 5],
    ["relationships", "Relationships", 1],
    ["work", "Work", 6],
    ["opportunities", "Opportunities", 9],
    ["files", "Files", 8],
  ] as const) {
    await page.goto(`${overviewPath}/${tab}`);
    const active = page
      .getByRole("navigation", { name: "Client", exact: true })
      .getByRole("link", { name: label, exact: true });
    await expect(active).toHaveAttribute("aria-current", "page");
    const img = active.locator("img");
    await expect(img).toHaveAttribute(
      "src",
      `/design/portfolio-34/nav-${icon}-active.svg`,
    );
    expect(await img.boundingBox()).toMatchObject({ width: 16, height: 16 });
    await img.screenshot({ path: info.outputPath(`${tab}-active-icon.png`) });
  }
  await page.goto(`${overviewPath}/bills`);
  const bills = page
    .getByRole("navigation", { name: "Client", exact: true })
    .getByRole("link", { name: "Bill Tracker", exact: true });
  await expect(bills).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(bills.locator("img")).toHaveAttribute(
    "src",
    "/design/portfolio-34/nav-8.svg",
  );
  await page.goto(`/portfolio/prospects/${prospectId}`);
  const prospects = page.getByRole("link", { name: "Portfolio Prospects" });
  await expect(prospects).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(prospects).toHaveCSS("background-color", "rgb(230, 238, 239)");
  await page.screenshot({ path: info.outputPath("prospect-collapsed.png") });
});

test("Overview action glyphs remain visible in dark mode", async ({
  page,
}, info) => {
  await installFixtures(page);
  await page.setViewportSize({ width: 1024, height: 1100 });
  await page.goto(overviewPath);
  await expect(
    page.getByRole("region", { name: "Client identity" }),
  ).toBeVisible();
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    const arrow = page
      .getByRole("button", {
        name: "Government & federal profile",
        exact: true,
      })
      .locator("img")
      .last();
    const plus = page
      .getByRole("button", { name: "Add facility", exact: true })
      .locator("img");
    await expect(arrow).toBeVisible();
    await expect(plus).toBeVisible();
    await arrow.screenshot({
      path: info.outputPath(`government-arrow-${scheme}.png`),
    });
    await plus.screenshot({
      path: info.outputPath(`facility-plus-${scheme}.png`),
    });
    await page.screenshot({ path: info.outputPath(`overview-${scheme}.png`) });
  }
});

test("Files status and page actions match target sizing while mobile rows stay operable", async ({
  page,
}, info) => {
  await installFixtures(page);
  await page.goto(`${overviewPath}/files`);
  const status = page.getByText("Text searchable", { exact: true });
  await expect(status).toHaveCSS("border-radius", "6px");
  await expect(status).toHaveCSS("color", "rgb(61, 107, 79)");
  expect((await status.boundingBox())!.height).toBeLessThan(24);
  const blocked = page.getByText("scan_pending", { exact: true });
  await expect(blocked).not.toHaveCSS("color", "rgb(61, 107, 79)");
  await expect(
    page.getByRole("button", { name: "Upload", exact: true }),
  ).toHaveCSS("font-size", "13px");
  await expect(
    page.getByRole("button", { name: "Upload", exact: true }),
  ).toHaveCSS("min-height", "30px");
  await page.screenshot({ path: info.outputPath("files-1440.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Upload", exact: true }),
  ).toHaveCSS("min-height", "36px");
  const list = page.getByRole("region", { name: "File list" });
  await list.scrollIntoViewIfNeeded();
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
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("files-mobile-rows.png") });
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.goto(`${overviewPath}/capabilities`);
  await expect(
    page.getByRole("button", { name: "Add capability", exact: true }),
  ).toHaveCSS("font-size", "13px");
  await expect(
    page.getByRole("button", { name: "Add capability", exact: true }),
  ).toHaveCSS("min-height", "30px");
  await page.screenshot({ path: info.outputPath("capabilities-1440.png") });
});

test("Government relationships and populated tracker use supported existing states", async ({
  page,
}, info) => {
  await installGovernmentFixtures(page);
  await page.goto(`${overviewPath}/relationships?kind=government`);
  await expect(
    page.getByRole("heading", { name: "Priority targets", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Test Committee Staff", { exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("relationships-government-1440.png"),
  });
  await page.route(
    `**/intelligence/clients/${clientId}/tracker/board?*`,
    (route) =>
      json(route, {
        columns: [
          {
            id: "committee",
            label: "In committee",
            cards: [
              {
                billId: searchBill.billId,
                displayNum: searchBill.displayNum,
                title: searchBill.title,
                stage: searchBill.stage,
                passageProbability: searchBill.probability,
                jurisdiction: searchBill.jurisdiction,
                matchedTags: [],
                changeChip: null,
                terminalRisk: false,
                unread: false,
                hearingCount: 0,
                lastHearingSessionId: null,
              },
            ],
          },
        ],
        total: 1,
        nextCursor: null,
        hasMore: false,
        withheld: 0,
      }),
  );
  await page.goto(`${overviewPath}/bills`);
  await expect(page.getByRole("table")).toContainText(searchBill.title);
  await page.screenshot({ path: info.outputPath("bills-populated-1440.png") });
});
