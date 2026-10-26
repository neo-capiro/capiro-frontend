import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { ids } from "../../tests/meri-document-public-fixtures";

test("retained DOCX draft is visible, inspectable, downloadable and restored after reload without a publication event", async ({
  page,
}, info) => {
  await page.goto("/prepared-files/index.html");
  await expect(
    page.getByText("A schedule proposal was prepared.", { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByText("This receipt does not confirm a file", { exact: false }),
  ).toBeVisible();
  let card = page.getByRole("group", { name: /^File version / });
  await expect(
    card.getByText("Prepared draft · Not filed or shared"),
  ).toBeVisible();
  await card.getByRole("button", { name: "Preview", exact: true }).click();
  card = page.getByRole("group", { name: "Synthetic.docx" });
  await expect(card.getByText("Generation: draft")).toBeVisible();
  await expect(card.getByText("Preview: pending")).toBeVisible();
  await page.screenshot({
    path: info.outputPath("prepared-docx-desktop.png"),
    fullPage: true,
  });
  const pending = page.waitForEvent("download");
  await card.getByRole("button", { name: "Download", exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("Synthetic.docx");
  expect(await readFile((await download.path())!, "utf8")).toBe(
    "Synthetic document",
  );
  const requests = await page.evaluate(
    () =>
      (
        window as unknown as {
          preparedFilesFixture: {
            requests: Array<{
              path: string;
              body: unknown;
              credential: boolean;
            }>;
          };
        }
      ).preparedFilesFixture.requests,
  );
  const documents = requests.filter((r) =>
    r.path.startsWith("/api/documents/"),
  );
  expect(documents.map((r) => r.path)).toEqual([
    "/api/documents/inspect",
    "/api/documents/inspect",
    "/api/documents/links/issue",
    "/api/documents/links/redeem",
  ]);
  expect(
    documents
      .slice(0, 3)
      .every(
        (r) =>
          JSON.stringify(r.body) === JSON.stringify({ versionId: ids.version }),
      ),
  ).toBe(true);
  expect(documents.every((r) => r.credential)).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("group", { name: /^File version / }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve…", exact: true }),
  ).toHaveCount(0);
});

for (const mode of ["withheld", "unavailable"])
  test(`${mode} intent content provides no draft file controls`, async ({
    page,
  }) => {
    await page.goto(`/prepared-files/index.html?mode=${mode}`);
    await expect(
      page.getByText(
        mode === "withheld"
          ? "You no longer have access to the client this draft belongs to."
          : "Prepared actions could not be read right now.",
        { exact: false },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download", exact: true }),
    ).toHaveCount(0);
  });

for (const mode of ["denied", "wrong-version"])
  test(`${mode} inspection cannot expose invented details or download bytes`, async ({
    page,
  }) => {
    await page.goto(`/prepared-files/index.html?mode=${mode}`);
    const card = page.getByRole("group", { name: /^File version / });
    await card.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(card.getByRole("status")).toContainText("Preview unavailable");
    await expect(page.getByText("Synthetic.docx")).toHaveCount(0);
    await card.getByRole("button", { name: "Download", exact: true }).click();
    await expect(card.getByRole("status")).toContainText(
      "Download unavailable",
    );
    expect(
      await page.evaluate(() =>
        (
          window as unknown as {
            preparedFilesFixture: { requests: Array<{ path: string }> };
          }
        ).preparedFilesFixture.requests.some((r) => r.path.includes("links/")),
      ),
    ).toBe(false);
  });

test("refresh removes a no-longer-visible draft and its loaded metadata", async ({
  page,
}) => {
  await page.goto("/prepared-files/index.html");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByText("Synthetic.docx")).toBeVisible();
  await page.evaluate(() =>
    (
      window as unknown as { preparedFilesFixture: { revoke: () => void } }
    ).preparedFilesFixture.revoke(),
  );
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByText("Synthetic.docx")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Download", exact: true }),
  ).toHaveCount(0);
});

for (const mode of ["duplicate", "disabled"])
  test(`${mode} keeps one existing published file without requiring a draft claim`, async ({
    page,
  }) => {
    await page.goto(`/prepared-files/index.html?mode=${mode}`);
    await expect(
      page.getByRole("button", { name: "Download", exact: true }),
    ).toHaveCount(1);
    await expect(
      page.getByText("Prepared draft · Not filed or shared"),
    ).toHaveCount(0);
  });

test("narrow draft card keeps labelled controls in the viewport", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/prepared-files/index.html");
  const button = page.getByRole("button", { name: "Download", exact: true });
  await expect(button).toBeVisible();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByText("Synthetic.docx")).toBeVisible();
  const box = await button.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: info.outputPath("prepared-docx-narrow.png"),
    fullPage: true,
  });
});
