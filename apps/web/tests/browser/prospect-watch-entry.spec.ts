import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * SCRUM-240 — mounted ProspectWatch against the retained Vite/Chromium component harness.
 * Real DataProvider, real queries/mutations, real clicks; only the local Core requests are intercepted.
 */

const P1 = "11111111-2222-3333-4444-555555555555";
const P2 = "99999999-8888-7777-6666-555555555555";
const CURSOR = "cursor/older+page=";
const API = "**/api/backend/core/business-development/prospects/**";

const alert = (id: string, title: string, prospectId = P1, readAt: string | null = null) => ({
  id,
  title,
  summary: null,
  materiality: "high",
  materialityLevel: "high",
  company: null,
  sourceFamily: "federal_award",
  category: "contract_award",
  eventAt: null,
  effectiveAt: null,
  publishedAt: null,
  firstObservedAt: "2026-10-30T01:00:00.000Z",
  sourceLocator: id,
  implication: null,
  readAt,
  dismissedAt: null,
  prospectId,
});

const watchBody = (status = "active") => ({
  watch: {
    status,
    categories: ["contract_award"],
    ownerUserId: null,
    mutedUntil: null,
    createdAt: "2026-10-30T00:00:00.000Z",
    updatedAt: "2026-10-30T00:00:00.000Z",
  },
  sources: [{ source: "federal_award", health: "healthy", lastCheckedAt: null, detail: null }],
  lastCompletedCheckAt: "2026-10-30T01:00:00.000Z",
});

const send = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

type Seen = { method: string; url: string; body: unknown };

/** `/alerts?limit=25…` — the query string means a plain endsWith("/alerts") would not match. */
const isAlerts = (call: Seen) => new URL(call.url).pathname.endsWith("/alerts");

/** Installs one router with per-test behaviour and records every request it handled. */
async function router(
  page: Page,
  handler: (call: Seen, route: Route) => Promise<void> | void,
) {
  const seen: Seen[] = [];
  await page.route(API, async (route) => {
    const request = route.request();
    const call: Seen = {
      method: request.method(),
      url: request.url(),
      body: request.postData() ? JSON.parse(request.postData()!) : undefined,
    };
    seen.push(call);
    await handler(call, route);
  });
  return seen;
}

const open = async (page: Page, prospect = P1) => {
  await page.goto(`/prospect-watch-entry.html?prospect=${prospect}`);
  await expect(page.getByRole("heading", { name: "Watch", exact: true })).toBeVisible();
};

test("paginates with Core's cursor and reads the older alert through its own control", async ({ page }) => {
  const seen = await router(page, async (call, route) => {
    if (call.method !== "GET") return send(route, { readAt: "2026-10-30T02:00:00.000Z" });
    const url = new URL(call.url);
    if (!url.pathname.endsWith("/alerts")) return send(route, watchBody());
    if (url.searchParams.get("cursor") === CURSOR)
      return send(route, { items: [alert("alert-older", "Older award")], nextCursor: null, unreadCount: 2 });
    return send(route, { items: [alert("alert-one", "New award recorded")], nextCursor: CURSOR, unreadCount: 2 });
  });

  await open(page);
  await expect(page.getByText("New award recorded")).toBeVisible();
  await page.getByRole("button", { name: "Load older alerts" }).click();
  await expect(page.getByText("Older award")).toBeVisible();
  await expect(page.getByRole("button", { name: "Load older alerts" })).toHaveCount(0);

  const pages = seen.filter((call) => isAlerts(call));
  expect(new URL(pages[1]!.url).searchParams.get("cursor")).toBe(CURSOR);
  expect(new URL(pages[1]!.url).pathname).toContain(`/prospects/${P1}/alerts`);

  const older = page.getByRole("list", { name: "Prospect alerts" }).getByRole("listitem").filter({ hasText: "Older award" });
  await older.getByRole("button", { name: "Mark read" }).click();
  await expect
    .poll(() => seen.filter((call) => call.method === "POST").map((call) => call.url))
    .toEqual([expect.stringContaining(`/prospects/${P1}/alerts/alert-older/read`)]);
});

test("a prospect switch starts a fresh first page with no inherited cursor", async ({ page }) => {
  const seen = await router(page, async (call, route) => {
    const url = new URL(call.url);
    if (!url.pathname.endsWith("/alerts")) return send(route, watchBody());
    if (url.pathname.includes(P2))
      return send(route, { items: [alert("other-alert", "Other prospect award", P2)], nextCursor: null, unreadCount: 0 });
    if (url.searchParams.get("cursor") === CURSOR)
      return send(route, { items: [alert("alert-older", "Older award")], nextCursor: null, unreadCount: 2 });
    return send(route, { items: [alert("alert-one", "New award recorded")], nextCursor: CURSOR, unreadCount: 2 });
  });

  await open(page);
  await page.getByRole("button", { name: "Load older alerts" }).click();
  await expect(page.getByText("Older award")).toBeVisible();

  await page.evaluate((id) => window.__prospectWatch!.setProspect(id), P2);
  await expect(page.getByText("Other prospect award")).toBeVisible();
  await expect(page.getByText("Older award")).toHaveCount(0);

  const p2Pages = seen.filter((call) => call.url.includes(P2) && isAlerts(call));
  expect(p2Pages).toHaveLength(1);
  expect(new URL(p2Pages[0]!.url).searchParams.get("cursor")).toBeNull();
});

