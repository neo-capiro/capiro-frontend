import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const version = "meri.conversation-management.v1";
async function syntheticNetwork(page: Page) {
  const calls: string[] = [],
    unexpected: string[] = [];
  let actor = 2;
  await page.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.origin !== "http://127.0.0.1:5191") {
      unexpected.push(`${request.method()} ${url.origin}${url.pathname}`);
      return route.abort();
    }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    calls.push(`${request.method()} ${url.pathname}`);
    if (request.method() === "GET" && url.pathname === "/api/backend/core/me")
      return route.fulfill({
        json: {
          user: { id: id(actor), email: "synthetic@example.test" },
          tenant: { id: id(1), name: "Synthetic tenant" },
          role: "standard_user",
        },
      });
    if (
      request.method() === "GET" &&
      url.pathname === "/api/backend/core/clients"
    )
      return route.fulfill({
        json: [
          {
            id: id(3),
            name: "Synthetic client",
            profileStatus: "ACTIVE",
            status: "active",
          },
        ],
      });
    if (
      request.method() === "POST" &&
      url.pathname === "/api/capiro/meri.conversation.management.list.v1"
    )
      return route.fulfill({
        json: {
          version,
          conversations: [
            {
              conversationId: id(4),
              scopeKind: "general",
              clientId: null,
              title: `Actor ${actor} saved title`,
              status: "active",
              revision: "0",
              updatedAt: "2026-10-23T00:00:00.000Z",
              archivedAt: null,
              trashedAt: null,
              restoreUntil: null,
            },
          ],
          nextBefore: null,
          managementAvailable: false,
        },
      });
    unexpected.push(`${request.method()} ${url.pathname}`);
    return route.abort();
  });
  return {
    calls,
    unexpected,
    replaceActor: () => {
      actor = 9;
    },
  };
}

test("synthetic actual boundary: Cmd/Ctrl K, Escape, focus return, title navigation and identity retirement", async ({
  page,
}) => {
  const net = await syntheticNetwork(page);
  await page.goto("/meri-m2.html");
  const opener = page.getByRole("button", { name: "Open commands" });
  await expect(opener).toBeVisible();
  await expect
    .poll(() => net.calls.filter((path) => path.endsWith("/me")).length)
    .toBe(1);
  expect(net.calls).toEqual(["GET /api/backend/core/me"]);
  await opener.focus();
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("option", { name: "Actor 2 saved title General" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
  await page.keyboard.press("Meta+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  net.replaceActor();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { userId: "other-test-user", sessionId: "other-session" },
      }),
    ),
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await opener.click();
  await expect(page.getByText("Actor 2 saved title")).toHaveCount(0);
  const current = page.getByRole("option", {
    name: "Actor 9 saved title General",
  });
  await expect(current).toBeVisible();
  await current.click();
  await expect(page).toHaveURL(
    new RegExp(`/meri\\?scope=general&conversationId=${id(4)}`),
  );
  expect(
    net.calls.every(
      (call) => call.startsWith("GET ") || call.endsWith("management.list.v1"),
    ),
  ).toBe(true);
  expect(net.unexpected).toEqual([]);
});

test("synthetic signed-out boundary has no palette listener or hidden reads", async ({
  page,
}) => {
  const net = await syntheticNetwork(page);
  await page.goto("/meri-m2.html");
  await expect(
    page.getByRole("button", { name: "Open commands" }),
  ).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { userId: null, sessionId: null, orgId: null },
      }),
    ),
  );
  await expect(
    page.getByRole("heading", { name: "Sign in to Capiro" }),
  ).toBeVisible();
  const before = [...net.calls];
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(net.calls).toEqual(before);
  expect(net.unexpected).toEqual([]);
});

