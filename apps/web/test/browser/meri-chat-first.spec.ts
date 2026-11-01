import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import type { UIEvent } from "@capiro/meri-contracts";
import { newWorkflow } from "../../src/features/settings/site-workflows/form";
import { CONVERSATION_SKILLS } from "@capiro/meri-contracts/conversation-application";
import {
  clientId,
  context,
  conversationId,
  eventOf,
  openEvidence,
  setupConversation,
  status,
} from "./meri-conversation-fixtures";
import { installInitialInput } from "./meri-initial-input-fixtures";
import {
  initialEvents,
  installCurrentRun,
  installHistory,
  selectedUrl,
  turn,
} from "./meri-history-fixtures";
import { reply, runFor } from "./meri-conversation-fixtures";
import { binding } from "./meri-conversation-fixtures";
import { json } from "../../tests/browser/fixtures";
import { testIdentity } from "./fixtures";
/** The shipped catalog, read directly so the expectation does not share the app's module graph. */
const stoicQuotes = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        "../../src/features/meri/quote/stoic-quotes.json",
        import.meta.url,
      ),
    ),
    "utf8",
  ),
) as readonly { text: string; author: string }[];
import { currentPreferencesFixture } from "../../tests/meri-user-preferences-fixtures";

const evidence = fileURLToPath(
  new URL(
    "../../../../docs/meri-chat-first-20261030/screenshots/",
    import.meta.url,
  ),
);
mkdirSync(evidence, { recursive: true });
const shot = (name: string) => `${evidence}${name}`;

const composer = (page: Page) =>
  page.getByLabel("Meri message", { exact: true });

/** The catalog entry for one local civil date, independent of the host timezone. */
const quoteOn = (year: number, month: number, day: number) => {
  const days = Date.UTC(year, month - 1, day) / 86_400_000;
  return stoicQuotes[
    ((days % stoicQuotes.length) + stoicQuotes.length) % stoicQuotes.length
  ]!;
};

/**
 * The healthy empty conversation: admitted identity/client/session plus the canonical not-started
 * history (404 NOT_FOUND), empty conversation list and permitted skill catalog. No mocked failure
 * stands in for the landing state.
 */
async function healthy(page: Page, lifetimeMs?: number) {
  // A faked page clock must not expire the synthetic session receipt unless the case says so.
  await setupConversation(page, undefined, undefined, lifetimeMs);
  await installInitialInput(page);
  await page.route("**/api/capiro/meri.quickActions.list*", (route) =>
    json(route, {
      version: 1,
      enabled: true,
      skills: CONVERSATION_SKILLS.map((skill) => ({ id: skill.skillId })),
    }),
  );
  await page.route("**/api/settings/user/read*", (route) =>
    json(route, currentPreferencesFixture.read),
  );
}

async function shellReady(page: Page) {
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(composer(page)).toBeVisible();
}

/** The hero: the day's verified quotation, its author and a decoded Meri orb. */
async function heroReady(page: Page) {
  const blockquote = page.getByRole("blockquote");
  await expect(blockquote).not.toBeEmpty();
  await expect(blockquote.locator("footer")).toHaveText(
    /Marcus Aurelius|Epictetus|Seneca/,
  );
  // The source disclosure stays collapsed by default.
  await expect(blockquote.locator("details")).not.toHaveAttribute("open", "");
  const orb = page.locator('img[src="/design/home/meri-orb.png"]');
  await expect(orb).toBeVisible();
  await expect
    .poll(() => orb.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(320);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "Meri" })).toHaveCount(1);
}

