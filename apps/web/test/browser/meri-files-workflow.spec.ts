import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { expectAccessibleHome } from "../accessibility";
import {
  filesFixture,
  filesUrl,
  connectFiles,
  createDocument,
  fillDocument,
  versionPanel,
  expectFilesIsolation,
  ids,
  documentBytes,
  urls,
} from "./meri-files-fixtures";

for (const format of ["docx", "xlsx"] as const) {
  for (const width of [1440, 390]) {
    test(`Files ${format} ${width}px creates revises inspects and verifies synthetic bytes with native limits visible`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1040 });
      const fixture = await filesFixture(page, format);
      await page.goto(filesUrl(undefined, format));
      await expect(
        page.getByRole("button", { name: "Connect document service" }),
      ).toBeEnabled();
      expect(fixture.requests).toEqual([]);
      expect(fixture.host.calls("session")).toHaveLength(0);
      await connectFiles(page, format);
      await fillDocument(page, format);
      expect(fixture.requests).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`${format}-${width}-editor.png`),
        fullPage: true,
      });
      await createDocument(page, format);
      expect(fixture.calls("create")).toHaveLength(1);
      expect(fixture.calls("create")[0]!.body).toMatchObject({
        request: {
          operation: format === "docx" ? "create_word" : "create_excel",
          format,
          title: "Synthetic",
        },
      });
      const panel = versionPanel(page);
      await expect(panel.getByText("Draft", { exact: true })).toBeVisible();
      await expect(panel.getByText("Pending", { exact: true })).toBeVisible();
      await expect(panel).toContainText(
        "Native opening and rendering have not been verified",
      );
      if (format === "xlsx")
        await expect(panel).toContainText(
          "Formula caches are unverified and require recalculation in Excel",
        );
      await page
        .getByRole("button", { name: "Inspect selected version", exact: true })
        .click();
      await expect(panel).toContainText(
        "Service verified bytes for this version",
      );
      await page.screenshot({
        path: testInfo.outputPath(`${format}-${width}-native-pending.png`),
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Verify download", exact: true })
        .click();
      const link = page.getByRole("link", {
        name: `Download Synthetic.${format}`,
        exact: true,
      });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", /^blob:/);
      const downloadEvent = page.waitForEvent("download");
      await link.click();
      const download = await downloadEvent;
      expect(download.suggestedFilename()).toBe(`Synthetic.${format}`);
      const file = testInfo.outputPath(`synthetic-receiver-bytes.${format}`);
      await download.saveAs(file);
      expect(new Uint8Array(await readFile(file))).toEqual(documentBytes);
      await page
        .getByRole("button", { name: "Revise selected version", exact: true })
        .click();
      const submit = page.getByRole("button", {
        name:
          format === "docx"
            ? "Create revised version"
            : "Create revised workbook",
        exact: true,
      });
      await expect(submit).toBeDisabled();
      if (format === "docx")
        await page
          .getByRole("textbox", {
            name: "Complete replacement text",
            exact: true,
          })
          .fill("Complete synthetic replacement");
      else
        await page
          .getByRole("textbox", { name: "Complete sheets (JSON)", exact: true })
          .fill('[{"name":"Data","rows":[[{"value":"Replacement"}]]}]');
      await page
        .getByRole("checkbox", { name: /This is the complete replacement/ })
        .check();
      await page.screenshot({
        path: testInfo.outputPath(`${format}-${width}-revision.png`),
        fullPage: true,
      });
      await submit.click();
      await expect(
        page.getByLabel("Versions returned in this view (up to 10)"),
      ).toHaveValue(ids.revision);
      expect(fixture.calls("revise")).toHaveLength(1);
      expect(fixture.calls("revise")[0]!.body).toMatchObject({
        baseVersionId: ids.version,
        request: { format, title: "Synthetic" },
      });
      await expect(panel).toContainText(ids.version);
      await expect(link).toHaveCount(0);
      expect((await urls(page)).revoked).toHaveLength(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await expectAccessibleHome(page, testInfo);
      expectFilesIsolation(fixture);
    });
  }
}

for (const width of [1440, 390]) {
  test(`Files disabled ${width}px makes no session/document calls and retains truthful unavailable rendering`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    const fixture = await filesFixture(page);
    await page.goto(`${filesUrl()}&documents-disabled=1`);
    await expect(
      page.getByRole("region", {
        name: "Document service unavailable",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Connect document service" }),
    ).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath(`files-unavailable-${width}.png`),
      fullPage: true,
    });
    await expectAccessibleHome(page, testInfo);
    expect(fixture.requests).toEqual([]);
    expect(fixture.host.calls("session")).toEqual([]);
    expectFilesIsolation(fixture);
  });
}

test("Files repeated create intent is refused locally without a second delivery", async ({
  page,
}) => {
  const fixture = await filesFixture(page);
  await page.goto(filesUrl());
  await connectFiles(page);
  await createDocument(page);
  await page
    .getByRole("button", { name: "Create document", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("not dispatched");
  expect(fixture.calls("create")).toHaveLength(1);
  expect(fixture.writes()).toHaveLength(1);
  expectFilesIsolation(fixture);
});

test("Files incorrect download hash hides known version actions and releases no object URL", async ({
  page,
}) => {
  const fixture = await filesFixture(page);
  await page.goto(filesUrl());
  await connectFiles(page);
  await createDocument(page);
  fixture.reply("download", {
    status: 200,
    body: Buffer.from("Xynthetic document"),
    headers: {
      "content-type": fixture.first.version.mimeType,
      "content-disposition": 'attachment; filename="Synthetic.docx"',
      "content-length": String(documentBytes.length),
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
  await page
    .getByRole("button", { name: "Verify download", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("could not be read");
  await expect(
    page.getByRole("link", { name: "Download Synthetic.docx" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Verify download" }),
  ).toHaveCount(0);
  expect((await urls(page)).created).toEqual([]);
  expect(fixture.calls("download")).toHaveLength(1);
  expectFilesIsolation(fixture);
});

test("Files requires a selected client without bootstrapping from browser hints", async ({
  page,
}) => {
  const fixture = await filesFixture(page);
  await page.goto("/meri/files");
  await expect(
    page.getByRole("heading", { name: "Choose a client", exact: true }),
  ).toBeVisible();
  expect(fixture.host.calls("session")).toEqual([]);
  expect(fixture.requests).toEqual([]);
  expectFilesIsolation(fixture);
});
