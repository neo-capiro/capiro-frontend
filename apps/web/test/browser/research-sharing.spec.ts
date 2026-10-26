import { expect, test, type Page } from "@playwright/test";
import {
  dashboard,
  design,
  hostileText,
  ids,
  link,
  shareToken,
  timestamp,
} from "./research-sharing-fixture";

async function sharingApi(page: Page) {
  let enabled = false;
  let links: unknown[] = [];
  const writes: { key: string; body: Record<string, unknown> }[] = [];
  await page.route("**/api/capiro/**", async (route) => {
    const request = route.request();
    const key = new URL(request.url()).pathname.split("/").at(-1)!;
    const input =
      request.method() === "GET" ? undefined : request.postDataJSON();
    if (input) writes.push({ key, body: input.body });
    const settings = () => ({
      portfolioId: ids.portfolio,
      enabled,
      pinSet: enabled,
      pinUpdatedAt: enabled ? timestamp : null,
      activeLinkCount: links.length,
      updatedAt: timestamp,
    });
    let result: unknown;
    switch (key) {
      case "research.sharing":
        result = settings();
        break;
      case "research.sharing.enable":
        enabled = true;
        result = settings();
        break;
      case "research.sharing.disable":
        enabled = false;
        links = [];
        result = settings();
        break;
      case "research.sharing.pin":
        result = settings();
        break;
      case "research.designs":
        result = [design];
        break;
      case "research.shareLinks":
        result = links;
        break;
      case "research.snapshots":
        result = [
          {
            ...dashboard.snapshot,
            portfolioId: ids.portfolio,
            contentHash: "synthetic",
          },
        ];
        break;
      case "research.shareLinks.publish":
        links = [link];
        result = { link, token: shareToken, replayed: false };
        break;
      case "research.shareLinks.revoke":
        links = [{ ...link, status: "revoked", revokedAt: timestamp }];
        result = links[0];
        break;
      default:
        throw new Error(`Unexpected operation ${key}`);
    }
    await route.fulfill({ json: result });
  });
  return writes;
}

test("Sharing enables a PIN, publishes the exact selection once, and confirms disable", async ({
  page,
}) => {
  const writes = await sharingApi(page);
  await page.goto("/research-sharing.html");
  await expect(
    page.getByRole("button", { name: "Publish link", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Turn on sharing" }).click();
  await page.getByRole("button", { name: "Publish link", exact: true }).click();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    `/share/research/${shareToken}`,
  );
  expect(
    writes.filter((w) => w.key === "research.shareLinks.publish"),
  ).toHaveLength(1);
  expect(
    writes.find((w) => w.key === "research.shareLinks.publish")?.body,
  ).toMatchObject({
    clientId: ids.client,
    snapshotId: ids.snapshot,
    designId: ids.design,
    branding: true,
  });
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page
    .getByRole("button", { name: "Turn off sharing", exact: true })
    .click();
  expect(writes.some((w) => w.key === "research.sharing.disable")).toBe(false);
  await page.getByRole("button", { name: "Turn off and revoke links" }).click();
  await expect(
    page.getByRole("button", { name: "Turn on sharing" }),
  ).toBeVisible();
  expect(
    writes.filter((w) => w.key === "research.sharing.disable"),
  ).toHaveLength(1);
});

test("viewer has no publish, edit or settings write controls", async ({
  page,
}) => {
  const writes = await sharingApi(page);
  await page.goto("/research-sharing.html?role=viewer");
  await expect(
    page.getByText("Only the portfolio owner", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Turn on sharing" }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "New design" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publish link" })).toHaveCount(
    0,
  );
  expect(writes).toEqual([]);
});

test("designer commits pointer move/resize, undo/redo, keyboard and phone order", async ({
  page,
}) => {
  await page.goto("/research-sharing.html?mode=designer");
  const widget = page.getByRole("group", { name: /^Commentary widget/ });
  const handle = widget.locator("div").first();
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 30, box.y + 146, { steps: 4 });
  await page.mouse.up();
  await expect(widget).toHaveAttribute("aria-label", /row 9,/);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(widget).toHaveAttribute("aria-label", /row 7,/);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(widget).toHaveAttribute("aria-label", /row 9,/);
  const resize = (await widget
    .getByRole("button", { name: "Resize Commentary" })
    .boundingBox())!;
  await page.mouse.move(resize.x + 9, resize.y + 9);
  await page.mouse.down();
  await page.mouse.move(resize.x + 9, resize.y + 77, { steps: 4 });
  await page.mouse.up();
  await expect(widget).toHaveAttribute("aria-label", /4 tall$/);
  await widget.focus();
  await page.keyboard.press("ArrowDown");
  await expect(widget).toHaveAttribute("aria-label", /row 10,/);
  await page.keyboard.press("Shift+ArrowDown");
  await expect(widget).toHaveAttribute("aria-label", /5 tall$/);
  await page
    .getByRole("button", { name: "Move Commentary earlier", exact: true })
    .click();
  await page.getByRole("button", { name: "Save design", exact: true }).click();
  const saved = JSON.parse(await page.getByTestId("saved-layout").innerText());
  expect(
    saved.widgets.find((w: { id: string }) => w.id === "comment"),
  ).toMatchObject({ y: 9, h: 5 });
  expect(saved.phoneOrder).toEqual(["header", "comment", "totals", "mark"]);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByText(hostileText, { exact: true })).toHaveCount(2);
  await page.screenshot({
    path: test.info().outputPath("designer-desktop.png"),
    fullPage: true,
  });
});