test("desktop healthy empty conversation: quiet hero, one composer, no failure chrome", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await healthy(page);
  await page.goto(`/meri?clientId=${clientId}`);
  await shellReady(page);
  await heroReady(page);

  // Healthy history is silent: no warning, no permanent manual reload, no browser notice.
  await expect(
    page.getByText("Saved conversation history unavailable"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Reload saved history", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Browser control")).toHaveCount(0);
  await expect(
    page.getByText(/good morning|good afternoon|welcome/i),
  ).toHaveCount(0);
  await expect(page.getByText("Open Portfolio")).toHaveCount(0);
  // No duplicated landing footer or Library chat duplication.
  await expect(
    page.getByRole("link", { name: "Open task updates" }),
  ).toHaveCount(0);
  const library = page.getByRole("navigation", { name: "Meri workspace" });
  await expect(
    library.getByRole("button", { name: "Conversations", exact: true }),
  ).toHaveCount(0);
  await expect(
    library.getByRole("button", { name: "Runs", exact: true }),
  ).toHaveCount(0);

  // One composer with Attach, Tools, the single scope control and Send.
  await expect(composer(page)).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Attach", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Tools" })).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Verified conversation client",
      exact: true,
    }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Send message", exact: true }),
  ).toBeDisabled();
  expect(pageErrors).toEqual([]);

  // Default capture: Source collapsed, initial scroll position.
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: shot("desktop-new-chat.png") });
});

test("the default General scope lands on the same quiet hero with its own picker", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  // The real General fixture: a General session context, General first-chat bootstrap and the
  // canonical General scope route with no clientId.
  const generalContext = { ...context, selectedClientId: null };
  await setupConversation(page, undefined, [generalContext]);
  await installInitialInput(page, false, true);
  await page.addInitScript(() =>
    sessionStorage.setItem("meri-first-chat-enabled", "true"),
  );
  await page.route("**/api/capiro/meri.conversation.bootstrap.v2", (route) => {
    const { body } = route.request().postDataJSON() as {
      body: { requestId: string };
    };
    return reply(route, {
      ...body,
      tenantId: binding.tenantId,
      actorId: binding.actorId,
      conversationId: binding.conversationId,
    });
  });
  await page.goto("/meri?scope=general");
  await shellReady(page);
  await heroReady(page);
  // The single scope control shows General, and this is still exactly one composer.
  await expect(
    page.getByRole("button", { name: "General", exact: true }),
  ).toHaveCount(1);
  await expect(composer(page)).toHaveCount(1);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: shot("desktop-general.png") });
});

test("a 1046px window collapses the chat rail's New conversation to its icon tile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1046, height: 1001 });
  await healthy(page);
  await page.goto(`/meri?clientId=${clientId}`);
  await shellReady(page);
  const control = page
    .getByRole("complementary", { name: "Meri navigation" })
    .getByRole("button", { name: "New conversation", exact: true });
  await expect(control).toBeVisible();
  const box = (await control.boundingBox())!;
  // The label stays the accessible name but takes no space: a 40px tile, never a column of letters.
  expect(box.width).toBeLessThanOrEqual(48);
  expect(box.height).toBeLessThanOrEqual(48);
  await expect(control).toHaveCSS("font-size", "0px");
});

test("desktop tools: keyboard open, workspace links, skill chip and Escape focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  await healthy(page);
  await page.goto(`/meri?clientId=${clientId}`);
  await shellReady(page);

  const tools = page.getByRole("button", { name: "Tools" });
  await tools.focus();
  await page.keyboard.press("Enter");
  const panel = page.getByRole("dialog", { name: "Tools" });
  await expect(panel).toBeVisible();

  // The real workspaces stay reachable as secondary navigation on their canonical routes; which
  // of them are enabled follows the deployment's own capability state.
  const workspaceLinks = panel
    .getByRole("navigation", { name: "Meri workspaces" })
    .getByRole("link");
  expect(await workspaceLinks.count()).toBeGreaterThan(0);
  for (const link of await workspaceLinks.all())
    await expect(link).toHaveAttribute(
      "href",
      /^\/meri\/(actions|task-updates|runs|memory)/,
    );
  // No invented workspace-wide approvals inbox.
  await expect(panel.getByRole("link", { name: "Approvals" })).toHaveCount(0);

  // Desktop keeps the composer usable while the non-modal panel is open.
  await composer(page).fill("Draft stays editable");
  await expect(composer(page)).toHaveValue("Draft stays editable");
  await page.screenshot({ path: shot("desktop-tools-open.png") });

  // One selection becomes a compact removable chip carried by the next message.
  await panel.getByText("Skill · None").click();
  await panel.locator("select").first().selectOption({ index: 1 });
  await panel.getByRole("button", { name: "Apply to draft" }).click();
  const chip = page.getByRole("button", { name: /^Remove / });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(tools).toBeFocused();
  await expect(composer(page)).toHaveValue("Draft stays editable");
});

