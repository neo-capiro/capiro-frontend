import { expect, test, type Page } from "@playwright/test";
import { MANAGEMENT_VERSION } from "@capiro/meri-contracts/conversation-history";
import { installFixtures, json } from "../../tests/browser/fixtures";
import { testIdentity } from "./fixtures";

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
async function open(page: Page) {
  await page.goto("/meri/conversations");
  await page
    .getByRole("combobox", { name: "Show", exact: true })
    .selectOption("archived");
  await expect(page.getByText(row.title, { exact: true })).toBeVisible();
  await page.getByText("Manage chat", { exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("My unsaved rename");
  await page.getByText("Read saved chat", { exact: true }).click();
}

test("pagination and receipt revalidation retain mounted drafts and disclosure while hiding unverified rows", async ({
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
  const title = page.getByLabel("Title", { exact: true }).first();
  const disclosure = page
    .locator("details")
    .filter({ has: page.getByText("Read saved chat", { exact: true }).first() })
    .first();
  hold = true;
  await page.getByRole("button", { name: "Load more chats" }).click();
  await expect(title).toBeHidden();
  await expect.poll(() => Boolean(release)).toBe(true);
  hold = false;
  release!();
  await expect(title).toBeVisible();
  await expect(title).toHaveValue("My unsaved rename");
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
  await expect(title).toBeHidden();
  await expect.poll(() => Boolean(release)).toBe(true);
  hold = false;
  release!();
  await expect(title).toHaveValue("My unsaved rename");
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
  await expect(page.getByText(canonical.title, { exact: true })).toBeVisible();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "My unsaved rename",
  );
  await expect(
    page.getByRole("button", { name: "Restore", exact: true }),
  ).toBeDisabled();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { sessionId: "replacement-session" },
      }),
    ),
  );
  await page
    .getByRole("combobox", { name: "Show", exact: true })
    .selectOption("archived");
  await page.getByText("Manage chat", { exact: true }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    canonical.title,
  );
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
    page
      .getByRole("alert")
      .filter({ hasText: "Your saved chat titles are unavailable" }),
  ).toBeVisible();
  await expect(page.getByLabel("Title", { exact: true })).toHaveCount(0);
  await expect(page.getByText(row.title, { exact: true })).toHaveCount(0);
  denied = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.getByText("Manage chat", { exact: true }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    row.title,
  );
});
