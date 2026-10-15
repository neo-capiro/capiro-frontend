import { test, expect, type Locator, type Page } from "@playwright/test";
import { tabTo, expectFocusEvidence } from "../accessibility-interaction";
import {
  colorSchemes,
  openFixtureScreen,
  press,
} from "./meri-fixture-screen-helpers";

// Figma 3.4 03.01 (light) and 10.30 (dark) workspace files: the adopted FileTree
// follows the WAI-ARIA tree pattern with one roving tab stop.
const slugs = { light: "workspace-files", dark: "dark-workspace-files" };

async function expectSingleTabStop(tree: Locator, item: Locator) {
  await expect(tree.locator('[role="treeitem"][tabindex="0"]')).toHaveCount(1);
  await expect(item).toHaveAttribute("tabindex", "0");
  // Inner mouse controls never add a second tab stop.
  await expect(
    tree.locator(
      'button:not([tabindex="-1"]), [tabindex="0"]:not([role="treeitem"])',
    ),
  ).toHaveCount(0);
}

async function move(page: Page, tree: Locator, key: string, target: Locator) {
  await press(page, key);
  await expect(target).toBeFocused();
  await expectSingleTabStop(tree, target);
}

for (const colorScheme of colorSchemes) {
  test(`Meri workspace FileTree implements the keyboard tree pattern in ${colorScheme} at 1440px`, async ({
    page,
  }, info) => {
    const finish = await openFixtureScreen(
      page,
      info,
      slugs[colorScheme],
      colorScheme,
    );
    const tree = page.getByRole("tree", { name: "Workspace files" });
    const item = (name: string) =>
      tree.getByRole("treeitem", { name, exact: true });
    // A folder is named by its disclosure control and label, both visible.
    const folder = (label: string) =>
      tree.getByRole("treeitem", {
        name: new RegExp(`^(Collapse|Expand) ${label} ${label}$`),
      });
    const inputs = folder("Inputs · 2");
    const working = folder("Working · 2");
    const published = folder("Published · 3");
    const notes = item("meeting-notes.pdf");
    const funding = item("funding-update.pdf");
    const brief = item("meeting-brief-v2.docx");
    const analysis = item("funding-analysis.xlsx");
    const update = item("client-update.pptx");

    for (const folder of [inputs, working, published])
      await expect(folder).toHaveAttribute("aria-expanded", "true");
    await expect(tree.getByRole("treeitem")).toHaveCount(10);
    await expect(tree.getByRole("treeitem", { selected: true })).toHaveCount(1);
    await expect(brief).toHaveAttribute("aria-selected", "true");
    await expect(notes).toHaveAttribute("aria-selected", "false");
    await expect(inputs).toHaveAttribute("aria-selected", "false");
    await expect(update).not.toHaveAttribute("aria-expanded");
    await expectSingleTabStop(tree, brief);

    // Entering the tree lands on the selected item with visible focus.
    await tabTo(page, brief);
    await expectFocusEvidence(brief, info);
    await move(page, tree, "ArrowDown", analysis);
    await expectFocusEvidence(analysis, info);
    await move(page, tree, "ArrowUp", brief);
    await move(page, tree, "ArrowUp", published);
    await move(page, tree, "End", update);
    await move(page, tree, "ArrowDown", update);
    await move(page, tree, "Home", inputs);
    await move(page, tree, "ArrowUp", inputs);
    await expectFocusEvidence(inputs, info);

    // Right on an open folder moves to its first child; Left returns to the parent.
    await move(page, tree, "ArrowRight", notes);
    await move(page, tree, "ArrowRight", notes);
    await move(page, tree, "ArrowLeft", inputs);

    // Left collapses an open folder; hidden children leave the navigation order.
    await press(page, "ArrowLeft");
    await expect(inputs).toHaveAttribute("aria-expanded", "false");
    await expect(inputs).toBeFocused();
    await expect(notes).toHaveCount(0);
    await move(page, tree, "ArrowLeft", inputs);
    await move(page, tree, "ArrowDown", working);
    await move(page, tree, "ArrowUp", inputs);

    // Right expands a closed folder and keeps focus on it.
    await press(page, "ArrowRight");
    await expect(inputs).toHaveAttribute("aria-expanded", "true");
    await expect(inputs).toBeFocused();
    await move(page, tree, "ArrowRight", notes);

    // Enter and Space select files and open the selected file's card.
    await press(page, "Enter");
    await expect(notes).toHaveAttribute("aria-selected", "true");
    await expect(brief).toHaveAttribute("aria-selected", "false");
    await expect(
      page.getByRole("group", { name: "meeting-notes.pdf", exact: true }),
    ).toBeVisible();
    await move(page, tree, "ArrowDown", funding);
    const scroll = await page.evaluate(() => scrollY);
    await press(page, " ");
    await expect(funding).toHaveAttribute("aria-selected", "true");
    await expect(tree.getByRole("treeitem", { selected: true })).toHaveCount(1);
    expect(await page.evaluate(() => scrollY)).toBe(scroll);
    await expect(
      page.getByRole("group", { name: "funding-update.pdf", exact: true }),
    ).toBeVisible();

    // Enter and Space toggle a folder without changing the file selection.
    await move(page, tree, "ArrowDown", working);
    await press(page, "Enter");
    await expect(working).toHaveAttribute("aria-expanded", "false");
    await expect(item("source-index.json")).toHaveCount(0);
    await press(page, " ");
    await expect(working).toHaveAttribute("aria-expanded", "true");
    await expect(item("source-index.json")).toBeVisible();
    await expect(funding).toHaveAttribute("aria-selected", "true");
    await expect(working).toBeFocused();

    // Leaving and re-entering the tree returns to the selected item.
    await press(page, "Tab");
    await expect(
      page.getByRole("link", { name: "Attach an existing file", exact: true }),
    ).toBeFocused();
    await press(page, "Shift+Tab");
    await expect(funding).toBeFocused();
    await expectSingleTabStop(tree, funding);
    await expectFocusEvidence(funding, info);

    // Pointer selection moves the tab stop; collapsing its folder by pointer
    // hands the single tab stop to that folder.
    await analysis.click();
    await expect(analysis).toHaveAttribute("aria-selected", "true");
    await expectSingleTabStop(tree, analysis);
    await published
      .getByRole("button", { name: "Collapse Published · 3", exact: true })
      .click();
    await expect(published).toHaveAttribute("aria-expanded", "false");
    await expectSingleTabStop(tree, published);
    await published
      .getByRole("button", { name: "Expand Published · 3", exact: true })
      .click();
    await expect(published).toHaveAttribute("aria-expanded", "true");

    await info.attach(`file-tree-${colorScheme}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
    await finish();
  });
}