test("plain /meri keeps the authorized scope control when no conversation can mount", async ({
  page,
}) => {
  await setupConversation(page);
  await page.goto("/meri");
  await expect(
    page.getByRole("heading", {
      name: "Conversation connection unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Choose General or a permitted client above to start a conversation.",
      { exact: true },
    ),
  ).toBeVisible();
  // The same existing selector, exactly once, and it never bootstraps on its own.
  const scope = page.getByRole("button", {
    name: "Choose a scope",
    exact: true,
  });
  await expect(scope).toHaveCount(1);
  await expect(scope).toBeVisible();
  await expect(composer(page)).toHaveCount(0);
});

test("a completed run keeps its verified checkpoint inspection entry", async ({
  page,
}) => {
  await setupConversation(page);
  const checkpoint = eventOf(3, "checkpoint.verified", {
    checkpointId: "b0000000-0000-4000-8000-00000000000b",
  });
  const { native } = await installHistory(page, {
    turns: [turn(undefined, undefined, undefined, 0, 3)],
    // The synthetic checkpoint event is a canonical wire event for this run.
    events: [
      ...initialEvents,
      { sequence: 3, event: checkpoint } as (typeof initialEvents)[number],
    ],
  });
  await installCurrentRun(page, native);
  const controlWrites: string[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (
      request.method() !== "GET" &&
      /(lifecycle|command|cancel|pause|resume|steer|fork|checkpoint)/i.test(
        path,
      )
    )
      controlWrites.push(path);
  });
  await page.goto(selectedUrl);
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  // A finished turn shows no recovery block; its checkpoint waits behind the closed details.
  await expect(page.getByText("Pause and recovery")).toHaveCount(0);
  await expect(page.getByText("Pause or steer this run")).toHaveCount(0);
  const inspect = page.getByRole("button", {
    name: "Inspect latest checkpoint",
    exact: true,
  });
  await expect(inspect).toBeHidden();
  await openEvidence(page);
  await expect(inspect).toBeVisible();
  // Opening a finished conversation issues no lifecycle, pause, resume or fork write.
  expect(controlWrites).toEqual([]);
});

test("a first accepted prompt removes the hero without a URL change", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  await setupConversation(page);
  await installInitialInput(page);
  await page.goto(`/meri?clientId=${clientId}`);
  await shellReady(page);
  await heroReady(page);
  const before = page.url();
  await composer(page).fill("First synthetic question");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByText("Initial synthetic answer", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("blockquote")).toHaveCount(0);
  await expect(
    page.locator('img[src="/design/home/meri-orb.png"]'),
  ).toHaveCount(0);
  // The same route stays in place: emptiness is decided by the conversation, not the query.
  expect(page.url()).toBe(before);
});

test("reopening a populated current conversation without a query keeps the hero away", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  await setupConversation(page);
  const { native } = await installHistory(page);
  await installCurrentRun(page, native);
  await page.addInitScript(() =>
    sessionStorage.setItem("meri-first-chat-enabled", "true"),
  );
  // Core resolves the current conversation for /meri?clientId=... with no conversationId.
  await page.route("**/api/capiro/meri.conversation.bootstrap", (route) => {
    const { body } = route.request().postDataJSON() as {
      body: { requestId: string; clientId: string };
    };
    return reply(route, {
      schemaVersion: 1,
      requestId: body.requestId,
      conversationId: binding.conversationId,
      tenantId: binding.tenantId,
      actorId: binding.actorId,
      clientId: body.clientId,
    });
  });
  await page.goto(`/meri?clientId=${clientId}`);
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  await shellReady(page);
  await expect(page.getByRole("blockquote")).toHaveCount(0);
  await expect(
    page.locator('img[src="/design/home/meri-orb.png"]'),
  ).toHaveCount(0);
});

