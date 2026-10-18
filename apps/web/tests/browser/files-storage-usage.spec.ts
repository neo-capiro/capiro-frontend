import { test, expect } from "@playwright/test";
import { clientId, file, installFixtures, json } from "./fixtures";

const allowanceBytes = 10 * 1024 ** 3;
const usage = (usedBytes: number) => ({
  clientId,
  source: "engagement_attachments",
  usageBasis: "registered_attachments",
  allowanceScope: "client",
  asOf: "2026-10-18T12:00:00.000Z",
  allowanceBytes,
  enforcement: "report_only",
  status: "available",
  usedBytes,
  remainingBytes: Math.max(0, allowanceBytes - usedBytes),
  overAllowance: usedBytes > allowanceBytes,
});

test("registered usage is independent of visible file sizes and never blocks uploads", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await page.route(`**/clients/${clientId}/files/storage-usage`, (route) =>
    json(route, usage(Math.round(7.4 * 1024 ** 2))),
  );
  await page.route("**/engagement/attachments?**", (route) =>
    json(route, [{ ...file, byteSize: null }]),
  );
  await page.goto(`/portfolio/${clientId}/files`);
  const storage = page.getByRole("region", { name: "Client storage usage" });
  await expect(storage).toContainText("7.4 MB of 10 GB");
  await expect(storage.getByRole("progressbar")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Upload", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: "../../evidence/playwright/files-usage/available-1440x1040.png",
  });
  expect(unexpected).toEqual([]);
});

test("confirmed upload refreshes usage without treating a missing usage route as upload failure", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  let usageReads = 0;
  let uploaded = false;
  const next = {
    ...file,
    id: "60000000-0000-4000-8000-000000000003",
    fileName: "New note.txt",
    contentType: "text/plain",
    byteSize: 12,
    uploadedByUserId: "user-test",
    s3Key: "synthetic-key",
  };
  await page.route(`**/clients/${clientId}/files/storage-usage`, (route) => {
    usageReads++;
    return uploaded
      ? json(route, { message: "Storage route pending receiving" }, 404)
      : json(route, usage(Math.round(7.4 * 1024 ** 2)));
  });
  await page.route("**/engagement/attachments?**", (route) =>
    json(route, uploaded ? [file, next] : [file]),
  );
  await page.route("**/engagement/attachments/upload-url", (route) =>
    json(route, {
      url: "https://storage.example.test/upload",
      fields: { key: "synthetic-key" },
      s3Key: "synthetic-key",
    }),
  );
  await page.route("https://storage.example.test/upload", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route("**/engagement/attachments/confirm", (route) => {
    uploaded = true;
    return json(route, next);
  });
  await page.goto(`/portfolio/${clientId}/files`);
  const storage = page.getByRole("region", { name: "Client storage usage" });
  await expect(storage).toContainText("7.4 MB of 10 GB");
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Upload files" });
  await dialog.getByLabel("Select files").setInputFiles({
    name: "New note.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Synthetic note"),
  });
  await dialog.getByRole("button", { name: "Upload file" }).click();
  await expect(dialog).toContainText("Uploaded · awaiting service processing");
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(storage).toContainText("Storage usage unavailable");
  expect(usageReads).toBeGreaterThanOrEqual(2);
  expect(unexpected).toEqual([]);
});

test("over-allowance remains report-only and can render while the file list loads", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/clients/${clientId}/files/storage-usage`, (route) =>
    json(route, usage(Math.round(10.4 * 1024 ** 3))),
  );
  await page.route("**/engagement/attachments?**", async (route) => {
    await held;
    await json(route, [file]);
  });
  await page.goto(`/portfolio/${clientId}/files`);
  const storage = page.getByRole("region", { name: "Client storage usage" });
  await expect(storage).toContainText("10.4 GB of 10 GB");
  await expect(storage).toContainText("Over the 10 GB allowance");
  await expect(page.getByText("Loading…", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "../../evidence/playwright/files-usage/over-allowance-1440x1040.png",
  });
  release();
  await expect(
    page.getByRole("button", { name: "Upload", exact: true }),
  ).toBeEnabled();
  expect(unexpected).toEqual([]);
});

test("unknown metadata and denied usage never display a fabricated zero", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  let denied = false;
  await page.route(`**/clients/${clientId}/files/storage-usage`, (route) =>
    denied
      ? json(route, { message: "Not authorized" }, 403)
      : json(route, {
          ...usage(0),
          status: "unavailable",
          reason: "incomplete_size_metadata",
          usedBytes: null,
          remainingBytes: null,
          overAllowance: null,
        }),
  );
  await page.goto(`/portfolio/${clientId}/files`);
  const storage = page.getByRole("region", { name: "Client storage usage" });
  await expect(storage).toContainText("Storage usage unavailable");
  await expect(storage).toContainText("unknown sizes");
  await expect(storage.getByRole("progressbar")).toHaveCount(0);
  await page.screenshot({
    path: "../../evidence/playwright/files-usage/unavailable-1440x1040.png",
  });
  denied = true;
  await page.reload();
  await expect(storage).toContainText("Storage usage unavailable");
  await expect(
    storage.getByRole("button", { name: "Retry usage" }),
  ).toHaveCount(0);
  await expect(storage.getByRole("progressbar")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Upload", exact: true }),
  ).toBeEnabled();
  expect(unexpected).toEqual([]);
});
