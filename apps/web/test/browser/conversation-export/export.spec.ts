import { test, expect } from "@playwright/test";
import { messageExport } from "../../../tests/conversation-export-fixture";
const endpoint = "**/api/conversations/export";
test("selected chat downloads a fresh complete text export on each click", async ({
  page,
}) => {
  let reads = 0;
  await page.route(endpoint, (route) => {
    reads++;
    return route.fulfill({ json: messageExport() });
  });
  await page.goto("/conversation-export/index.html");
  for (let n = 0; n < 2; n++) {
    const ready = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export messages", exact: true })
      .click();
    const download = await ready;
    expect(download.suggestedFilename()).toBe("conversation-messages.txt");
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const text = Buffer.concat(chunks).toString("utf8");
    expect(text).toContain("Synthetic answer");
    expect(text).toContain("Resumed answer");
    expect(text.match(/USER\n/g)).toHaveLength(1);
    await expect(
      page.getByRole("status", { name: "Message export" }),
    ).toContainText("Download started");
  }
  expect(reads).toBe(2);
});
test("expired and oversized replies never download, and a fresh retry succeeds", async ({
  page,
}) => {
  let mode = "expired";
  const downloads: string[] = [];
  page.on("download", (d) => downloads.push(d.suggestedFilename()));
  await page.route(endpoint, (route) =>
    mode === "large"
      ? route.fulfill({
          status: 413,
          json: { error: { code: "CONVERSATION_EXPORT_TOO_LARGE" } },
        })
      : route.fulfill({
          json: messageExport(Date.now() - (mode === "expired" ? 120000 : 0)),
        }),
  );
  await page.goto("/conversation-export/index.html");
  await page
    .getByRole("button", { name: "Export messages", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Message export" }),
  ).toContainText("expired");
  expect(downloads).toHaveLength(0);
  mode = "large";
  await page
    .getByRole("button", { name: "Export messages", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Message export" }),
  ).toContainText("No partial file");
  expect(downloads).toHaveLength(0);
  mode = "ok";
  const ready = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export messages", exact: true })
    .click();
  await ready;
  expect(downloads).toHaveLength(1);
});
for (const action of ["Toggle access", "Change account"])
  test(action + " cancels pending private bytes", async ({ page }) => {
    let release: () => void = () => {};
    const pending = new Promise<void>((resolve) => (release = resolve));
    const downloads: string[] = [];
    page.on("download", (d) => downloads.push(d.suggestedFilename()));
    await page.route(endpoint, async (route) => {
      await pending;
      await route.fulfill({ json: messageExport() }).catch(() => {});
    });
    await page.goto("/conversation-export/index.html");
    await page
      .getByRole("button", { name: "Export messages", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Preparing export…", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: action, exact: true }).click();
    release();
    await expect(
      page.getByText("Checking access and preparing messages…"),
    ).toHaveCount(0);
    expect(downloads).toHaveLength(0);
  });
test("Trash disables export and keeps deletion separate from completed cleanup", async ({
  page,
}) => {
  await page.goto("/conversation-export/index.html");
  await page
    .getByRole("button", { name: "Move fixture to Trash", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Export messages", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Delete", exact: true }),
  ).toHaveCount(0);
});