test("synthetic skill draft retains exact version/window on reload and clears the view on client switch", async ({
  page,
}) => {
  const net = await syntheticNetwork(page);
  await page.goto("/meri-m2.html");
  await page.getByText("Skills · 14 catalog skills", { exact: true }).click();
  await page
    .getByRole("option", { name: "mail history 1.0.0", exact: true })
    .click();
  await page.getByRole("combobox", { name: "Window type" }).click();
  await page.getByRole("option", { name: "All time", exact: true }).click();
  await page.getByRole("button", { name: "Keep window in this tab" }).click();
  await expect(
    page.getByText("Requested window kept for this exact version.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Run skill unavailable" }),
  ).toBeDisabled();
  await page.reload();
  await page.getByText("Skills · 14 catalog skills", { exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Selected skill" }),
  ).toContainText("mail history · 1.0.0");
  await expect(page.getByRole("combobox", { name: "Window type" })).toHaveText(
    "All time",
  );
  await page
    .getByRole("button", { name: "Change synthetic draft scope" })
    .click();
  await page.getByText("Skills · 14 catalog skills", { exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Selected skill" }),
  ).toHaveCount(0);
  expect(net.calls.every((call) => call === "GET /api/backend/core/me")).toBe(
    true,
  );
  expect(net.unexpected).toEqual([]);
});

test("synthetic MP cascader is interactive, clearly unsaved and performs no request", async ({
  page,
}) => {
  const net = await syntheticNetwork(page);
  await page.goto("/meri-m2.html");
  await page
    .getByText("Model & reasoning · Mock preview", { exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Preview model and reasoning" })
    .click();
  await page.getByText("Amazon Bedrock", { exact: true }).click();
  await page.getByText("Example Bedrock model", { exact: true }).click();
  await page.getByText("Standard", { exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "No model setting was saved",
  );
  await page.screenshot({
    path: "work/meri-m2-mock-picker-synthetic.png",
    fullPage: true,
  });
  expect(net.calls.every((call) => call === "GET /api/backend/core/me")).toBe(
    true,
  );
  expect(net.unexpected).toEqual([]);
});

async function managedNetwork(context: BrowserContext) {
  const unexpected: string[] = [],
    changes: Record<string, unknown>[] = [];
  const receipts = new Map<string, unknown>();
  let loseNext = false;
  let actor = 2;
  let row = {
    conversationId: id(4),
    scopeKind: "general",
    clientId: null,
    title: "Synthetic managed title",
    status: "active",
    revision: "0",
    updatedAt: "2026-10-23T00:00:00.000Z",
    archivedAt: null as string | null,
    trashedAt: null as string | null,
    restoreUntil: null as string | null,
  };
  await context.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.origin !== "http://127.0.0.1:5191") {
      unexpected.push(request.url());
      return route.abort();
    }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    if (request.method() === "GET" && url.pathname === "/api/backend/core/me")
      return route.fulfill({
        json: {
          user: { id: id(actor), email: "synthetic@example.test" },
          tenant: { id: id(1), name: "Synthetic tenant" },
          role: "standard_user",
        },
      });
    if (
      request.method() === "POST" &&
      url.pathname === "/api/capiro/meri.conversation.management.list.v1"
    ) {
      const body = request.postDataJSON().body;
      return route.fulfill({
        json: {
          version,
          managementAvailable: true,
          nextBefore: null,
          conversations:
            actor === 2 &&
            body.status === row.status &&
            row.title.toLowerCase().includes(body.title.toLowerCase())
              ? [row]
              : [],
        },
      });
    }
    if (
      request.method() === "POST" &&
      url.pathname === "/api/capiro/meri.conversation.management.change.v1"
    ) {
      const body = request.postDataJSON().body;
      changes.push(body);
      const prior = receipts.get(body.requestId);
      if (prior) return route.fulfill({ json: prior });
      if (body.expectedRevision !== row.revision)
        return route.fulfill({
          status: 409,
          json: { message: "The record changed." },
        });
      row = {
        ...row,
        revision: String(Number(row.revision) + 1),
        updatedAt: new Date().toISOString(),
      };
      if (body.operation === "rename") row.title = body.title;
      else if (body.operation === "trash")
        row = {
          ...row,
          status: "trashed",
          trashedAt: "2026-10-23T00:00:00.000Z",
          restoreUntil: "2026-11-22T00:00:00.000Z",
        };
      else if (body.operation === "restore")
        row = {
          ...row,
          status: "active",
          trashedAt: null,
          restoreUntil: null,
          archivedAt: null,
        };
      else if (body.operation === "archive")
        row = {
          ...row,
          status: "archived",
          archivedAt: new Date().toISOString(),
        };
      else {
        unexpected.push(`Unknown operation ${body.operation}`);
        return route.abort();
      }
      const receipt = {
        version,
        requestId: body.requestId,
        conversation: { ...row },
      };
      receipts.set(body.requestId, receipt);
      if (loseNext) {
        loseNext = false;
        return route.abort();
      }
      return route.fulfill({ json: receipt });
    }
    unexpected.push(`${request.method()} ${url.pathname}`);
    return route.abort();
  });
  return {
    unexpected,
    changes,
    loseNextReply: () => {
      loseNext = true;
    },
    replaceActor: () => {
      actor = 9;
    },
  };
}

test("synthetic management: lost reply recovers exact request, cross-tab recents retire, Trash requires confirmation", async ({
  context,
  page,
}) => {
  const net = await managedNetwork(context),
    other = await context.newPage();
  for (const target of [page, other]) {
    await target.goto("/meri-m2.html");
    await target
      .getByRole("button", { name: "Open synthetic management" })
      .click();
    await expect(
      target.getByRole("complementary", { name: "Synthetic recents" }),
    ).toContainText("Synthetic managed title");
  }
  let panel = page.getByRole("region", { name: "Your saved chats" });
  await panel.getByText("Manage chat", { exact: true }).click();
  await panel
    .getByLabel("Title", { exact: true })
    .fill("Reviewed synthetic title");
  net.loseNextReply();
  await panel.getByRole("button", { name: "Rename", exact: true }).click();
  await expect(panel).toContainText("The change is not confirmed");
  await expect(
    page.getByRole("region", { name: "Conversation renamed", exact: true }),
  ).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Rename", exact: true }),
  ).toBeDisabled();
  expect(net.changes).toHaveLength(1);
  await page.reload();
  await page.getByRole("button", { name: "Open synthetic management" }).click();
  panel = page.getByRole("region", { name: "Your saved chats" });
  await panel.getByText("Manage chat", { exact: true }).click();
  await expect(
    panel.getByRole("button", { name: "Retry same change" }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Retry same change" }).click();
  await expect.poll(() => net.changes.length).toBe(2);
  expect(net.changes[1]).toEqual(net.changes[0]);
  await expect(
    other.getByRole("complementary", { name: "Synthetic recents" }),
  ).toContainText("Reviewed synthetic title");
  const renamed = page.getByRole("region", {
    name: "Conversation renamed",
    exact: true,
  });
  await expect(renamed).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Confirmed chat changes", exact: true }),
  ).toHaveAttribute("aria-live", "polite");
  await expect(
    other.getByRole("region", { name: "Conversation renamed", exact: true }),
  ).toHaveCount(0);
  await renamed.getByRole("button", { name: "Dismiss" }).focus();
  await page.keyboard.press("Enter");
  await expect(renamed).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Retry same change" }),
  ).toHaveCount(0);
  await panel.getByText("Manage chat", { exact: true }).click();
  const trash = panel.getByRole("button", {
    name: "Move to Trash",
    exact: true,
  });
  await trash.click();
  await expect(page.getByRole("dialog")).toContainText("30 days");
  expect(net.changes).toHaveLength(2);
  await page.keyboard.press("Escape");
  await expect(trash).toBeFocused();
  expect(net.changes).toHaveLength(2);
  await trash.click();
  await page.getByRole("button", { name: "Confirm move to Trash" }).click();
  await expect.poll(() => net.changes.length).toBe(3);
  const trashed = page.getByRole("region", {
    name: "Conversation moved to Trash",
    exact: true,
  });
  await expect(trashed).toBeVisible();
  const icon = trashed.locator("img");
  await expect
    .poll(() =>
      icon.evaluate(
        (node: HTMLImageElement) =>
          node.complete &&
          node.naturalWidth === 14 &&
          node.naturalHeight === 14,
      ),
    )
    .toBe(true);
  const geometry = await icon.boundingBox();
  expect(geometry?.width).toBeCloseTo(14, 3);
  expect(geometry?.height).toBeCloseTo(14, 3);
  const dismissGeometry = await trashed
    .getByRole("button", { name: "Dismiss" })
    .boundingBox();
  expect(dismissGeometry?.height).toBeCloseTo(36, 3);
  await trashed.screenshot({ path: "work/meri-m2-trash-sonner-synthetic.png" });
  await expect(
    other.getByRole("complementary", { name: "Synthetic recents" }),
  ).not.toContainText("Reviewed synthetic title");
  await panel
    .getByRole("combobox", { name: "Show", exact: true })
    .selectOption("trashed");
  await panel.getByText("Manage chat", { exact: true }).click();
  await panel.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(
    other.getByRole("complementary", { name: "Synthetic recents" }),
  ).toContainText("Reviewed synthetic title");
  await expect(
    page.getByRole("region", { name: "Conversation restored", exact: true }),
  ).toBeVisible();
  net.replaceActor();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { userId: "other-test-user", sessionId: "other-session" },
      }),
    ),
  );
  await expect(
    page.getByRole("region", { name: "Conversation restored", exact: true }),
  ).toHaveCount(0);
  expect(net.changes.map((change) => change.operation)).toEqual([
    "rename",
    "rename",
    "trash",
    "restore",
  ]);
  expect(net.unexpected).toEqual([]);
  await other.close();
});