test("an unacknowledged change stays locked through a held recovery and a failed retry", async ({ page }) => {
  let broken = false;
  let recoverGate = false;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const seen = await router(page, async (call, route) => {
    if (call.method === "PATCH") {
      broken = true;
      return route.abort("failed");
    }
    if (broken && recoverGate) await gate;
    if (broken) return send(route, { message: "unavailable" }, 503);
    return isAlerts(call)
      ? send(route, { items: [alert("alert-one", "New award recorded")], nextCursor: null, unreadCount: 1 })
      : send(route, watchBody());
  });

  await open(page);
  await page.getByRole("button", { name: "Pause watch" }).click();
  await expect(page.getByRole("alert", { name: "Watch change outcome" })).toContainText("could not be re-read");
  await expect(page.getByRole("button", { name: "Pause watch" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "End watch" })).toBeDisabled();
  await expect(page.getByRole("list", { name: "Prospect alerts" }).getByRole("button", { name: "Mark read" }).first()).toBeDisabled();

  recoverGate = true;
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("button", { name: "Checking current state…" })).toBeDisabled();
  // Lock held while the recovery GETs are in flight: no state-changing control may be usable.
  await expect(page.getByRole("button", { name: "Pause watch" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "End watch" })).toBeDisabled();
  await expect(page.getByRole("list", { name: "Prospect alerts" }).getByRole("button", { name: "Dismiss" }).first()).toBeDisabled();

  release();
  await expect(page.getByRole("button", { name: "Retry" })).toBeEnabled();
  await expect(page.getByRole("alert", { name: "Watch change outcome" })).toContainText("could not be re-read");
  await expect(page.getByRole("button", { name: "Pause watch" })).toBeDisabled();
  const writes = seen.filter((call) => call.method !== "GET");
  expect(writes).toHaveLength(1); // the original attempt only: recovery never re-sends
});

