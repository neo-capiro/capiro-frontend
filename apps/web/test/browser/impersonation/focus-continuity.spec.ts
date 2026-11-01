import { expect, test, type Page } from "@playwright/test";
import { testIdentity } from "../fixtures";
import type { ImpersonationSession } from "../../../src/shared/capiro/operations/settings-admin/impersonation";

test.setTimeout(60_000);

async function ownAccount(page: Page) {
  const state = {
    hold: false,
    denied: false,
    reads: 0,
    release: () => {},
    session: null as ImpersonationSession | null,
  };
  await page.route("**/api/capiro/*", async (route) => {
    const operation = decodeURIComponent(
      new URL(route.request().url()).pathname.split("/").at(-1)!,
    );
    if (operation === "me.read")
      return route.fulfill({ json: { ...testIdentity, role: "capiro_admin" } });
    if (operation.endsWith(".active")) {
      state.reads += 1;
      const { denied, session } = state;
      if (state.hold)
        await new Promise<void>((resolve) => {
          state.release = resolve;
        });
      return denied
        ? route.fulfill({
            status: 403,
            json: { message: "Synthetic access refused" },
          })
        : route.fulfill({ json: { session } });
    }
    if (operation.endsWith(".workspace"))
      return route.fulfill({
        json: {
          session: state.session,
          readOnly: true,
          clients: [],
          nextCursor: null,
        },
      });
    return route.fulfill({
      status: 404,
      json: { message: "Unsupported synthetic operation" },
    });
  });
  await page.goto("/impersonation/index.html");
  await expect(page.getByLabel("Private draft")).toBeVisible();
  return state;
}

test("focus verification keeps the mounted page, draft and focus while checking unchanged scope", async ({
  page,
}) => {
  const state = await ownAccount(page);
  const draft = page.getByLabel("Private draft");
  await draft.fill("Unsent synthetic work survives window focus");
  const reads = state.reads;
  state.hold = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => state.reads).toBeGreaterThan(reads);
  await expect(draft).toBeVisible();
  await expect(draft).toHaveValue(
    "Unsent synthetic work survives window focus",
  );
  await expect(draft).toBeFocused();
  await expect(page.getByText("Verifying support session…")).toHaveCount(0);
  state.hold = false;
  state.release();
  // Another focus makes another fresh read, without disposing the page.
  await expect.poll(() => state.reads).toBe(reads + 1);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => state.reads).toBe(reads + 2);
  await expect(draft).toHaveValue(
    "Unsent synthetic work survives window focus",
  );
});

test("failed focus verification still removes private content", async ({
  page,
}) => {
  const state = await ownAccount(page);
  await page.getByLabel("Private draft").fill("Private synthetic work");
  state.denied = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("button", { name: "Verify support session" }),
  ).toBeVisible();
  await expect(page.getByLabel("Private draft")).toHaveCount(0);
});

test("explicit support-scope change still contains the previous page immediately", async ({
  page,
}) => {
  const state = await ownAccount(page);
  state.hold = true;
  const reads = state.reads;
  await page.evaluate(() =>
    window.dispatchEvent(new Event("capiro-impersonation-change")),
  );
  await expect.poll(() => state.reads).toBeGreaterThan(reads);
  await expect(page.getByLabel("Private draft")).toHaveCount(0);
  await expect(page.getByText("Verifying support session…")).toBeVisible();
  state.hold = false;
  state.release();
});

test("an older successful focus read cannot restore the page after a newer refusal", async ({
  page,
}) => {
  const state = await ownAccount(page);
  state.hold = true;
  const reads = state.reads;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => state.reads).toBe(reads + 1);
  const releaseOld = state.release;
  state.denied = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => state.reads).toBe(reads + 2);
  state.hold = false;
  state.release();
  await expect(
    page.getByRole("button", { name: "Verify support session" }),
  ).toBeVisible();
  const staleResponse = page.waitForResponse(
    (response) =>
      response.url().includes("impersonation.active") &&
      response.status() === 200,
  );
  releaseOld();
  await (await staleResponse).finished();
  // Let the stale response's promise and React update opportunity complete.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  await expect(page.getByLabel("Private draft")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Verify support session" }),
  ).toBeVisible();
});

test("focus discovering a changed support scope replaces the previous page and draft", async ({
  page,
}) => {
  const state = await ownAccount(page);
  await page.getByLabel("Private draft").fill("Unsent own-account work");
  state.session = {
    sessionId: "40000000-0000-4000-8000-0000000000a1",
    tenantId: "20000000-0000-4000-8000-000000000002",
    tenantSlug: "synthetic-target",
    tenantName: "Synthetic Focus Target",
    reason: "Synthetic support verification",
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    endedAt: null,
    endedReason: null,
    status: "active",
  };
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("heading", { name: "Acting as Synthetic Focus Target" }),
  ).toBeVisible();
  await expect(page.getByLabel("Private draft")).toHaveCount(0);
});