test("full financial basis stays distinct and exact numeric strings are rendered", async ({
  page,
}) => {
  const duplicateKeys: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("same key")) duplicateKeys.push(message.text());
  });
  await page.goto("/research-sharing.html?mode=widgets");
  await expect(
    page.getByText("9007199254740993.123456 USD M", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/constant FY2024/)).toHaveCount(1);
  await expect(page.getByText(/price basis current/)).toHaveCount(1);
  expect(duplicateKeys).toEqual([]);
});

test("public PIN opens the snapshot without external images or persistent credentials", async ({
  page,
}) => {
  const requests: string[] = [];
  const external: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://external.invalid"))
      external.push(request.url());
  });
  await page.route("**/api/capiro/**", async (route) => {
    const key = new URL(route.request().url()).pathname.split("/").at(-1)!;
    requests.push(key);
    const result = key.endsWith("availability")
      ? { available: true }
      : key.endsWith("pin")
        ? { viewToken: "synthetic-session", expiresAt: "2026-10-26T12:30:00Z" }
        : dashboard;
    await route.fulfill({ json: result });
  });
  await page.goto("/research-sharing.html?mode=public");
  await page.getByLabel("PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Open dashboard" }).click();
  await expect(
    page.getByRole("heading", { name: "Synthetic research" }),
  ).toBeVisible();
  await expect(page.getByText(hostileText, { exact: true })).toHaveCount(2);
  await expect(page.locator("img")).toHaveCount(0);
  expect(external).toEqual([]);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByText("9007199254740993.123456 USD M", { exact: true }),
  ).toBeVisible();
  const total = page.getByText("9007199254740993.123456 USD M", {
    exact: true,
  });
  expect(
    await total.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const box = element.getBoundingClientRect();
      return [...range.getClientRects()].every(
        (rect) => rect.left >= box.left - 1 && rect.right <= box.right + 1,
      );
    }),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("recipient-phone.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(page.getByLabel("PIN", { exact: true })).toBeVisible();
  expect(requests.filter((key) => key.endsWith("dashboard"))).toHaveLength(1);
});

test("unavailable links disclose no dashboard and late old-token work stays retired", async ({
  page,
}) => {
  let release: (() => void) | undefined;
  let dashboardRequested = false;
  await page.route("**/api/capiro/**", async (route) => {
    const request = route.request();
    const key = new URL(request.url()).pathname.split("/").at(-1)!;
    if (key.endsWith("availability")) {
      const input = JSON.parse(
        new URL(request.url()).searchParams.get("input")!,
      );
      await route.fulfill({
        json: { available: input.params.token === shareToken },
      });
    } else if (key.endsWith("pin"))
      await route.fulfill({
        json: { viewToken: "synthetic-session", expiresAt: timestamp },
      });
    else {
      dashboardRequested = true;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route.fulfill({ json: dashboard }).catch(() => undefined);
    }
  });
  await page.goto("/research-sharing.html?mode=public");
  await page.getByLabel("PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Open dashboard" }).click();
  await expect.poll(() => dashboardRequested).toBe(true);
  await page.getByRole("button", { name: "Switch synthetic token" }).click();
  await expect(
    page.getByRole("heading", { name: "Link not available" }),
  ).toBeVisible();
  release!();
  await expect(
    page.getByRole("heading", { name: "Synthetic research" }),
  ).toHaveCount(0);
});
