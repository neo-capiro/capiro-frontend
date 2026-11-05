import { expect, test, type Page } from "@playwright/test";
import { MANAGEMENT_VERSION } from "@capiro/meri-contracts/conversation-history";
import {
  client as fixtureClient,
  clientId,
  installFixtures,
  json,
} from "../../tests/browser/fixtures";
import { operationFixtures, testIdentity } from "./fixtures";

const row = {
  conversationId: "30000000-0000-4000-8000-000000000003",
  title: "Saved synthetic chat",
  revision: "1",
  scopeKind: "general",
  clientId: null,
  status: "archived",
  updatedAt: "2026-10-24T12:00:00.000Z",
  archivedAt: "2026-10-24T12:00:00.000Z",
  trashedAt: null,
  restoreUntil: null,
  hasTranscript: true,
  canManage: true,
};
async function setup(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, "BroadcastChannel", { value: undefined });
  });
  await installFixtures(page);
  // The signed-in identity is read through the existing capped /api/capiro operation; without its
  // canonical fixture the application boundary renders its failure view instead of the list.
  await operationFixtures(page, { "me.read": testIdentity });
  await page.route("**/api/backend/core/me", (route) =>
    json(route, testIdentity),
  );
  await page.route("**/api/conversations/transcript", (route) =>
    json(route, { error: { code: "CONVERSATION_UNAVAILABLE" } }, 503),
  );
}
const pageOf = (rows = [row], more = false) => ({
  version: MANAGEMENT_VERSION,
  conversations: rows,
  nextBefore: more
    ? { updatedAt: row.updatedAt, conversationId: row.conversationId }
    : null,
});
/** Figma 13.22 status menu → Archived, then the selected row's Rename overlay (3147:41265). */
async function showArchived(page: Page) {
  await page.getByRole("button", { name: /^Filter by status/ }).click();
  await page
    .getByRole("menuitemradio", { name: "Archived", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: row.title, exact: true }),
  ).toBeVisible();
  await page.getByRole("cell", { name: row.title, exact: true }).click();
}
const rename = (page: Page) =>
  page.getByRole("button", { name: "Rename", exact: true });
const title = (page: Page) => page.getByLabel("Title", { exact: true });
async function open(page: Page) {
  await page.goto("/meri/conversations");
  await showArchived(page);
  await page.getByText("Read saved chat", { exact: true }).click();
  await rename(page).click();
  await title(page).fill("My unsaved rename");
  // Cancel keeps the unsaved draft with the selected row; Save stays with the command owner.
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(title(page)).toHaveCount(0);
}

async function installSearchFixture(page: Page) {
  await setup(page);
  const first = {
    ...row,
    title: "Synthetic Atlas planning",
    status: "active",
    archivedAt: null,
  };
  const second = {
    ...first,
    conversationId: "30000000-0000-4000-8000-000000000004",
    title: "Synthetic Atlas follow-up",
    updatedAt: "2026-10-24T11:00:00.000Z",
  };
  const unrelated = {
    ...first,
    conversationId: "30000000-0000-4000-8000-000000000005",
    title: "Synthetic briefing notes",
    updatedAt: "2026-10-24T13:00:00.000Z",
  };
  const cursor = {
    updatedAt: first.updatedAt,
    conversationId: first.conversationId,
  };
  const reads: { title: string; status: string; before: unknown }[] = [];
  const otherRequests: string[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (
      path.startsWith("/api/conversations/") &&
      path !== "/api/conversations/summaries"
    )
      otherRequests.push(path);
  });
  await page.route("**/api/conversations/summaries", (route) => {
    const request = route.request().postDataJSON();
    reads.push(request);
    const matches = [unrelated, first, second].filter((item) =>
      item.title.toLowerCase().includes(request.title.toLowerCase()),
    );
    const start = request.before
      ? matches.findIndex(
          (item) => item.conversationId === request.before.conversationId,
        ) + 1
      : 0;
    const conversations = matches.slice(start, start + 1);
    const last = conversations[0];
    return json(route, {
      version: MANAGEMENT_VERSION,
      conversations,
      nextBefore:
        last && start + 1 < matches.length
          ? { updatedAt: last.updatedAt, conversationId: last.conversationId }
          : null,
    });
  });
  return { first, second, unrelated, cursor, reads, otherRequests };
}

