import { expect, test, type Page } from "@playwright/test";
import { clientId, installFixtures, json } from "./fixtures";
import { nativeFile } from "./capability-documents-fixtures";
import { expectAccessibleHome } from "../../test/accessibility";

const documents = [
  {
    ...nativeFile,
    fileName: "Alpha report.txt",
    folder: "Reports",
    source: "manual",
  },
  {
    ...nativeFile,
    id: "60000000-0000-4000-8000-000000000002",
    fileName: "Beta report.txt",
    folder: "Reports",
    source: "manual",
  },
  {
    ...nativeFile,
    id: "60000000-0000-4000-8000-000000000003",
    fileName: "Gamma memo.txt",
    folder: null,
    source: "workspace",
  },
];
async function fixtures(page: Page) {
  const unexpected = await installFixtures(page);
  const writes: string[] = [];
  let reads = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/backend/") && request.method() !== "GET")
      writes.push(`${request.method()} ${request.url()}`);
  });
  await page.route("**/core/engagement/attachments?**", (route) => {
    reads++;
    return json(route, documents);
  });
  await page.goto(`/portfolio/${clientId}/files`);
  await expect(
    page.getByRole("checkbox", { name: /^Select (Alpha|Beta|Gamma)/ }),
  ).toHaveCount(3);
  return { writes, unexpected, reads: () => reads };
}
const allFiles = (page: Page) =>
  page
    .getByRole("group", { name: "File view", exact: true })
    .getByRole("button", { name: "All files", exact: true });
const visibleSelection = (page: Page) =>
  page.getByRole("checkbox", { name: "Select visible files", exact: true });

for (const folder of ["Reports 2", "Unfiled 1"]) {
  test(`All files leaves ${folder} and restores the complete current list`, async ({
    page,
  }) => {
    const { writes, unexpected, reads } = await fixtures(page);
    await page.getByRole("button", { name: folder, exact: true }).click();
    await expect(
      page.getByRole("checkbox", { name: /^Select (Alpha|Beta|Gamma)/ }),
    ).toHaveCount(folder.startsWith("Reports") ? 2 : 1);
    await allFiles(page).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("checkbox", { name: /^Select (Alpha|Beta|Gamma)/ }),
    ).toHaveCount(3);
    await expect(
      page.getByRole("region", { name: "All client files", exact: true }),
    ).toBeVisible();
    expect(reads()).toBe(1);
    expect(writes).toEqual([]);
    expect(unexpected).toEqual([]);
  });
}

test("All files retains search, source and sort while leaving a folder", async ({
  page,
}) => {
  const { writes, unexpected, reads } = await fixtures(page);
  await page.getByRole("button", { name: "Reports 2", exact: true }).click();
  await page.getByLabel("Search files", { exact: true }).fill("Gamma");
  const source = page
    .getByRole("group", { name: "File source", exact: true })
    .getByRole("button", { name: "workspace", exact: true });
  await source.click();
  await page.getByLabel("Sort files", { exact: true }).selectOption("name");
  await expect(page.getByText("No files match this view.")).toBeVisible();
  await allFiles(page).click();
  await expect(page.getByLabel("Search files", { exact: true })).toHaveValue(
    "Gamma",
  );
  await expect(source).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Sort files", { exact: true })).toHaveValue(
    "name",
  );
  await expect(
    page.getByRole("checkbox", { name: /^Select (Alpha|Beta|Gamma)/ }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("checkbox", { name: "Select Gamma memo.txt", exact: true }),
  ).toBeVisible();
  expect(reads()).toBe(1);
  expect(writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("partial visible selection is mixed and select-all changes only the visible subset", async ({
  page,
}, info) => {
  const { writes, unexpected, reads } = await fixtures(page);
  await page
    .getByRole("checkbox", { name: "Select Alpha report.txt", exact: true })
    .check();
  await expect(visibleSelection(page)).toHaveJSProperty("indeterminate", true);
  await visibleSelection(page).focus();
  await page.keyboard.press("Space");
  for (const file of documents)
    await expect(
      page.getByRole("checkbox", {
        name: `Select ${file.fileName}`,
        exact: true,
      }),
    ).toBeChecked();
  await page.getByLabel("Search files", { exact: true }).fill("Gamma");
  await expect(visibleSelection(page)).toBeChecked();
  await visibleSelection(page).uncheck();
  await expect(
    page.getByText("1 files · 2 selected · 2 outside this view", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(visibleSelection(page)).not.toBeChecked();
  await expect(visibleSelection(page)).toHaveJSProperty("indeterminate", false);
  await page.screenshot({
    path: info.outputPath("hidden-selection-desktop.png"),
    fullPage: true,
  });
  await expectAccessibleHome(page, info);
  await page.getByLabel("Search files", { exact: true }).fill("");
  await expect(
    page.getByRole("checkbox", {
      name: "Select Alpha report.txt",
      exact: true,
    }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Select Beta report.txt", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Select Gamma memo.txt", exact: true }),
  ).not.toBeChecked();
  await expect(visibleSelection(page)).toHaveJSProperty("indeterminate", true);
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  await expect(visibleSelection(page)).not.toBeChecked();
  await expect(visibleSelection(page)).toHaveJSProperty("indeterminate", false);
  for (const file of documents)
    await expect(
      page.getByRole("checkbox", {
        name: `Select ${file.fileName}`,
        exact: true,
      }),
    ).not.toBeChecked();
  expect(reads()).toBe(1);
  expect(writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("empty filtered results disclose and clear hidden selection without changing filters or writing", async ({
  page,
}, info) => {
  const { writes, unexpected, reads } = await fixtures(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page
    .getByRole("checkbox", { name: "Select Alpha report.txt", exact: true })
    .check();
  await page.getByLabel("Search files", { exact: true }).fill("No match");
  await expect(visibleSelection(page)).toBeDisabled();
  await expect(
    page.getByText("0 files · 1 selected · 1 outside this view", {
      exact: true,
    }),
  ).toBeVisible();
  const clear = page.getByRole("button", {
    name: "Clear selection",
    exact: true,
  });
  await clear.focus();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("hidden-selection-mobile-dark.png"),
    fullPage: true,
  });
  await expectAccessibleHome(page, info);
  const list = page.getByRole("region", { name: "File list", exact: true });
  await list.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => list.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  await clear.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Search files", { exact: true })).toHaveValue(
    "No match",
  );
  await expect(
    page.getByRole("button", { name: "Move to folder", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "New folder", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("0 files · 0 selected", { exact: true }),
  ).toBeVisible();
  expect(reads()).toBe(1);
  expect(writes).toEqual([]);
  expect(unexpected).toEqual([]);
});
