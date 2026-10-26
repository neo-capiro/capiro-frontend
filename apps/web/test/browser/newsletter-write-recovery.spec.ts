import { test, expect, type Page } from "@playwright/test";
import type { NewsletterWriteReceipt } from "@capiro/shared/newsletter";
import {
  documentFixture,
  documentId,
  enterEditor,
  adoptDocument,
  button,
} from "./newsletter-document-fixtures";

async function fixture(page: Page) {
  const base = await documentFixture(page);
  const writes: { operation: string; body: Record<string, unknown> }[] = [];
  const reads: string[] = [];
  const receipts = new Map<string, NewsletterWriteReceipt>();
  const control = {
    mode: "lost" as "lost" | "success" | "generic" | "refused" | "held",
    wrong: false,
    absent: false,
    denied: false,
    release: () => {},
  };
  await page.route(
    /\/api\/capiro\/workspace\.richNewsletter\.(create|save|writeRequest)(?:\?|$)/,
    async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      const operation = url.pathname.split(".").pop()!;
      const input =
        request.method() === "GET"
          ? JSON.parse(url.searchParams.get("input")!)
          : request.postDataJSON();
      if (operation === "writeRequest") {
        reads.push(input.params.requestId);
        if (control.denied)
          return route.fulfill({
            status: 403,
            json: { message: "Current access refused" },
          });
        const receipt = receipts.get(input.params.requestId);
        return route.fulfill({
          json:
            control.absent || !receipt
              ? null
              : control.wrong
                ? {
                    ...receipt,
                    requestId: "10000000-0000-4000-8000-000000000099",
                  }
                : receipt,
        });
      }
      const body = input.body;
      writes.push({ operation, body });
      if (control.mode === "generic")
        return route.fulfill({
          status: 409,
          json: { message: "Generic conflict" },
        });
      if (control.mode === "refused")
        return route.fulfill({
          status: 409,
          json: {
            code: "NEWSLETTER_SAVE_CAS_REFUSED",
            disposition: "not_committed",
            requestId: body.requestId,
            operation: "save",
            documentId,
            previousRevision: body.revision,
          },
        });
      const receipt: NewsletterWriteReceipt = {
        requestId: body.requestId,
        operation: operation as "create" | "save",
        documentId,
        previousRevision: operation === "create" ? null : body.revision,
        revision: operation === "create" ? 1 : body.revision + 1,
        inputHash: "a".repeat(64),
        contentHash: "b".repeat(64),
        hashFormat: "newsletter-write-jcs-v1",
        createdAt: "2026-10-26T00:00:00.000Z",
      };
      receipts.set(body.requestId, receipt);
      base.control.current =
        operation === "create"
          ? {
              ...base.control.current,
              revision: 1,
              name: body.name,
              config: { ...base.control.current.config, clientId: null },
            }
          : {
              ...base.control.current,
              name: body.name,
              design: body.design,
              config: body.config,
              revision: receipt.revision,
            };
      if (control.mode === "held")
        await new Promise<void>((resolve) => {
          control.release = resolve;
        });
      if (control.mode === "lost")
        return route.fulfill({
          status: 503,
          json: { message: "Synthetic lost acknowledgement" },
        });
      return route.fulfill({ json: receipt });
    },
  );
  return { ...base, writes, reads, receipts, delivery: control };
}
async function ready(page: Page) {
  await enterEditor(page);
  await expect(button(page, "Create saved document")).toBeEnabled();
}
async function current(page: Page) {
  await button(page, "Read current saved document").click();
  await expect(
    page.getByRole("region", { name: "Review current saved newsletter" }),
  ).toBeVisible();
}