test("an acknowledged change whose reads fail shows recovery instead of reopening controls", async ({ page }) => {
  let broken = false;
  const seen = await router(page, async (call, route) => {
    if (call.method === "POST") {
      broken = true;
      return send(route, { readAt: "2026-10-30T02:00:00.000Z" });
    }
    if (broken && isAlerts(call)) return send(route, { message: "unavailable" }, 503);
    return isAlerts(call)
      ? send(route, { items: [alert("alert-one", "New award recorded")], nextCursor: null, unreadCount: 1 })
      : send(route, watchBody());
  });

  await open(page);
  const first = page.getByRole("list", { name: "Prospect alerts" }).getByRole("listitem").first();
  await first.getByRole("button", { name: "Mark read" }).click();

  await expect(page.getByRole("alert", { name: "Watch change outcome" })).toContainText("accepted");
  await expect(page.getByRole("list", { name: "Prospect alerts" }).getByRole("button", { name: "Mark read" }).first()).toBeDisabled();
  await expect(page.getByRole("button", { name: "Pause watch" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  expect(seen.filter((call) => call.method === "POST")).toHaveLength(1);
});

test("a successful retry releases the lock and shows the re-read state", async ({ page }) => {
  let broken = false;
  let healthy = false;
  await router(page, async (call, route) => {
    if (call.method === "PATCH") {
      broken = true;
      return healthy ? send(route, watchBody("paused")) : route.abort("failed");
    }
    if (broken && !healthy) return send(route, { message: "unavailable" }, 503);
    return isAlerts(call)
      ? send(route, {
          items: [alert("alert-one", "New award recorded", P1, healthy ? "2026-10-30T02:00:00.000Z" : null)],
          nextCursor: null,
          unreadCount: healthy ? 0 : 1,
        })
      : send(route, watchBody(healthy ? "paused" : "active"));
  });

  await open(page);
  await page.getByRole("button", { name: "Pause watch" }).click();
  await expect(page.getByRole("alert", { name: "Watch change outcome" })).toContainText("could not be re-read");

  healthy = true;
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Status: paused")).toBeVisible();
  await expect(page.getByRole("status", { name: "Watch change outcome" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Resume watch" })).toBeEnabled();
  // The re-read alert carries its real read receipt: already-read shows as read, dismissal still open.
  const row = page.getByRole("list", { name: "Prospect alerts" }).getByRole("listitem").first();
  await expect(row).toContainText("read 2026-10-30T02:00:00.000Z");
  await expect(row.getByRole("button", { name: "Mark read" })).toBeDisabled();
  await expect(row.getByRole("button", { name: "Dismiss" })).toBeEnabled();
});

test("rows and recovery belong to one prospect: P1 pages never appear under P2", async ({ page }) => {
  let mode: "p1" | "p2-alerts-fail" = "p1";
  const seen = await router(page, async (call, route) => {
    const url = new URL(call.url);
    if (mode === "p1") {
      if (!isAlerts(call)) return send(route, watchBody());
      if (url.searchParams.get("cursor") === CURSOR)
        return send(route, { items: [alert("alert-older", "Older award")], nextCursor: null, unreadCount: 2 });
      return send(route, { items: [alert("alert-one", "New award recorded")], nextCursor: CURSOR, unreadCount: 2 });
    }
    // P2: watch reads fine, the alert page fails.
    if (isAlerts(call)) return send(route, { message: "unavailable" }, 503);
    return send(route, watchBody("paused"));
  });

  await open(page);
  await page.getByRole("button", { name: "Load older alerts" }).click();
  await expect(page.getByText("Older award")).toBeVisible();

  mode = "p2-alerts-fail";
  await page.evaluate((id) => window.__prospectWatch!.setProspect(id), P2);
  await expect(page.getByText("Status: paused")).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Alerts are unavailable right now." })).toBeVisible();
  // No P1 row, no P1-backed action.
  await expect(page.getByText("Older award")).toHaveCount(0);
  await expect(page.getByText("New award recorded")).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Prospect alerts" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mark read" })).toHaveCount(0);
  expect(seen.some((call) => call.method !== "GET")).toBe(false);
});

test("a late P1 recovery cannot set or clear P2's outcome or lock", async ({ page }) => {
  let broken = false;
  let holdP1 = false;
  let releaseP1!: () => void;
  const p1Gate = new Promise<void>((resolve) => {
    releaseP1 = resolve;
  });
  await router(page, async (call, route) => {
    const url = new URL(call.url);
    if (url.pathname.includes(P2)) {
      return isAlerts(call)
        ? send(route, { items: [alert("p2-alert", "P2 award", P2)], nextCursor: null, unreadCount: 0 })
        : send(route, watchBody());
    }
    if (call.method === "PATCH") {
      broken = true;
      return route.abort("failed");
    }
    if (broken) {
      if (holdP1) await p1Gate;
      return send(route, { message: "unavailable" }, 503);
    }
    return isAlerts(call)
      ? send(route, { items: [alert("alert-one", "New award recorded")], nextCursor: null, unreadCount: 1 })
      : send(route, watchBody());
  });

  await open(page);
  await page.getByRole("button", { name: "Pause watch" }).click();
  await expect(page.getByRole("alert", { name: "Watch change outcome" })).toContainText("could not be re-read");
  holdP1 = true;
  await page.getByRole("button", { name: "Retry" }).click();

  await page.evaluate((id) => window.__prospectWatch!.setProspect(id), P2);
  await expect(page.getByText("P2 award")).toBeVisible();
  releaseP1();
  // P1's failed recovery lands after P2 is mounted: P2 must keep its own clean state.
  await page.waitForTimeout(300);
  await expect(page.getByRole("alert", { name: "Watch change outcome" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pause watch" })).toBeEnabled();
  await expect(page.getByText("P2 award")).toBeVisible();
});

test("recovery only succeeds when the displayed inbox was actually refreshed", async ({ page }) => {
  let phase: "initial" | "post-write" | "healthy" = "initial";
  await router(page, async (call, route) => {
    const url = new URL(call.url);
    if (call.method === "POST") {
      phase = "post-write";
      return send(route, { readAt: "2026-10-30T02:00:00.000Z" });
    }
    if (!isAlerts(call)) return send(route, watchBody());
    if (url.searchParams.get("cursor") === CURSOR)
      return send(route, { items: [alert("alert-older", "Older award")], nextCursor: null, unreadCount: 2 });
    if (phase === "post-write") return send(route, { message: "unavailable" }, 503);
    return send(route, {
      items: [alert("alert-one", "New award recorded", P1, phase === "healthy" ? "2026-10-30T02:00:00.000Z" : null)],
      nextCursor: CURSOR,
      unreadCount: phase === "healthy" ? 0 : 2,
    });
  });

  await open(page);
  await page.getByRole("button", { name: "Load older alerts" }).click();
  await expect(page.getByText("Older award")).toBeVisible();

  const first = page.getByRole("list", { name: "Prospect alerts" }).getByRole("listitem").first();
  await first.getByRole("button", { name: "Mark read" }).click();
  // The acknowledgement arrived, but the displayed inbox refresh failed: no unlock, no invented receipt.
  await expect(page.getByRole("alert", { name: "Watch change outcome" })).toContainText("accepted");
  await expect(page.getByRole("button", { name: "End watch" })).toBeDisabled();
  await expect(page.getByText("Older award")).toBeVisible();

  phase = "healthy";
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("alert", { name: "Watch change outcome" })).toHaveCount(0);
  // The verified re-read restarts the inbox at Core's first page: the older page is gone by design.
  await expect(page.getByText("Older award")).toHaveCount(0);
  const row = page.getByRole("list", { name: "Prospect alerts" }).getByRole("listitem").first();
  await expect(row).toContainText("read 2026-10-30T02:00:00.000Z");
  await expect(row.getByRole("button", { name: "Dismiss" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Pause watch" })).toBeEnabled();
});
