import { expect, test, type Page } from "@playwright/test";
import { settingsFixture } from "./a2-settings-fixtures";

const failures = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  failures.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(({ page }) => expect(failures.get(page)).toEqual([]));

const key =
  "tenants/synthetic-tenant/branding/logo-1792713600000-00000081-1111-4111-8111-111111111111.png";
const file = {
  name: "synthetic-logo.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfWQAAAAASUVORK5CYII=",
    "base64",
  ),
};
const logoUrl = `data:image/png;base64,${file.buffer.toString("base64")}`;
async function brandingFixture(page: Page) {
  const f = await settingsFixture(page);
  const uploads: { authorization?: string; cookie?: string; method: string }[] =
    [];
  await page.route(
    "https://synthetic-assets.s3.amazonaws.com/**",
    async (route) => {
      const headers = route.request().headers();
      uploads.push({
        authorization: headers.authorization,
        cookie: headers.cookie,
        method: route.request().method(),
      });
      await route.fulfill({
        status: 204,
        headers: { "access-control-allow-origin": "http://127.0.0.1:5191" },
      });
    },
  );
  f.handlers.set("settings.branding.logoUploadUrl", async (route) => {
    await route.fulfill({
      json: {
        url: "https://synthetic-assets.s3.amazonaws.com/",
        s3Key: key,
        fields: { key, "Content-Type": "image/png" },
      },
    });
  });
  const confirmed = {
    ...f.data.branding,
    logoS3Key: key,
    logoContentType: "image/png",
    logoUploadedAt: "2026-10-23T00:00:00.000Z",
    logoUrl,
  };
  return {
    ...f,
    uploads,
    confirmed,
    confirmations: () =>
      f
        .writes()
        .filter((entry) => entry.operation === "settings.branding.logoConfirm"),
  };
}

test("Branding holds upload and name controls, then requires exact delivered logo receipt plus delayed read after reload", async ({
  page,
}) => {
  const f = await brandingFixture(page);
  let release!: () => void;
  const response = new Promise<void>((resolve) => {
    release = resolve;
  });
  f.handlers.set("settings.branding.logoConfirm", async (route) => {
    await response;
    await route.fulfill({ json: f.confirmed });
  });
  await f.open("branding");
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect.poll(() => f.confirmations().length).toBe(1);
  await expect(page.getByRole("button", { name: "Uploading…" })).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: "Company name", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Save", exact: true }),
  ).toBeDisabled();
  release();
  await expect(
    page.getByText("Check the last change", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Upload logo" }),
  ).toBeDisabled();
  const stored = await page.evaluate(() =>
    JSON.stringify({ ...sessionStorage }),
  );
  expect(stored).not.toContain(key);
  expect(stored).not.toContain("synthetic-assets");
  f.data.branding = f.confirmed;
  await page.getByRole("button", { name: "Check current result" }).click();
  await expect(page.getByRole("button", { name: "Upload logo" })).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole("img", { name: "Organization logo" }),
  ).toHaveAttribute("src", logoUrl);
  expect(f.confirmations()).toHaveLength(1);
  expect(f.confirmations()[0]?.input).toEqual({
    body: { s3Key: key, contentType: "image/png" },
  });
  expect(f.uploads).toEqual([
    { method: "POST", authorization: undefined, cookie: undefined },
  ]);
  expect(f.unexpected).toEqual([]);
});

for (const mismatch of ["key", "type"] as const) {
  test(`Branding refuses a delivered logo receipt with wrong ${mismatch}`, async ({
    page,
  }) => {
    const f = await brandingFixture(page);
    f.handlers.set("settings.branding.logoConfirm", async (route) => {
      f.data.branding = f.confirmed;
      await route.fulfill({
        json: {
          ...f.confirmed,
          ...(mismatch === "key"
            ? { logoS3Key: "wrong-upload" }
            : { logoContentType: "image/jpeg" }),
        },
      });
    });
    await f.open("branding");
    await page.locator('input[type="file"]').setInputFiles(file);
    await expect(
      page.getByText("Check the last change", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Check current result" }).click();
    await expect(
      page.getByText("The result is not confirmed.", { exact: false }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Upload logo" }),
    ).toBeDisabled();
    expect(f.confirmations()).toHaveLength(1);
    expect(f.uploads).toHaveLength(1);
    expect(f.unexpected).toEqual([]);
  });
}

test("Branding lost confirmation stays fenced despite equal canonical logo and never repeats upload or confirmation", async ({
  page,
}) => {
  const f = await brandingFixture(page);
  f.handlers.set("settings.branding.logoConfirm", async (route) => {
    f.data.branding = f.confirmed;
    await route.abort("failed");
  });
  await f.open("branding");
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(
    page.getByText("Check the last change", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Check current result" }).click();
  await expect(
    page.getByRole("button", { name: "Upload logo" }),
  ).toBeDisabled();
  await expect(
    page.getByText("The result is not confirmed.", { exact: false }).first(),
  ).toBeVisible();
  expect(f.confirmations()).toHaveLength(1);
  expect(f.uploads).toHaveLength(1);
  expect(f.unexpected).toEqual([]);
});

test("Branding rejects invalid local files before requesting any upload ticket", async ({
  page,
}) => {
  const f = await brandingFixture(page);
  await f.open("branding");
  await page.locator('input[type="file"]').setInputFiles({
    name: "synthetic.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image"),
  });
  await expect(
    page.getByText("Choose a PNG, JPG, WEBP or SVG logo."),
  ).toBeVisible();
  await page
    .locator('input[type="file"]')
    .setInputFiles({ ...file, buffer: Buffer.alloc(2 * 1024 * 1024 + 1) });
  await expect(
    page.getByText("Choose a logo smaller than 2 MB."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload logo" })).toBeEnabled();
  expect(f.writes()).toHaveLength(0);
  expect(f.uploads).toHaveLength(0);
  expect(f.unexpected).toEqual([]);
});

test("Branding account replacement retires the old upload callback without changing the new actor's draft", async ({
  page,
}) => {
  const f = await brandingFixture(page);
  let release!: () => void;
  const response = new Promise<void>((resolve) => {
    release = resolve;
  });
  f.handlers.set("settings.branding.logoConfirm", async (route) => {
    await response;
    await route.fulfill({ json: f.confirmed });
  });
  await f.open("branding");
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect.poll(() => f.confirmations().length).toBe(1);
  f.data.identity.user.id = "00000082-1111-4111-8111-111111111111";
  f.data.identity.user.clerkUserId = "next-logo-user";
  f.data.branding.name = "Next actor organization";
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: {
          userId: "next-logo-user",
          sessionId: "next-logo-session",
          orgId: "test-org",
        },
      }),
    ),
  );
  const name = page.getByRole("textbox", { name: "Company name", exact: true });
  await expect(name).toHaveValue("Next actor organization");
  await name.fill("Next actor unsaved draft");
  release();
  await expect(name).toHaveValue("Next actor unsaved draft");
  await expect(
    page.getByText("Logo was uploaded.", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Upload logo" })).toBeEnabled();
  expect(f.confirmations()).toHaveLength(1);
  expect(f.uploads).toHaveLength(1);
  expect(f.unexpected).toEqual([]);
});