test("saved-title search filters admitted display titles across pages without delegating stored-title filtering", async ({
  page,
}) => {
  const { first, second, unrelated, cursor, reads, otherRequests } =
    await installSearchFixture(page);
  await page.goto("/meri/conversations");
  const cell = (name: string) => page.getByRole("cell", { name, exact: true });
  await expect(cell(unrelated.title)).toBeVisible();
  await page.getByRole("button", { name: "Load more", exact: true }).click();
  await expect(cell(first.title)).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search", exact: true })
    .fill("  aTLaS  ");
  await expect(cell(first.title)).toBeVisible();
  await expect(cell(unrelated.title)).toHaveCount(0);
  await page.getByRole("button", { name: "Load more", exact: true }).click();
  await expect(cell(first.title)).toBeVisible();
  await expect(cell(second.title)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Load more", exact: true }),
  ).toHaveCount(0);
  expect(reads).toEqual([
    {
      version: MANAGEMENT_VERSION,
      title: "",
      status: "active",
      before: null,
    },
    {
      version: MANAGEMENT_VERSION,
      title: "",
      status: "active",
      before: {
        updatedAt: unrelated.updatedAt,
        conversationId: unrelated.conversationId,
      },
    },
    {
      version: MANAGEMENT_VERSION,
      title: "",
      status: "active",
      before: cursor,
    },
  ]);
  await expect(
    page.getByRole("link", { name: second.title, exact: true }),
  ).toHaveAttribute(
    "href",
    `/meri?scope=general&conversationId=${second.conversationId}`,
  );
  await page.getByRole("searchbox", { name: "Search", exact: true }).fill("");
  await expect(cell(unrelated.title)).toBeVisible();
  await expect(cell(second.title)).toBeVisible();
  expect(reads.at(-1)).toEqual({
    version: MANAGEMENT_VERSION,
    title: "",
    status: "active",
    before: cursor,
  });
  expect(otherRequests).toEqual([]);
});

