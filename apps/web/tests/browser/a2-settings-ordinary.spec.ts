import { expect, test, type Page } from "@playwright/test";
import { settingsFixture } from "./a2-settings-fixtures";

const failures = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  failures.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(({ page }) => expect(failures.get(page)).toEqual([]));

const signatureFile = {
  name: "synthetic-signature.html",
  mimeType: "text/html",
  buffer: Buffer.from("<p>Synthetic uploaded signature</p>"),
};

test("Personal title accepts Core trim and null receipts and refreshes the current profile", async ({
  page,
}) => {
  const f = await settingsFixture(page);
  f.handlers.set("me.update", async (route) => {
    f.data.identity.user.title =
      route.request().postDataJSON().body.title.trim() || null;
    await route.fulfill({ json: f.data.identity });
  });
  await f.open("personal");
  const title = page.getByRole("textbox", { name: "Title", exact: true });
  const save = page.getByRole("button", { name: "Save", exact: true });
  await title.fill("  Synthetic lead  ");
  await save.click();
  await expect(title).toHaveValue("Synthetic lead");
  await expect(save).toBeEnabled();
  await title.fill("   ");
  await save.click();
  await expect(title).toHaveValue("");
  await expect(save).toBeEnabled();
  expect(
    f.requests.filter((r) => r.operation === "me.read").length,
  ).toBeGreaterThanOrEqual(3);
  expect(f.writes()).toHaveLength(2);
  expect(f.unexpected).toEqual([]);
});

test("Contact response loss stays uncertain after equal readback and reload without replay or stored contact text", async ({
  page,
}) => {
  const f = await settingsFixture(page);
  const sensitiveDraft = "Synthetic sensitive organization draft";
  f.handlers.set("settings.contact.update", async (route) => {
    Object.assign(f.data.contact, route.request().postDataJSON().body);
    await route.abort("failed");
  });
  await f.open("contact-info");
  await page
    .getByRole("textbox", { name: "Organization name" })
    .fill(sensitiveDraft);
  await page.getByRole("button", { name: "Save contact info" }).click();
  await expect(
    page.getByText("Check the last change", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Organization name" }),
  ).toHaveValue(sensitiveDraft);
  await page.getByRole("button", { name: "Check current result" }).click();
  await expect(
    page.getByText("The result is not confirmed.", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save contact info" }),
  ).toBeDisabled();
  const stored = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }),
  );
  expect(stored).not.toContain(sensitiveDraft);
  expect(f.writes()).toHaveLength(1);
  expect(f.unexpected).toEqual([]);
});

test("Contact accepts its exact delivered fields and refuses a mismatched receipt", async ({
  page,
}) => {
  const f = await settingsFixture(page);
  let mismatch = false;
  f.handlers.set("settings.contact.update", async (route) => {
    Object.assign(f.data.contact, route.request().postDataJSON().body);
    await route.fulfill({
      json: {
        ...f.data.contact,
        ...(mismatch ? { name: "Different organization" } : {}),
      },
    });
  });
  await f.open("contact-info");
  const name = page.getByRole("textbox", { name: "Organization name" });
  const save = page.getByRole("button", { name: "Save contact info" });
  await name.fill("Confirmed synthetic organization");
  await save.click();
  await expect(name).toHaveValue("Confirmed synthetic organization");
  await expect(save).toBeEnabled();
  mismatch = true;
  await name.fill("Unconfirmed synthetic organization");
  await save.click();
  await expect(
    page.getByText("Check the last change", { exact: true }),
  ).toBeVisible();
  await expect(save).toBeDisabled();
  expect(f.writes()).toHaveLength(2);
  expect(f.unexpected).toEqual([]);
});