test("lost create and save acknowledgements survive actual reload without redispatch, separate later current content", async ({
  page,
}) => {
  const f = await fixture(page);
  await ready(page);
  await page.getByLabel("Newsletter name").fill("Retained private draft");
  await button(page, "Create saved document").click();
  await expect(
    page.getByRole("heading", { name: "Request not confirmed" }),
  ).toBeVisible();
  expect(f.writes).toHaveLength(1);
  const createId = f.writes[0]!.body.requestId as string;
  f.control.current = {
    ...f.control.current,
    revision: 2,
    name: "Later current creation",
  };
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "This request saved revision 1" }),
  ).toBeVisible();
  expect(f.reads).toEqual([createId]);
  expect(f.calls("detail")).toHaveLength(0);
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Retained private draft",
  );
  await current(page);
  await expect(
    page.getByText(
      "Current saved content: revision 2 · Later current creation",
    ),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("recovered-create-desktop.png"),
    fullPage: true,
  });
  await button(page, "Rebase local draft onto reviewed revision").click();
  await expect(button(page, "Save newsletter")).toBeEnabled();
  await button(page, "Save newsletter").click();
  await expect(
    page.getByRole("heading", { name: "Request not confirmed" }),
  ).toBeVisible();
  expect(f.writes).toHaveLength(2);
  expect(f.writes[1]!.body).toMatchObject({
    revision: 2,
    name: "Retained private draft",
  });
  const saveId = f.writes[1]!.body.requestId as string;
  expect(saveId).not.toBe(createId);
  f.control.current = {
    ...f.control.current,
    revision: 4,
    name: "Later current save",
  };
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "This request saved revision 3" }),
  ).toBeVisible();
  expect(f.reads).toEqual([createId, saveId]);
  expect(f.writes).toHaveLength(2);
  await current(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("region", { name: "Saved newsletter documents" })
    .screenshot({
      path: test.info().outputPath("recovered-save-narrow.png"),
      style: ".test-notice { visibility: hidden; }",
    });
  await button(page, "Adopt saved document and replace local draft").click();
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Later current save",
  );
  await expect(button(page, "Save newsletter")).toBeDisabled();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "Retained private draft",
  );
  expect(f.control.errors).toEqual([]);
});

test("generic409, null and mismatched request read remain unknown; current revocation hides retained content", async ({
  page,
}) => {
  const f = await fixture(page);
  await ready(page);
  await adoptDocument(page);
  await page.getByLabel("Newsletter name").fill("Protected retained edit");
  f.delivery.mode = "generic";
  await button(page, "Save newsletter").click();
  await current(page);
  await expect(
    button(page, "Rebase local draft onto reviewed revision"),
  ).toBeDisabled();
  await button(page, "Check retained request").click();
  await expect(
    page.getByRole("heading", { name: "Request not confirmed" }),
  ).toBeVisible();
  const requestId = f.writes[0]!.body.requestId as string;
  f.receipts.set(requestId, {
    requestId,
    operation: "save",
    documentId,
    previousRevision: 4,
    revision: 5,
    inputHash: "a".repeat(64),
    contentHash: "b".repeat(64),
    hashFormat: "newsletter-write-jcs-v1",
    createdAt: "2026-10-26T00:00:00.000Z",
  });
  f.delivery.wrong = true;
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Request not confirmed" }),
  ).toBeVisible();
  await expect(page.getByLabel("Newsletter name")).not.toHaveValue(
    "Protected retained edit",
  );
  const original = f.control.current;
  f.control.current = {
    ...original,
    id: "10000000-0000-4000-8000-000000000077",
    name: "Another accessible newsletter",
  };
  await button(page, "Load saved newsletters").click();
  await button(page, "Review Another accessible newsletter").click();
  await expect(
    page.getByRole("region", { name: "Review current saved newsletter" }),
  ).toBeVisible();
  await expect(page.getByLabel("Newsletter name")).not.toHaveValue(
    "Protected retained edit",
  );
  f.control.current = original;
  f.delivery.wrong = false;
  await button(page, "Check retained request").click();
  await expect(
    page.getByRole("heading", { name: "This request saved revision 5" }),
  ).toBeVisible();
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Protected retained edit",
  );
  f.delivery.denied = true;
  await button(page, "Check retained request").click();
  await expect(page.getByLabel("Newsletter name")).not.toHaveValue(
    "Protected retained edit",
  );
  await expect(
    page.getByRole("heading", { name: "This request saved revision 5" }),
  ).toBeVisible();
  expect(f.writes).toHaveLength(1);
  expect(f.control.errors).toEqual([]);
});