for (const width of [390, 1440])
  test(`client entry stays scoped by id without a roster name at ${width}px`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await setup(page);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1040 });
    await page.route("**/api/backend/core/clients", (route) => json(route, []));
    await page.route(
      "**/api/backend/core/clients/10000000-0000-4000-8000-000000000009",
      (route) =>
        route.request().method() === "GET"
          ? json(route, {
              ...fixtureClient,
              id: "10000000-0000-4000-8000-000000000009",
              name: "Synthetic other client",
            })
          : route.fallback(),
    );
    // The production wrapper also makes these two read-only POSTs; keep the fixture
    // scoped to their exact paths rather than hiding unexpected writes or 404s.
    await page.route("**/api/conversations/list", (route) =>
      route.request().method() === "POST"
        ? json(route, {
            schema: "meri.conversation-list/1",
            conversations: [],
            nextBefore: null,
          })
        : route.fallback(),
    );
    await page.route("**/api/conversations/intents/inbox-count", (route) =>
      route.request().method() === "POST"
        ? json(route, { open: 0, checkedAt: "2026-11-05T07:00:00.000Z" })
        : route.fallback(),
    );
    const focused = {
      ...row,
      title: "Synthetic selected client chat",
      status: "active" as const,
      archivedAt: null,
      scopeKind: "client" as const,
      clientId,
    };
    const another = {
      ...focused,
      conversationId: "30000000-0000-4000-8000-000000000009",
      title: "Synthetic other client chat",
      clientId: "10000000-0000-4000-8000-000000000009",
      updatedAt: "2026-10-24T11:00:00.000Z",
    };
    await page.route("**/api/conversations/summaries", (route) =>
      json(route, {
        version: MANAGEMENT_VERSION,
        conversations: [focused, another],
        nextBefore: null,
      }),
    );
    // Only this harness mode mounts the production wrapper that reads the entry scope.
    await page.goto(
      `/meri/conversations?clientId=${clientId}&navigation-audit=1`,
    );
    await expect(
      page.getByRole("button", { name: "Filter by client: Selected client" }),
    ).toBeVisible();
    await expect(
      page.getByText("Client filter is active; client name unavailable."),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: focused.title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: another.title, exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: info.outputPath("client-scoped-no-roster.png"),
    });
    await page
      .getByRole("button", { name: "Filter by client: Selected client" })
      .click();
    await expect(
      page.getByRole("menuitemradio", { name: "Client", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("menuitemradio", { name: "All clients" }).click();
    await expect(
      page.getByRole("cell", { name: another.title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Client filter is active; client name unavailable."),
    ).toHaveCount(0);
    // Explicit All clients is valid on this URL; a soft navigation to another
    // permitted client must mount the newly selected client's scoped list.
    await page.evaluate((nextClientId) => {
      window.history.pushState(
        {},
        "",
        `/meri/conversations?clientId=${nextClientId}&navigation-audit=1`,
      );
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, another.clientId);
    await expect(
      page.getByRole("button", { name: "Filter by client: Selected client" }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: focused.title, exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("cell", { name: another.title, exact: true }),
    ).toBeVisible();
    await page.evaluate((originalClientId) => {
      window.history.pushState(
        {},
        "",
        `/meri/conversations?clientId=${originalClientId}&navigation-audit=1`,
      );
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, clientId);
    await expect(
      page.getByRole("cell", { name: another.title, exact: true }),
    ).toHaveCount(0);
    // A new load with two equally named clients must not widen the entry filter
    // merely because the person reselects its name in the menu.
    const sharedName = "Synthetic same-name client";
    await page.route("**/api/backend/core/clients", (route) =>
      json(route, [
        { ...fixtureClient, name: sharedName },
        { ...fixtureClient, id: another.clientId, name: sharedName },
      ]),
    );
    await page.reload();
    await expect(
      page.getByRole("button", { name: `Filter by client: ${sharedName}` }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: another.title, exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: `Filter by client: ${sharedName}` })
      .click();
    await page.getByRole("menuitemradio", { name: sharedName }).click();
    await expect(
      page.getByRole("cell", { name: another.title, exact: true }),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

for (const width of [390, 1440])
  test(`General-scoped history reaches a matching later page when the first page has no visible rows at ${width}px`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await setup(page);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1040 });
    const first = {
      ...row,
      status: "active" as const,
      archivedAt: null,
      scopeKind: "client" as const,
      clientId,
    };
    // Core emits 20 rows per nonterminal page, all hidden by the General filter.
    const firstPage = Array.from({ length: 20 }, (_, index) => ({
      ...first,
      conversationId:
        index === 0
          ? first.conversationId
          : `30000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`,
      updatedAt: new Date(
        Date.parse(first.updatedAt) - index * 60_000,
      ).toISOString(),
    }));
    const last = firstPage.at(-1)!;
    const second = {
      ...first,
      conversationId: "30000000-0000-4000-8000-000000000004",
      // Meri supplies the visible first-prompt title while Core stores a placeholder.
      title: "can you find grants for anduril",
      scopeKind: "general" as const,
      clientId: null,
      updatedAt: "2026-10-24T11:00:00.000Z",
    };
    const reads: { title: string; before: unknown }[] = [];
    await page.route("**/api/conversations/summaries", (route) => {
      const request = route.request().postDataJSON();
      reads.push(request);
      return json(route, {
        version: MANAGEMENT_VERSION,
        conversations: request.before ? [second] : firstPage,
        nextBefore: request.before
          ? null
          : {
              updatedAt: last.updatedAt,
              conversationId: last.conversationId,
            },
      });
    });
    // This harness route mounts the production list wrapper (and reads its entry scope).
    await page.goto("/meri/conversations?scope=general&navigation-audit=1");
    await expect(
      page.getByRole("button", { name: "Filter by client: General" }),
    ).toBeVisible();
    await expect
      .poll(() => reads.some((read) => read.before === null))
      .toBe(true);
    await expect(
      page.getByRole("cell", { name: first.title, exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("No matching conversations", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Conversation history" }),
    ).toHaveCount(0);
    const more = page.getByRole("button", { name: "Load more", exact: true });
    await expect(more).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: info.outputPath(`sparse-first-${width}.png`),
    });
    await page
      .getByRole("searchbox", { name: "Search", exact: true })
      .fill("  grants for anduril  ");
    await more.click();
    await expect(
      page.getByRole("cell", { name: second.title, exact: true }),
    ).toBeVisible();
    await expect(more).toHaveCount(0);
    expect(reads.filter((read) => read.before !== null)).toEqual([
      {
        version: MANAGEMENT_VERSION,
        status: "active",
        title: "",
        before: {
          updatedAt: last.updatedAt,
          conversationId: last.conversationId,
        },
      },
    ]);
    expect(reads.every((read) => read.title === "")).toBe(true);
    await page.screenshot({
      path: info.outputPath(`client-result-${width}.png`),
    });
    expect(errors).toEqual([]);
  });

test("pagination keeps admitted rows with disabled actions while a receipt revalidation still hides them, preserving mounted drafts and disclosure", async ({
  page,
}) => {
  await setup(page);
  let release: (() => void) | undefined;
  let hold = false;
  await page.route("**/api/conversations/summaries", async (route) => {
    if (route.request().postDataJSON().status !== "archived")
      return json(route, pageOf([]));
    if (hold) await new Promise<void>((resolve) => (release = resolve));
    const next = route.request().postDataJSON().before;
    return json(
      route,
      next
        ? pageOf([
            {
              ...row,
              conversationId: "30000000-0000-4000-8000-000000000004",
              title: "Another chat",
              updatedAt: "2026-10-24T11:00:00.000Z",
              archivedAt: "2026-10-24T11:00:00.000Z",
            },
          ])
        : pageOf([row], true),
    );
  });
  await open(page);
  const disclosure = page
    .locator("details")
    .filter({ has: page.getByText("Read saved chat", { exact: true }).first() })
    .first();
  hold = true;
  await page.getByRole("button", { name: "Load more" }).click();
  // A continuation keeps the admitted row and its actions on screen; a page read in flight is
  // display currency only, so every mutation and export stays disabled until the read is current.
  await expect(
    page.getByRole("cell", { name: row.title, exact: true }),
  ).toBeVisible();
  await expect(rename(page)).toBeVisible();
  await expect(rename(page)).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Restore", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Delete", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Export messages", exact: true }),
  ).toBeDisabled();
  await expect.poll(() => Boolean(release)).toBe(true);
  hold = false;
  release!();
  await expect(rename(page)).toBeEnabled();
  await expect(disclosure).toHaveAttribute("open", "");
  release = undefined;
  hold = true;
  await page.evaluate(
    (account) =>
      window.dispatchEvent(
        new CustomEvent("meri:conversation-management-changed", {
          detail: account,
        }),
      ),
    { tenantId: testIdentity.tenant.id, actorId: testIdentity.user.id },
  );
  await expect(rename(page)).toBeHidden();
  await expect.poll(() => Boolean(release)).toBe(true);
  hold = false;
  release!();
  await rename(page).click();
  await expect(title(page)).toHaveValue("My unsaved rename");
  await expect(disclosure).toHaveAttribute("open", "");
});

test("focus refresh overrides actual provider defaults when BroadcastChannel is unavailable and scope replacement drops drafts", async ({
  page,
}) => {
  await setup(page);
  let canonical = row;
  let reads = 0;
  await page.route("**/api/conversations/summaries", (route) => {
    reads++;
    return json(
      route,
      pageOf(
        route.request().postDataJSON().status === "archived" ? [canonical] : [],
      ),
    );
  });
  await open(page);
  const before = reads;
  canonical = {
    ...row,
    title: "Changed on another device",
    revision: "2",
    canManage: false,
  };
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => reads).toBeGreaterThan(before);
  await expect(
    page.getByRole("cell", { name: canonical.title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Restore", exact: true }),
  ).toBeDisabled();
  await rename(page).click();
  await expect(title(page)).toHaveValue("My unsaved rename");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { sessionId: "replacement-session" },
      }),
    ),
  );
  // The replaced session remounts the list: Active again, then Archived shows only the canonical row.
  await page.getByRole("button", { name: /^Filter by status/ }).click();
  await page
    .getByRole("menuitemradio", { name: "Archived", exact: true })
    .click();
  await page.getByRole("cell", { name: canonical.title, exact: true }).click();
  await rename(page).click();
  await expect(title(page)).toHaveValue(canonical.title);
});

test("access denial removes cached rows and unsaved private state", async ({
  page,
}) => {
  await setup(page);
  let denied = false;
  await page.route("**/api/conversations/summaries", (route) =>
    denied
      ? json(route, { error: { code: "CONVERSATION_ACCESS_DENIED" } }, 403)
      : json(
          route,
          pageOf(
            route.request().postDataJSON().status === "archived" ? [row] : [],
          ),
        ),
  );
  await open(page);
  denied = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("alert").filter({
      hasText:
        "You cannot open your saved chat titles with your current access.",
    }),
  ).toBeVisible();
  await expect(rename(page)).toHaveCount(0);
  await expect(
    page.getByRole("cell", { name: row.title, exact: true }),
  ).toHaveCount(0);
  denied = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: row.title, exact: true }),
  ).toBeVisible();
  await page.getByRole("cell", { name: row.title, exact: true }).click();
  await rename(page).click();
  await expect(title(page)).toHaveValue(row.title);
});
