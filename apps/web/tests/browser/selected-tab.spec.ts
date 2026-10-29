import { createHash, randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import type { UploadReceipt } from "../../src/shared/meri-uploads/facade";
import { tabIdentity } from "./selected-tab-native-fixture";

async function setup(
  page: Page,
  options: {
    lostAck?: boolean;
    wrongAccount?: boolean;
    configured?: boolean;
  } = {},
) {
  const writes: Buffer[] = [];
  let receipt: UploadReceipt | undefined;
  await page.addInitScript((configured) => {
    Object.assign(window, {
      process: {
        env: {
          NEXT_PUBLIC_MERI_SELECTED_TAB_EXTENSION_ID: configured
            ? "a".repeat(32)
            : "",
        },
      },
    });
  }, options.configured !== false);
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/capiro/me.read") {
        await route.fulfill({
          json: {
            ...tabIdentity,
            user: {
              ...tabIdentity.user,
              id: options.wrongAccount ? randomUUID() : tabIdentity.user.id,
            },
          },
        });
        return;
      }
      if (path === "/api/uploads/initiate") {
        const q = route.request().postDataJSON();
        receipt = {
          uploadId: randomUUID(),
          requestId: q.requestId,
          original: {
            filename: q.filename,
            mimeType: q.mimeType,
            bytes: q.bytes,
            sha256: q.sha256,
            versionId: null,
          },
          storageStatus: "awaiting_upload",
          scanStatus: "pending",
          scanReason: null,
          extraction: { status: "pending", limitations: [] },
          originalBytesAvailable: false,
        };
        await route.fulfill({ json: receipt });
        return;
      }
      if (path.startsWith("/api/uploads/original/")) {
        const original = route.request().postDataBuffer()!;
        expect(createHash("sha256").update(original).digest("hex")).toBe(
          receipt!.original.sha256,
        );
        expect(original.length).toBe(receipt!.original.bytes);
        writes.push(original);
        receipt = {
          ...receipt!,
          original: { ...receipt!.original, versionId: randomUUID() },
          storageStatus: "stored",
        };
        if (options.lostAck) await route.abort("failed");
        else await route.fulfill({ json: receipt });
        return;
      }
      if (path === "/api/uploads/status") {
        await route.fulfill({ json: receipt });
        return;
      }
      await route.abort();
      throw Error(`Unexpected synthetic route: ${path}`);
    },
  );
  await page.goto("/selected-tab.html");
  return writes;
}
async function connect(page: Page) {
  const summary = page.getByText("Share a browser tab", { exact: true });
  await summary.focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", { name: "Connect extension", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Connection: connected" }),
  ).toBeVisible();
  await page.evaluate(() => window.__tabFixture.approve());
  await expect(
    page.getByRole("button", { name: "Pause sharing" }),
  ).toBeVisible();
}
test("keyboard connection, exact attachment and native session loss", async ({
  page,
}) => {
  const writes = await setup(page);
  await connect(page);
  await expect(
    page.getByText(
      "fixture@example.invalid · Fixture firm · Current chat · General",
      { exact: true },
    ),
  ).toBeVisible();
  expect(await page.evaluate(() => window.__tabFixture.connection())).toEqual({
    id: "a".repeat(32),
    name: "meri.selected-tab/1",
  });
  await page.evaluate(() => window.__tabFixture.share());
  await expect(page.getByText("shared-tab.txt", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "SCAN_PENDING" }),
  ).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0]!.toString("utf8")).toBe(
    "Selected tab: Synthetic selected source\nSource: https://example.invalid/source\n\nVisible source text — café\n",
  );
  expect(
    JSON.stringify(await page.evaluate(() => window.__tabFixture.sent)),
  ).not.toContain("action_session_");
  await page.screenshot({ path: "test-results/selected-tab-connected.png" });
  await page.getByRole("button", { name: "End native session" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Connection: revoked" }),
  ).toBeVisible();
});
test("lost acknowledgement is checked through existing attachment controls without another write", async ({
  page,
}) => {
  const writes = await setup(page, { lostAck: true });
  await connect(page);
  await page.evaluate(() => window.__tabFixture.share());
  await page
    .getByRole("button", { name: "Check the status of shared-tab.txt" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "SCAN_PENDING" }),
  ).toBeVisible();
  expect(writes).toHaveLength(1);
  await page.getByRole("button", { name: "Pause sharing" }).click();
  await expect(
    page.getByText("Connection: paused", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(
    page.getByText("Connection: revoked", { exact: true }),
  ).toBeVisible();
});
test("connection controls fit a narrow browser window", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await connect(page);
  const bounds = await page
    .getByRole("button", { name: "Disconnect", exact: true })
    .locator("../..")
    .boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/selected-tab-narrow.png" });
});
test("a mismatched current identity cannot connect", async ({ page }) => {
  await setup(page, { wrongAccount: true });
  await page.getByText("Share a browser tab", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Connect extension" }),
  ).toBeDisabled();
  expect(await page.evaluate(() => window.__tabFixture.sent)).toEqual([]);
});
test("unconfigured deployment does not advertise the extension", async ({
  page,
}) => {
  await setup(page, { configured: false });
  await expect(
    page.getByRole("textbox", { name: "Meri message" }),
  ).toBeVisible();
  await expect(
    page.getByText("Share a browser tab", { exact: true }),
  ).toHaveCount(0);
});