test("Signature upload holds every editor control during dispatch and settles only exact canonical sanitized readback", async ({
  page,
}) => {
  const f = await settingsFixture(page);
  let release!: () => void;
  const response = new Promise<void>((resolve) => {
    release = resolve;
  });
  const canonical = {
    html: "<p>Canonical sanitized signature</p>",
    enabled: true,
  };
  f.handlers.set("me.emailSignature.update", async (route) => {
    await response;
    await route.fulfill({ json: canonical });
  });
  await f.open("personal");
  const editor = page.getByRole("textbox", {
    name: "Email signature",
    exact: true,
  });
  await page.locator('input[type="file"]').setInputFiles(signatureFile);
  await expect(editor).toContainText("Synthetic uploaded signature");
  const toggle = page.getByRole("switch", {
    name: "Append signature to campaign emails by default",
  });
  await toggle.click();
  await page.getByRole("button", { name: "Save signature" }).dblclick();
  await expect.poll(() => f.writes().length).toBe(1);
  await expect(toggle).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Browse file" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeDisabled();
  await expect(editor).toHaveAttribute("contenteditable", "false");
  await page
    .getByRole("heading", { name: "Upload a signature image or HTML file" })
    .locator("..")
    .evaluate((dropzone) => {
      const transfer = new DataTransfer();
      transfer.items.add(
        new File(["<p>Blocked concurrent drop</p>"], "blocked.html", {
          type: "text/html",
        }),
      );
      dropzone.dispatchEvent(
        new DragEvent("drop", { bubbles: true, dataTransfer: transfer }),
      );
    });
  await expect(editor).toContainText("Synthetic uploaded signature");
  release();
  await expect(
    page.getByText("Check the last change", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Check current result" }).click();
  await expect(
    page.getByText("The result is not confirmed.", { exact: false }).first(),
  ).toBeVisible();
  f.data.signature = canonical;
  await page.getByRole("button", { name: "Check current result" }).click();
  await expect(
    page.getByRole("button", { name: "Save signature" }),
  ).toBeEnabled();
  await page.reload();
  await expect(editor).toContainText("Canonical sanitized signature");
  await expect(toggle).toBeChecked();
  expect(f.writes()[0]?.input).toEqual({
    body: { html: "<p>Synthetic uploaded signature</p>", enabled: true },
  });
  expect(f.writes()).toHaveLength(1);
  expect(f.unexpected).toEqual([]);
});

test("Signature rejects unsupported or oversized files and accepts an explicit valid drop without a request", async ({
  page,
}) => {
  const f = await settingsFixture(page);
  await f.open("personal");
  const input = page.locator('input[type="file"]');
  const editor = page.getByRole("textbox", {
    name: "Email signature",
    exact: true,
  });
  await input.setInputFiles({
    name: "synthetic.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Not HTML"),
  });
  await expect(
    page.getByText("Choose a PNG, JPG, GIF, WEBP or HTML signature file."),
  ).toBeVisible();
  await input.setInputFiles({
    ...signatureFile,
    buffer: Buffer.alloc(12_000_001, "x"),
  });
  await expect(
    page.getByText("Choose a file smaller than 12 MB."),
  ).toBeVisible();
  await expect(editor).toContainText("Original signature");
  await page
    .getByRole("heading", { name: "Upload a signature image or HTML file" })
    .locator("..")
    .evaluate((dropzone) => {
      const transfer = new DataTransfer();
      transfer.items.add(
        new File(["<p>Synthetic dropped signature</p>"], "dropped.html", {
          type: "text/html",
        }),
      );
      dropzone.dispatchEvent(
        new DragEvent("drop", { bubbles: true, dataTransfer: transfer }),
      );
    });
  await expect(editor).toContainText("Synthetic dropped signature");
  await expect(page.getByText("Choose a file smaller than 12 MB.")).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(editor).toContainText("Original signature");
  expect(f.writes()).toHaveLength(0);
  expect(f.unexpected).toEqual([]);
});

test("Signature local reader aborts on account replacement and cannot replace the new actor's draft", async ({
  page,
}) => {
  const f = await settingsFixture(page);
  await page.addInitScript(() => {
    const control = window as typeof window & {
      releaseSignatureRead?: () => void;
      signatureAbortCount?: number;
    };
    window.FileReader = class extends FileReader {
      readAsText(blob: Blob, encoding?: string) {
        control.releaseSignatureRead = () => super.readAsText(blob, encoding);
      }
      abort() {
        control.signatureAbortCount = (control.signatureAbortCount ?? 0) + 1;
        super.abort();
      }
    };
  });
  await f.open("personal");
  await page.locator('input[type="file"]').setInputFiles(signatureFile);
  await expect(
    page.getByText("Reading the selected signature file…"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save signature" }),
  ).toBeDisabled();
  f.data.identity.user.id = "00000074-1111-4111-8111-111111111111";
  f.data.identity.user.clerkUserId = "next-synthetic-user";
  f.data.signature.html = "<p>Next actor signature</p>";
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: {
          userId: "next-synthetic-user",
          sessionId: "next-synthetic-session",
          orgId: "test-org",
        },
      }),
    ),
  );
  const editor = page.getByRole("textbox", {
    name: "Email signature",
    exact: true,
  });
  await expect(editor).toContainText("Next actor signature");
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { signatureAbortCount?: number })
          .signatureAbortCount,
    ),
  ).toBe(1);
  await page.evaluate(() =>
    (
      window as typeof window & { releaseSignatureRead?: () => void }
    ).releaseSignatureRead?.(),
  );
  await expect(editor).toContainText("Next actor signature");
  await expect(
    page.getByRole("button", { name: "Save signature" }),
  ).toBeEnabled();
  expect(f.writes()).toHaveLength(0);
  expect(f.unexpected).toEqual([]);
});