test("only bound no-write refusal permits explicit fresh review and a new user save", async ({
  page,
}) => {
  const f = await fixture(page);
  await ready(page);
  await adoptDocument(page);
  await page.getByLabel("Newsletter name").fill("Conflict edits");
  f.delivery.mode = "refused";
  await button(page, "Save newsletter").click();
  await expect(
    page.getByRole("heading", { name: "This save made no change" }),
  ).toBeVisible();
  f.control.current = {
    ...f.control.current,
    revision: 5,
    name: "Concurrent saved edit",
  };
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "This save made no change" }),
  ).toBeVisible();
  await expect(page.getByLabel("Newsletter name")).not.toHaveValue(
    "Conflict edits",
  );
  await current(page);
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Conflict edits",
  );
  await button(page, "Rebase local draft onto reviewed revision").click();
  await expect(button(page, "Save newsletter")).toBeEnabled();
  expect(f.writes).toHaveLength(1);
  f.delivery.mode = "success";
  await button(page, "Save newsletter").click();
  await expect(
    page.getByRole("heading", { name: "This request saved revision 6" }),
  ).toBeVisible();
  expect(f.writes).toHaveLength(2);
  expect(f.writes[1]!.body.requestId).not.toBe(f.writes[0]!.body.requestId);
  expect(f.writes[1]!.body.revision).toBe(5);
  expect(f.control.errors).toEqual([]);
});

test("partial recovery storage failure prevents the first dispatch and cannot be cleared by reload", async ({
  page,
}) => {
  const f = await fixture(page);
  await ready(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.transaction.db.name === "capiro-command-recovery-v1")
        throw new DOMException(
          "Synthetic storage failure",
          "QuotaExceededError",
        );
      return original.apply(this, args);
    };
  });
  await button(page, "Create saved document").click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "recovery is unavailable or inconsistent" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recovery unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByText("The original request is retained in this browser.", {
      exact: false,
    }),
  ).toHaveCount(0);
  expect(f.writes).toEqual([]);
  await page.reload();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "recovery is unavailable or inconsistent" }),
  ).toBeVisible();
  await expect(button(page, "Create saved document")).toBeDisabled();
  await expect(button(page, "Check browser recovery")).toBeEnabled();
  expect(f.writes).toEqual([]);
});

test("pending dispatch blocks double action and old actor completion cannot repopulate a replacement", async ({
  page,
}) => {
  const f = await fixture(page);
  await ready(page);
  await page.getByLabel("Newsletter name").fill("Former actor private content");
  f.delivery.mode = "held";
  await button(page, "Create saved document").click();
  await expect.poll(() => f.writes.length).toBe(1);
  await expect(button(page, "Create saved document")).toBeDisabled();
  await expect(page.getByLabel("Newsletter name")).toBeDisabled();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { userId: "different-actor", sessionId: "different-session" },
      }),
    ),
  );
  f.delivery.mode = "success";
  f.delivery.release();
  await expect(page.getByLabel("Newsletter name")).not.toHaveValue(
    "Former actor private content",
  );
  await expect(
    page.getByRole("heading", { name: "This request saved revision 1" }),
  ).toHaveCount(0);
  expect(f.writes).toHaveLength(1);
});

test("two tabs share the existing command lock and retained request without a second create", async ({
  page,
  context,
}) => {
  const f = await fixture(page);
  const other = await context.newPage();
  const second = await fixture(other);
  await ready(page);
  await ready(other);
  await page.getByLabel("Newsletter name").fill("First tab draft");
  await other.getByLabel("Newsletter name").fill("Second tab unsent draft");
  f.delivery.mode = "held";
  await button(page, "Create saved document").click();
  await expect.poll(() => f.writes.length).toBe(1);
  await button(other, "Create saved document").click();
  f.delivery.mode = "success";
  f.delivery.release();
  await expect(
    other.getByRole("heading", { name: "This request saved revision 1" }),
  ).toBeVisible();
  expect(second.writes).toEqual([]);
  await expect(other.getByLabel("Newsletter name")).toHaveValue(
    "Second tab unsent draft",
  );
  expect(f.writes).toHaveLength(1);
  await other.close();
});
