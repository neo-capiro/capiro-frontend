import { test, expect, type Page } from "@playwright/test";
const id = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const identity = {
  user: { id: id(1), email: null },
  tenant: { id: id(2), name: "Synthetic" },
  role: "standard_user",
};
const ref = {
  requestId: id(3),
  conversationId: id(4),
  revision: "1",
  createdAt: "2026-09-01T00:00:00.000Z",
  restoreUntil: "2026-10-01T00:00:00.000Z",
};
const version = "meri.conversation-management.v1";
const status = (state: string, reasons: string[] = []) => ({
  version,
  ...ref,
  state,
  reasons,
  retainedSharedCopies: true,
  checkedAtMs: Date.now(),
});
async function install(page: Page) {
  await page.route("**/api/backend/core/me", (r) => r.fulfill({ json: identity }));
  await page.route("**/api/conversations/deletions/list", (r) =>
    r.fulfill({
      json: {
        version,
        requests: [ref],
        olderRequestsUnavailable: true,
        nextBefore: null,
      },
    }),
  );
}
test("checks exact status, shows retained copies, and removes a previous completion on access denial", async ({
  page,
}, info) => {
  await install(page);
  let denied = false;
  await page.route("**/api/conversations/deletions/status", (r) =>
    r.fulfill(
      denied
        ? { status: 403, json: { error: { code: "ACCESS_DENIED" } } }
        : { json: status("completed") },
    ),
  );
  await page.goto("/privacy-deletions.html");
  await expect(
    page.getByText("Some older request references are unavailable.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByText("Status not checked.")).toBeVisible();
  await page
    .getByRole("button", { name: "Check deletion status", exact: true })
    .click();
  await expect(
    page.getByText("Cleanup verified complete", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Copies referenced elsewhere remain retained", {
      exact: false,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("privacy-deletion-completed.png"),
    fullPage: true,
  });
  denied = true;
  await page
    .getByRole("button", { name: "Check status again", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByText("Cleanup verified complete", { exact: true }),
  ).toHaveCount(0);
});
test("pending, blocked and unverified outcomes stay distinct", async ({
  page,
}) => {
  await install(page);
  let body = status("pending", ["cleanup_pending"]);
  await page.route("**/api/conversations/deletions/status", (r) =>
    r.fulfill({ json: body }),
  );
  await page.goto("/privacy-deletions.html");
  await page
    .getByRole("button", { name: "Check deletion status", exact: true })
    .click();
  await expect(
    page.getByText("Pending cleanup", { exact: true }),
  ).toBeVisible();
  body = status("blocked", ["legal_hold"]);
  await page
    .getByRole("button", { name: "Check status again", exact: true })
    .click();
  await expect(
    page.getByText("Cleanup blocked", { exact: true }),
  ).toBeVisible();
  body = status("unknown", ["verification_unavailable"]);
  await page
    .getByRole("button", { name: "Check status again", exact: true })
    .click();
  await expect(
    page.getByText("Deletion not verified", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Cleanup verified complete", { exact: true }),
  ).toHaveCount(0);
});
test("account change during a pending read never displays the previous actor's result", async ({
  page,
}) => {
  await install(page);
  let finish: () => void = () => {};
  const wait = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route("**/api/conversations/deletions/status", async (r) => {
    await wait;
    await r.fulfill({ json: status("completed") }).catch(() => {});
  });
  await page.goto("/privacy-deletions.html");
  await page
    .getByRole("button", { name: "Check deletion status", exact: true })
    .click();
  await page.route("**/api/conversations/deletions/list", (r) =>
    r.fulfill({
      json: {
        version,
        requests: [],
        olderRequestsUnavailable: false,
        nextBefore: null,
      },
    }),
  );
  await page.evaluate(
    (value) =>
      window.dispatchEvent(
        new CustomEvent("privacy-identity", { detail: value }),
      ),
    { ...identity, user: { ...identity.user, id: id(8) } },
  );
  await expect(
    page.getByText("No deletion requests were returned."),
  ).toBeVisible();
  finish();
  await expect(
    page.getByText("Cleanup verified complete", { exact: true }),
  ).toHaveCount(0);
});
