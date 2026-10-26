import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { ids } from "../../tests/meri-document-public-fixtures";

for (const action of ["Preview", "Download"] as const)
  test(`actual session renewal waits for an active ${action} and preserves its completed card`, async ({
    page,
  }) => {
    await page.clock.install({ time: new Date("2026-10-26T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-26T12:00:10Z"));
    await page.goto(
      `/prepared-files/index.html?mode=automatic-renewal&hold=${action === "Preview" ? "inspect" : "bytes"}`,
    );
    const card = page.getByRole("group", { name: /^File version / });
    await expect(card).toBeVisible();
    await card.evaluate((element) =>
      element.setAttribute("data-renewal-witness", "same-mounted-card"),
    );
    await page.clock.runFor(74_000);
    await card.getByRole("button", { name: action, exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as unknown as {
                preparedFilesFixture: { artifactState(): { held: boolean } };
              }
            ).preparedFilesFixture.artifactState().held,
        ),
      )
      .toBe(true);
    await page.clock.runFor(3_000);
    expect(
      await page.evaluate(() =>
        (
          window as unknown as {
            preparedFilesFixture: {
              artifactState(): { sessionCount: number; aborted: boolean };
            };
          }
        ).preparedFilesFixture.artifactState(),
      ),
    ).toMatchObject({ sessionCount: 1, aborted: false });
    await expect(
      page.getByRole("button", {
        name: action === "Preview" ? "Loading preview…" : "Preparing download…",
        exact: true,
      }),
    ).toBeDisabled();
    const downloadEvent =
      action === "Download" ? page.waitForEvent("download") : null;
    await page.evaluate(() =>
      (
        window as unknown as {
          preparedFilesFixture: { releaseArtifact(): void };
        }
      ).preparedFilesFixture.releaseArtifact(),
    );
    if (downloadEvent) {
      const downloaded = await downloadEvent;
      expect(downloaded.suggestedFilename()).toBe("Synthetic.docx");
      expect(await readFile((await downloaded.path())!, "utf8")).toBe(
        "Synthetic document",
      );
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Downloaded Synthetic.docx" }),
      ).toBeVisible();
    } else
      await expect(
        page.getByRole("group", { name: "Synthetic.docx" }),
      ).toBeVisible();
    const stable = page.locator('[data-renewal-witness="same-mounted-card"]');
    await page.clock.runFor(1_001);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as unknown as {
                preparedFilesFixture: {
                  artifactState(): { sessionCount: number };
                };
              }
            ).preparedFilesFixture.artifactState().sessionCount,
        ),
      )
      .toBe(2);
    await expect(
      page.getByText(/^Reading the actions Meri prepared/),
    ).toBeVisible();
    await expect(stable).toBeVisible();
    await page.evaluate(() =>
      (
        window as unknown as {
          preparedFilesFixture: { settleRenewal(): void };
        }
      ).preparedFilesFixture.settleRenewal(),
    );
    await expect(
      page.getByRole("button", { name: "Refresh", exact: true }),
    ).toBeVisible();
    await expect(stable).toBeVisible();
    await stable.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(stable.getByText("Generation: draft")).toBeVisible();
    const documents = await page.evaluate(() =>
      (
        window as unknown as {
          preparedFilesFixture: {
            requests: Array<{ path: string; credential: boolean }>;
          };
        }
      ).preparedFilesFixture.requests.filter((r) =>
        r.path.startsWith("/api/documents/"),
      ),
    );
    expect(documents.map((r) => r.path)).toEqual(
      action === "Preview"
        ? ["/api/documents/inspect", "/api/documents/inspect"]
        : [
            "/api/documents/inspect",
            "/api/documents/links/issue",
            "/api/documents/links/redeem",
            "/api/documents/inspect",
          ],
    );
    expect(documents.slice(0, -1).every((r) => r.credential)).toBe(true);
    expect(documents.at(-1)?.credential).toBe(false);
  });

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

test("replacement session preserves prepared preview until the current list settles and denial clears it", async ({
  page,
}) => {
  await page.goto("/prepared-files/index.html");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const card = page.getByRole("group", { name: "Synthetic.docx" });
  await expect(card).toBeVisible();
  await card.evaluate((element) =>
    element.setAttribute("data-renewal-witness", "same-mounted-card"),
  );
  await page.evaluate(() =>
    (
      window as unknown as { preparedFilesFixture: { renew(): void } }
    ).preparedFilesFixture.renew(),
  );
  await expect(
    page.getByText(/^Reading the actions Meri prepared/),
  ).toBeVisible();
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute(
    "data-renewal-witness",
    "same-mounted-card",
  );
  await page.evaluate(() =>
    (
      window as unknown as { preparedFilesFixture: { settleRenewal(): void } }
    ).preparedFilesFixture.settleRenewal(),
  );
  await expect(
    page.getByRole("button", { name: "Refresh", exact: true }),
  ).toBeVisible();
  await expect(card).toHaveAttribute(
    "data-renewal-witness",
    "same-mounted-card",
  );
  await card.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(card.getByText("Generation: draft")).toBeVisible();
  expect(
    await page.evaluate(() =>
      (
        window as unknown as {
          preparedFilesFixture: {
            requests: Array<{ path: string; credential: boolean }>;
          };
        }
      ).preparedFilesFixture.requests
        .filter((r) => r.path === "/api/documents/inspect")
        .map((r) => r.credential),
    ),
  ).toEqual([true, false]);
  await page.evaluate(() =>
    (
      window as unknown as { preparedFilesFixture: { renew(): void } }
    ).preparedFilesFixture.renew(),
  );
  await expect(
    page.getByText(/^Reading the actions Meri prepared/),
  ).toBeVisible();
  await expect(card).toBeVisible();
  await page.evaluate(() =>
    (
      window as unknown as {
        preparedFilesFixture: { settleRenewal(denied: boolean): void };
      }
    ).preparedFilesFixture.settleRenewal(true),
  );
  await expect(card).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Download", exact: true }),
  ).toHaveCount(0);
});
