import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { copySnapshot } from "../../../tests/workspace-copy-snapshot-fixture";
import { copyIds } from "../../../tests/workspace-brief-copy-fixtures";

const exact = "**/api/capiro/workspace.draft.savedSnapshot?*";
async function open(page: Page) {
  page.on("pageerror", (error) => {
    throw error;
  });
  const before = copySnapshot();
  before.id = copyIds.other;
  before.label = "Before copying";
  before.snapshot!.documents = [];
  await page.route("**/api/capiro/workspace.draft.versions?*", (route) =>
    route.fulfill({ json: [before, copySnapshot()] }),
  );
  await page.goto("/copy-snapshot/index.html");
  await page
    .getByRole("button", { name: "Workspace draft history", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Inspect Before copying" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Inspect Original copy" }).click();
}
test("inspects and freshly downloads the whole saved version after conversion without using the current draft", async ({
  page,
}) => {
  const calls: string[] = [];
  await page.route(exact, (route) => {
    calls.push(route.request().method());
    return route.fulfill({ json: copySnapshot() });
  });
  await open(page);
  await expect(
    page.getByRole("region", { name: "Selected saved version" }),
  ).toContainText("Original text");
  await expect(page.getByText("Current draft replacement")).toHaveCount(0);
  await expect(
    page.getByText("Historical PDF/DOCX rendering is unavailable.", {
      exact: false,
    }),
  ).toBeVisible();
  const count = calls.length;
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download inspected version JSON" })
    .click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("workspace-saved-version.json");
  expect(JSON.parse(await readFile((await file.path())!, "utf8"))).toEqual(
    copySnapshot(),
  );
  expect(calls.length).toBe(count + 1);
  expect(calls.every((method) => method === "GET")).toBe(true);
});
for (const mode of ["revoked", "changed"] as const) {
  test(`withholds download when the fresh read is ${mode}`, async ({
    page,
  }) => {
    let downloading = false;
    const downloads: string[] = [];
    page.on("download", (download) =>
      downloads.push(download.suggestedFilename()),
    );
    await page.route(exact, (route) => {
      if (downloading && mode === "revoked")
        return route.fulfill({
          status: 403,
          json: { message: "Current saved-version access revoked" },
        });
      const value = copySnapshot();
      if (downloading) value.snapshot!.docTitle = "Unexpected replacement";
      return route.fulfill({ json: value });
    });
    await open(page);
    await expect(
      page.getByRole("button", { name: "Download inspected version JSON" }),
    ).toBeVisible();
    downloading = true;
    await page
      .getByRole("button", { name: "Download inspected version JSON" })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      mode === "revoked" ? "revoked" : "changed",
    );
    expect(downloads).toEqual([]);
  });
}
test("closing history cancels a pending download and requires a new inspection on reopening", async ({
  page,
}) => {
  let downloading = false,
    release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const downloads: string[] = [];
  page.on("download", (download) =>
    downloads.push(download.suggestedFilename()),
  );
  await page.route(exact, async (route) => {
    if (downloading) await held;
    await route.fulfill({ json: copySnapshot() }).catch(() => undefined);
  });
  await open(page);
  await expect(
    page.getByRole("button", { name: "Download inspected version JSON" }),
  ).toBeVisible();
  downloading = true;
  await page
    .getByRole("button", { name: "Download inspected version JSON" })
    .click();
  await expect(
    page.getByRole("button", { name: "Checking saved version…" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  release();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  downloading = false;
  await page
    .getByRole("button", { name: "Workspace draft history", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Selected saved version" }),
  ).toBeVisible();
  expect(downloads).toEqual([]);
});
test("mismatched snapshot identity never becomes an inspected or downloadable version", async ({
  page,
}) => {
  const value = copySnapshot();
  value.tenantId = copyIds.other;
  await page.route(exact, (route) => route.fulfill({ json: value }));
  await open(page);
  await expect(page.getByRole("alert")).toContainText("does not match");
  await expect(
    page.getByRole("button", { name: "Download inspected version JSON" }),
  ).toHaveCount(0);
});
