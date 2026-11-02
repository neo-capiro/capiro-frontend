import { expect, test } from "@playwright/test";
import { MANAGEMENT_VERSION } from "@capiro/meri-contracts/conversation-history";
import { installFixtures, json } from "../../tests/browser/fixtures";
import { testIdentity } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await installFixtures(page);
  await page.route("**/api/backend/core/me", (route) =>
    json(route, testIdentity),
  );
  await page.route("**/api/capiro/me.read*", (route) =>
    json(route, testIdentity),
  );
  await page.route("**/api/conversations/summaries", (route) =>
    json(route, {
      version: MANAGEMENT_VERSION,
      conversations: [],
      nextBefore: null,
    }),
  );
});

for (const status of ["Archived", "Trash"]) {
  test(`${status} alone remains clearable and resets all controls without mutations`, async ({
    page,
  }, info) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/conversations/"))
        requests.push(new URL(request.url()).pathname);
    });
    await page.goto(
      "/meri/conversations?scope=general&navigation-audit=1#chat-title-search",
    );
    const search = page.getByRole("searchbox", { name: "Search", exact: true });
    await expect(search).toBeFocused();
    await page.getByRole("button", { name: /^Filter by status/ }).click();
    await page
      .getByRole("menuitemradio", { name: status, exact: true })
      .click();
    await page.getByRole("button", { name: /^Filter by client/ }).click();
    await page
      .getByRole("menuitemradio", { name: "All clients", exact: true })
      .click();
    const clear = page.getByRole("button", {
      name: "Clear search and filters",
      exact: true,
    });
    await expect(clear).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`history-${status.toLowerCase()}-empty.png`),
    });
    const before = await page.evaluate(() => window.scrollY);
    await clear.click();
    await expect(
      page.getByRole("button", {
        name: "Filter by status: Active",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Filter by client: All clients",
        exact: true,
      }),
    ).toBeVisible();
    await expect(search).toHaveValue("");
    await expect(search).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    await expect(
      page.getByText("No conversations yet", { exact: true }),
    ).toBeVisible();
    expect(
      requests.filter(
        (path) =>
          ![
            "/api/conversations/summaries",
            "/api/conversations/list",
            "/api/conversations/intents/inbox-count",
          ].includes(path),
      ),
    ).toEqual([]);
    await page.screenshot({ path: info.outputPath("history-reset.png") });
  });
}

for (const width of [390, 1024, 1440]) {
  test(`search fragment preserves heading and header at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(
      "/meri/conversations?scope=general&navigation-audit=1#chat-title-search",
    );
    const search = page.getByRole("searchbox", { name: "Search", exact: true });
    await expect(search).toBeFocused();
    // The harness replaces Next navigation; exercise native fragment scrolling on the real target.
    await page
      .locator("#chat-title-search")
      .evaluate((node) => node.scrollIntoView());
    await expect(page.getByRole("banner")).toBeInViewport({ ratio: 1 });
    await expect(
      page.getByRole("heading", { name: "Conversations", exact: true }),
    ).toBeInViewport();
    await expect(search).toBeInViewport();
    expect(new URL(page.url()).searchParams.get("scope")).toBe("general");
    // Repeat focus on the fragment after scrolling away: field focus must not remove page context.
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.locator("#chat-title-search").evaluate((node: HTMLElement) => {
      node.scrollIntoView();
      node.focus({ preventScroll: true });
    });
    await expect(search).toBeFocused();
    await expect(page.getByRole("banner")).toBeInViewport({ ratio: 1 });
  });
}

for (const status of ["Archived", "Trash"]) {
  test(`${status} reset keeps populated Active rows unselected until an explicit choice`, async ({
    page,
  }, info) => {
    const active = [1, 2].map((index) => ({
      conversationId: `30000000-0000-4000-8000-00000000000${index}`,
      title: `Synthetic active conversation ${index}`,
      revision: "1",
      scopeKind: "general",
      clientId: null,
      status: "active",
      updatedAt: `2026-11-01T10:00:0${3 - index}.000Z`,
      archivedAt: null,
      trashedAt: null,
      restoreUntil: null,
      hasTranscript: true,
      canManage: true,
    }));
    await page.route("**/api/conversations/summaries", (route) =>
      json(route, {
        version: MANAGEMENT_VERSION,
        conversations:
          route.request().postDataJSON().status === "active" ? active : [],
        nextBefore: null,
      }),
    );
    await page.goto(
      "/meri/conversations?scope=general&navigation-audit=1#chat-title-search",
    );
    const rows = page
      .getByRole("table", { name: "Conversations", exact: true })
      .locator("tbody tr");
    const actions = page.locator(
      '[aria-label="Selected conversation actions"]',
    );
    const search = page.getByRole("searchbox", { name: "Search", exact: true });
    await expect(rows).toHaveCount(2);
    // Preserve the ordinary initial selection, then choose a different row before filtering.
    await expect(rows.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(actions).toBeVisible();
    await rows.nth(1).focus();
    await page.keyboard.press("Enter");
    await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true");
    await page.getByRole("button", { name: /^Filter by status/ }).click();
    await page
      .getByRole("menuitemradio", { name: status, exact: true })
      .click();
    await search.fill("No matching title");
    await page
      .getByRole("button", { name: "Clear search and filters", exact: true })
      .click();
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Filter by status: Active",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Filter by client: All clients",
        exact: true,
      }),
    ).toBeVisible();
    await expect(search).toHaveValue("");
    await expect(search).toBeFocused();
    await expect(page.locator('tbody tr[aria-selected="true"]')).toHaveCount(0);
    await expect(actions).toHaveCount(0);
    // A later filter change also must not undo the user's explicit clear.
    await page.getByRole("button", { name: /^Filter by status/ }).click();
    await page
      .getByRole("menuitemradio", { name: status, exact: true })
      .click();
    await page.getByRole("button", { name: /^Filter by status/ }).click();
    await page
      .getByRole("menuitemradio", { name: "Active", exact: true })
      .click();
    await expect(rows.nth(0)).toBeVisible();
    await expect(page.locator('tbody tr[aria-selected="true"]')).toHaveCount(0);
    await expect(actions).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath(
        `history-${status.toLowerCase()}-reset-populated.png`,
      ),
    });
    await rows.nth(1).focus();
    await page.keyboard.press("Enter");
    await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(actions).toBeVisible();
    await expect(
      actions.getByRole("link", { name: "Open conversation", exact: true }),
    ).toHaveAttribute("href", new RegExp(active[1]!.conversationId));
  });
}