test("a failed history read stays explicit with its retry, and is not an empty chat", async ({
  page,
}) => {
  // setupConversation alone answers the native reads with an explicit 503.
  await setupConversation(page);
  await page.goto(`/meri?clientId=${clientId}`);
  await shellReady(page);
  await expect(
    page.getByText("Saved conversation history unavailable"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reload saved history", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("blockquote")).toHaveCount(0);
});

test("existing conversation keeps its transcript and never shows the empty-chat hero", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  await setupConversation(page);
  const { native } = await installHistory(page);
  await installCurrentRun(page, native);
  await page.goto(selectedUrl);
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  await shellReady(page);
  await expect(page.getByRole("blockquote")).toHaveCount(0);
  await expect(
    page.locator('img[src="/design/home/meri-orb.png"]'),
  ).toHaveCount(0);
  // A finished exchange is the prompt and the answer: no readiness card, status pill, recovery
  // block, per-run usage headings or empty approvals panel.
  await expect(
    page.getByRole("article", { name: "Current turn" }),
  ).toHaveAttribute("data-run-state", "completed");
  for (const noise of [
    "Ready",
    "Complete",
    "Completed",
    "You can send your next message.",
    "Write next message",
    "Pause and recovery",
    "Pause or steer this run",
    "Earlier run 1",
    "Current run",
    "View recorded usage",
    "Sources & usage",
    "Actions for your approval",
    "Meri has not prepared any actions for your approval in this conversation.",
    "No source references were provided.",
    "Saved conversation history loaded.",
  ])
    await expect(page.getByText(noise, { exact: true })).toHaveCount(0);
  await page.screenshot({ path: shot("desktop-existing-conversation.png") });
});

for (const width of [390, 320]) {
  test(`phone ${width}px: hero and composer fit the initial viewport without overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await healthy(page);
    await page.goto(`/meri?clientId=${clientId}`);
    await shellReady(page);
    await heroReady(page);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    // The landing is composed in the initial viewport: the composer is not below the fold.
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const composerBox = await composer(page).boundingBox();
    const orbBox = await page
      .locator('img[src="/design/home/meri-orb.png"]')
      .boundingBox();
    expect(composerBox).toBeTruthy();
    expect(orbBox).toBeTruthy();
    expect(orbBox!.y + orbBox!.height).toBeLessThanOrEqual(composerBox!.y);
    expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(844);
    if (width === 390)
      await page.screenshot({ path: shot("phone-new-chat.png") });

    // The sheet keeps the composer usable and dismisses with Escape.
    await page.getByRole("button", { name: "Tools" }).click();
    const panel = page.getByRole("dialog", { name: "Tools" });
    await expect(panel).toBeVisible();
    await expect(composer(page)).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (width === 390)
      await page.screenshot({ path: shot("phone-tools-open.png") });
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
  });
}

test.describe("daily quote clock (America/New_York)", () => {
  test.use({ timezoneId: "America/New_York" });

  test("the same local date stays stable and spring's 23-hour midnight advances once", async ({
    page,
  }) => {
    // America/New_York spring forward: 2026-03-08 begins at 00:00 EST, the civil day is 23 hours
    // long, and the next local midnight is 2026-03-09T00:00 EDT.
    await page.clock.install({ time: new Date("2026-03-08T00:00:00-05:00") });
    await healthy(page, 315_360_000_000);
    await page.goto(`/meri?clientId=${clientId}`);
    await shellReady(page);
    await heroReady(page);
    await expect(page.getByRole("blockquote")).toContainText(
      quoteOn(2026, 3, 8).text,
    );

    // Same local date, same quotation after a reload.
    await page.reload();
    await shellReady(page);
    await heroReady(page);
    await expect(page.getByRole("blockquote")).toContainText(
      quoteOn(2026, 3, 8).text,
    );

    // The schedule this hook uses is the real length of this civil day.
    expect(
      await page.evaluate(
        () =>
          (new Date(2026, 2, 9, 0, 0, 0, 0).getTime() -
            new Date(2026, 2, 8, 0, 0, 0, 0).getTime()) /
          3_600_000,
      ),
    ).toBe(23);

    // One second before the boundary the mounted quote is still the old date's.
    await page.clock.pauseAt(new Date("2026-03-08T23:59:59-04:00"));
    expect(await page.evaluate(() => new Date().getDate())).toBe(8);
    await expect(page.getByRole("blockquote")).toContainText(
      quoteOn(2026, 3, 8).text,
    );

    // Crossing the 23-hour boundary advances exactly once, to 2026-03-09.
    await page.clock.fastForward("00:00:02");
    expect(await page.evaluate(() => new Date().getDate())).toBe(9);
    await expect(page.getByRole("blockquote")).toContainText(
      quoteOn(2026, 3, 9).text,
    );
    await expect(page.getByRole("blockquote")).not.toContainText(
      quoteOn(2026, 3, 8).text,
    );
  });

  test("fall's 25-hour midnight advances once, and a woken tab reads its real date", async ({
    page,
  }) => {
    // America/New_York fall back: 2026-11-01 begins at 00:00 EDT, the civil day is 25 hours long,
    // and the next local midnight is 2026-11-02T00:00 EST.
    await page.clock.install({ time: new Date("2026-11-01T00:00:00-04:00") });
    await healthy(page, 315_360_000_000);
    await page.goto(`/meri?clientId=${clientId}`);
    await shellReady(page);
    await heroReady(page);
    await expect(page.getByRole("blockquote")).toContainText(
      quoteOn(2026, 11, 1).text,
    );

    // The schedule this hook uses is the real length of this civil day.
    expect(
      await page.evaluate(
        () =>
          (new Date(2026, 10, 2, 0, 0, 0, 0).getTime() -
            new Date(2026, 10, 1, 0, 0, 0, 0).getTime()) /
          3_600_000,
      ),
    ).toBe(25);

    // One second before the boundary the mounted quote is still 2026-11-01.
    await page.clock.pauseAt(new Date("2026-11-01T23:59:59-05:00"));
    expect(await page.evaluate(() => new Date().getDate())).toBe(1);
    await expect(page.getByRole("blockquote")).toContainText(
      quoteOn(2026, 11, 1).text,
    );

    // Crossing the 25-hour boundary advances exactly once, to 2026-11-02.
    await page.clock.fastForward("00:00:02");
    expect(await page.evaluate(() => new Date().getDate())).toBe(2);
    await expect(page.getByRole("blockquote")).toContainText(
      quoteOn(2026, 11, 2).text,
    );

    // A tab that wakes after suspension reads the date it actually woke on.
    await page.clock.setSystemTime(new Date("2026-11-04T09:00:00-05:00"));
    await page.evaluate(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.getByRole("blockquote")).toContainText(
      quoteOn(2026, 11, 4).text,
    );
  });
});

test("a bare /meri opens the saved default client, and General when none is saved", async ({
  page,
}) => {
  await setupConversation(page);
  await installInitialInput(page);
  const preferences = (defaultClientId: string | null) => ({
    ...currentPreferencesFixture.read,
    owner: { tenantId: testIdentity.tenant.id, actorId: testIdentity.user.id },
    preferences: {
      ...currentPreferencesFixture.read.preferences,
      defaultClientId,
    },
  });
  await page.route("**/api/settings/user/read*", (route) =>
    json(route, preferences(clientId)),
  );
  await page.goto("/meri");
  await expect(page).toHaveURL(new RegExp(`/meri\\?clientId=${clientId}$`));
  await shellReady(page);
  await expect(
    page.getByText("Choose General or a permitted client above", {
      exact: false,
    }),
  ).toHaveCount(0);

  await page.route("**/api/settings/user/read*", (route) =>
    json(route, preferences(null)),
  );
  await page.goto("/meri");
  await expect(page).toHaveURL(/\/meri\?scope=general$/);
});

test("a bare /meri that names a conversation is never redirected away from it", async ({
  page,
}) => {
  await setupConversation(page);
  await page.route("**/api/settings/user/read*", (route) =>
    json(route, currentPreferencesFixture.read),
  );
  await page.goto(`/meri?conversationId=${conversationId}`);
  await expect(
    page.getByRole("heading", { name: "Conversation connection unavailable" }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get("conversationId")).toBe(
    conversationId,
  );
});

/** One admitted browser receipt for the saved run: the run itself used the browser. */
const browserReceipt = eventOf(2, "browser.receipt", {
  schema: "meri-browser-receipt/1",
  kind: "browser.action",
  binding,
  sessionId: "c0000000-0000-4000-8000-00000000000c",
  toolUseId: null,
  action: "browser_click",
  urlHost: "app.capiro.example",
  atMs: 1_700_000_000_002,
  reference: null,
  outcome: "ok",
});
/** One configured website task: the exact pin an applied request carries. */
const websiteTask = {
  siteId: "synthetic-site",
  workflowId: "synthetic-task",
  version: 1,
  manifestSha256: "1".repeat(64),
};
const browserControl = (page: Page) =>
  page.getByText("Browser control", { exact: true });

test("browser controls follow a run that used the browser, not the Tools panel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  await setupConversation(page);
  const { native } = await installHistory(page);
  await installCurrentRun(page, native);
  await page.goto(selectedUrl);
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Tools" })).toBeVisible();
  // Absence alone proves little: a panel that never mounted would pass it too. The reload below
  // is the real assertion, that the panel exists and follows the run's own browser use.
  await expect(browserControl(page)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Tools" })).toHaveCount(0);
  native.turns = [turn(undefined, undefined, undefined, 0, 3)];
  native.events = [
    initialEvents[0]!,
    { sequence: 2, event: browserReceipt as UIEvent },
    { sequence: 3, event: status(3, "completed") as UIEvent },
  ];
  await page.reload();
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  await expect(browserControl(page)).toBeVisible();
});

test("a website task mounts browser controls once applied to the run, not while pending in the composer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  await setupConversation(page);
  await page.route("**/api/capiro/meri.siteWorkflows.catalog", (route) =>
    json(route, {
      workflows: [
        {
          manifest: {
            ...newWorkflow(),
            siteId: websiteTask.siteId,
            workflowId: websiteTask.workflowId,
            version: websiteTask.version,
            taskSummary: "Read synthetic records",
            origins: ["https://records.example.com"],
            signInUrl: "https://records.example.com/login",
            signedInProbe: { kind: "selector", value: "[data-account]" },
            tosReviewRef: "synthetic-terms",
            qualificationEvidenceRef: "synthetic-qualification",
          },
          enabled: true,
          manifestSha256: websiteTask.manifestSha256,
        },
      ],
    }),
  );
  const { native } = await installHistory(page);
  await installCurrentRun(page, native);
  await page.goto(selectedUrl);
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  // Choosing a website task for the next message is a composer selection; no run used a browser.
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.getByText("Website · No task", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Website task", exact: true })
    .selectOption({ label: "synthetic-site · synthetic-task · version 1" });
  await page.keyboard.press("Escape");
  await expect(
    page.getByText("Website · synthetic-task", { exact: true }),
  ).toBeVisible();
  await expect(browserControl(page)).toHaveCount(0);
  // The same conversation whose selected run was sent with that website task mounts the panel.
  const applied = turn();
  native.turns = [
    { ...applied, request: { ...applied.request, siteWorkflow: websiteTask } },
  ];
  await page.reload();
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  await expect(browserControl(page)).toBeVisible();
});
