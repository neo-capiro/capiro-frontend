import { test, expect, type BrowserContext, type Route } from "@playwright/test";
import { testIdentity } from "../fixtures";
import type { ImpersonationSession } from "../../../src/shared/capiro/operations/settings-admin/impersonation";

/**
 * Focused regressions for the active-session read lifetime.
 *
 * The read that decides which authenticated scope is impersonating must belong
 * to the mounted scope that made it. A scope-wide cache handed a replacement
 * identity the previous scope's answer — including a previous `null` — without
 * reading at all, and a pending read created under a disposed owner could be
 * borrowed by the next owner.
 *
 * These exercise the real ImpersonationBoundary/HqBoundary hook, the real
 * CapiroDataProvider request lifetime and the real HTTP transport. A "realm"
 * switch disposes and recreates the whole provider chain, exactly as
 * ApplicationBoundary's `SessionData key=[userId,sessionId,orgId]` does on
 * identity replacement.
 */

const path = "/impersonation/index.html";
type Realm = "a" | "b";

const sessionFor = (realm: Realm, tenantName: string): ImpersonationSession => ({
  sessionId:
    realm === "a"
      ? "40000000-0000-4000-8000-0000000000a1"
      : "40000000-0000-4000-8000-0000000000b2",
  tenantId: "20000000-0000-4000-8000-000000000002",
  tenantSlug: `synthetic-target-${realm}`,
  tenantName,
  reason: `Synthetic ${realm.toUpperCase()} support reason`,
  startedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  endedAt: null,
  endedReason: null,
  status: "active",
});

async function fixture(
  context: BrowserContext,
  sessions: Record<Realm, ImpersonationSession | null> = {
    a: sessionFor("a", "Synthetic Target A"),
    b: sessionFor("b", "Synthetic Target B"),
  },
) {
  const state = {
    realm: "a" as Realm,
    sessions,
    reads: { a: 0, b: 0 } as Record<Realm, number>,
    holdRealm: null as Realm | null,
    held: [] as { route: Route; realm: Realm }[],
  };
  await context.route("**/api/capiro/*", async (route) => {
    const url = new URL(route.request().url());
    const operation = decodeURIComponent(url.pathname.split("/").at(-1)!);
    if (operation === "me.read")
      return route.fulfill({ json: { ...testIdentity, role: "capiro_admin" } });
    if (operation.endsWith(".active")) {
      const realm = state.realm;
      state.reads[realm] += 1;
      if (state.holdRealm === realm) {
        state.held.push({ route, realm });
        return;
      }
      return route.fulfill({ json: { session: state.sessions[realm] } });
    }
    if (operation.endsWith(".end"))
      return route.fulfill({ json: { message: "Unsupported" } });
    if (operation.endsWith(".workspace"))
      return route.fulfill({
        json: { session: state.sessions[state.realm], readOnly: true, clients: [], nextCursor: null },
      });
    return route.fulfill({ status: 404, json: { message: "Unsupported" } });
  });
  return {
    ...state,
    readsFor: (realm: Realm) => state.reads[realm],
    switchRealm: (realm: Realm) => {
      state.realm = realm;
    },
    holdReads: (realm: Realm) => {
      state.holdRealm = realm;
    },
    /** Answer every request that was being held, in the order it arrived. */
    releaseHeld: async () => {
      state.holdRealm = null;
      for (const { route, realm } of state.held.splice(0))
        await route
          .fulfill({ json: { session: state.sessions[realm] } })
          .catch(() => {});
    },
  };
}

const actingAs = (tenantName: string) =>
  `Acting as ${tenantName}`;

test("repeated polling inside the throttle does not re-read the active session", async ({
  context,
  page,
}) => {
  const f = await fixture(context, { a: null, b: null });
  await page.goto(path);
  await expect(page.locator("main[data-realm='a']")).toBeVisible();
  // StrictMode intentionally doubles the mount effects, so measure the delta
  // across a tick rather than an absolute count.
  const answered = f.readsFor("a");
  expect(answered).toBeGreaterThan(0);
  // One five-second tick inside the fifteen-second throttle must reuse the
  // answered read instead of issuing another one.
  await page.waitForTimeout(6_500);
  expect(f.readsFor("a")).toBe(answered);
});

test("a replacement identity never inherits the previous scope's resolved session", async ({
  context,
  page,
}) => {
  const f = await fixture(context);
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: actingAs("Synthetic Target A") }),
  ).toBeVisible();

  f.switchRealm("b");
  await page.getByRole("button", { name: "Switch identity" }).click();

  // The replacement scope must read for itself, not accept the answered value
  // from the scope that was just disposed.
  await expect
    .poll(() => f.readsFor("b"), { timeout: 5_000 })
    .toBeGreaterThan(0);
  await expect(
    page.getByRole("heading", { name: actingAs("Synthetic Target B") }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: actingAs("Synthetic Target A") }),
  ).toHaveCount(0);
});

test("a replacement identity never inherits the previous scope's resolved null", async ({
  context,
  page,
}) => {
  const f = await fixture(context, {
    a: null,
    b: sessionFor("b", "Synthetic Target B"),
  });
  await page.goto(path);
  await expect(page.locator("main[data-realm='a']")).toBeVisible();
  expect(f.readsFor("a")).toBeGreaterThan(0);

  f.switchRealm("b");
  await page.getByRole("button", { name: "Switch identity" }).click();

  await expect
    .poll(() => f.readsFor("b"), { timeout: 5_000 })
    .toBeGreaterThan(0);
  await expect(
    page.getByRole("heading", { name: actingAs("Synthetic Target B") }),
  ).toBeVisible();
});

test("a disposed pending read cannot enter the replacement scope", async ({
  context,
  page,
}) => {
  const f = await fixture(context);
  f.holdReads("a");
  await page.goto(path);
  await expect(page.getByText("Verifying support session…")).toBeVisible();
  expect(f.readsFor("a")).toBeGreaterThan(0);

  f.switchRealm("b");
  await page.getByRole("button", { name: "Switch identity" }).click();

  // The replacement scope read for itself before the disposed scope answered.
  await expect
    .poll(() => f.readsFor("b"), { timeout: 5_000 })
    .toBeGreaterThan(0);
  await f.releaseHeld();
  await expect(
    page.getByRole("heading", { name: actingAs("Synthetic Target B") }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: actingAs("Synthetic Target A") }),
  ).toHaveCount(0);
});

test("a disposed owner's aborted read does not disturb the replacement owner", async ({
  context,
  page,
}) => {
  const f = await fixture(context);
  f.holdReads("a");
  await page.goto(path);
  await expect(page.getByText("Verifying support session…")).toBeVisible();

  // Disposing owner A aborts its request lifetime while A's read is pending.
  f.switchRealm("b");
  await page.getByRole("button", { name: "Switch identity" }).click();
  await expect(
    page.getByRole("heading", { name: actingAs("Synthetic Target B") }),
  ).toBeVisible();
  await f.releaseHeld();

  await expect(
    page.getByRole("heading", { name: actingAs("Synthetic Target B") }),
  ).toBeVisible();
  await expect(page.getByText("Support session verification failed.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Verify support session" })).toHaveCount(0);
});
