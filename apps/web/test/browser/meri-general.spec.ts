import { test, expect, type Page } from "@playwright/test";

import {
  binding,
  clientId,
  composer,
  context,
  reply,
  sendButton,
  setupConversation,
  stopButton,
} from "./meri-conversation-fixtures";

import { installInitialInput } from "./meri-initial-input-fixtures";

const generalContext = { ...context, selectedClientId: null };

async function general(page: Page, running = false, lifetimeMs?: number) {
  const fixture = await setupConversation(
    page,
    undefined,
    [generalContext],
    lifetimeMs,
  );

  const native = await installInitialInput(page, running, true);

  await page.addInitScript(() =>
    sessionStorage.setItem("meri-first-chat-enabled", "true"),
  );

  const bootstrap: unknown[] = [];

  await page.route("**/api/capiro/meri.conversation.bootstrap.v2", (route) => {
    const { body } = route.request().postDataJSON();
    bootstrap.push(body);

    return reply(route, {
      ...body,
      tenantId: binding.tenantId,
      actorId: binding.actorId,
      conversationId: binding.conversationId,
    });
  });

  return { ...fixture, native, bootstrap };
}

test("synthetic General creates only an explicit v2 scope, submits once, and restores its durable transcript", async ({
  page,
}) => {
  const f = await general(page);

  await page.goto("/meri?scope=general");

  await composer(page).fill("General synthetic request");

  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();

  await expect(
    page.getByText("Initial synthetic answer", { exact: true }),
  ).toBeVisible();

  expect(f.bootstrap).toHaveLength(1);

  expect(f.bootstrap[0]).toMatchObject({
    schemaVersion: 2,
    scopeKind: "general",
    clientId: null,
  });

  expect(f.hints[0]).toEqual({
    clientId: null,
    conversationId: binding.conversationId,
  });

  expect(f.native.calls.submit).toHaveLength(1);

  await page.reload();

  await expect(
    page.getByText("Initial synthetic answer", { exact: true }),
  ).toHaveCount(1);

  await expect(
    page.getByText("Saved conversation history loaded.", { exact: true }),
  ).toHaveCount(0);

  expect(new Set(f.bootstrap.map((value) => JSON.stringify(value))).size).toBe(
    1,
  );

  expect(f.native.calls.submit).toHaveLength(1);

  const recent = page.getByRole("link", { name: /^Conversation / });

  await expect(recent).toHaveCount(1);

  await expect(recent).toHaveAttribute(
    "href",
    `/meri?scope=general&conversationId=${binding.conversationId}`,
  );

  await recent.click();

  await expect(page).toHaveURL(
    new RegExp(`scope=general&conversationId=${binding.conversationId}`),
  );

  await expect(
    page.getByText("Initial synthetic answer", { exact: true }),
  ).toHaveCount(1);

  expect(f.hints.at(-1)).toMatchObject({
    clientId: null,
    conversationId: binding.conversationId,
  });

  expect(f.unexpected).toEqual([]);
});

test("a bare General link carries the confirmed id, reopens the empty conversation, and starts a new one after its first message", async ({
  page,
}) => {
  const f = await general(page);
  const request = (index: number) =>
    (f.bootstrap[index] as { requestId: string }).requestId;

  await page.goto("/meri?scope=general");
  await expect(page).toHaveURL(
    new RegExp(`scope=general&conversationId=${binding.conversationId}`),
  );
  expect(f.bootstrap).toHaveLength(1);

  // Opening the scope again before any message reopens the same request and conversation.
  await page.goto("/meri?scope=general");
  await expect(page).toHaveURL(
    new RegExp(`conversationId=${binding.conversationId}`),
  );
  expect(f.bootstrap).toHaveLength(2);
  expect(request(1)).toBe(request(0));

  await composer(page).fill("General synthetic request");
  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();
  await expect(
    page.getByText("Initial synthetic answer", { exact: true }),
  ).toBeVisible();

  // After the first message the bare link is a new conversation with its own request.
  await page.goto("/meri?scope=general");
  await expect.poll(() => f.bootstrap.length).toBe(3);
  expect(request(2)).not.toBe(request(0));
  expect(f.unexpected).toEqual([]);
});

test("a request whose delivery is uncertain stays in the transcript with its retry and is never merged into the next message", async ({
  page,
}) => {
  const f = await general(page);
  let dropFirst = true;
  await page.route("**/api/conversations/submit", (route) => {
    if (!dropFirst) return route.fallback();
    dropFirst = false;
    return route.abort();
  });

  await page.goto("/meri?scope=general");
  await composer(page).fill("First request");
  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();
  await expect(
    page.getByText("Delivery is uncertain", { exact: false }),
  ).toBeVisible();
  // The attempt is shown once, in the transcript; the box is free for the next message.
  await expect(page.getByText(/First request/)).toBeVisible();
  await expect(composer(page)).toHaveValue("");
  await expect(
    page.getByText("Your last request is still unconfirmed", { exact: false }),
  ).toBeVisible();
  await expect(sendButton(page)).toBeDisabled();

  await composer(page).fill("Second request");
  await expect(composer(page)).toHaveValue("Second request");

  await page.reload();
  await expect(page.getByText(/First request/)).toBeVisible();
  await expect(composer(page)).toHaveValue("Second request");
  // The journal resolves the attempt through whichever control the current read offers.
  await page
    .getByRole("button", {
      name: /Retry same request|Continue accepted request/,
    })
    .click();
  await expect(
    page.getByText("Initial synthetic answer", { exact: true }),
  ).toBeVisible();
  await expect(composer(page)).toHaveValue("Second request");
  await expect(page.getByText("Enter to send", { exact: false })).toBeVisible();
  expect(f.unexpected).toEqual([]);
});

test("synthetic General keeps Stop explicit and never cancels on page teardown", async ({
  page,
}) => {
  const f = await general(page, true);

  await page.goto("/meri?scope=general");

  await composer(page).fill("Running General request");
  await sendButton(page).click();

  await expect(stopButton(page)).toBeEnabled();

  expect(f.native.calls.cancel).toBe(0);
  await stopButton(page).click();

  await expect.poll(() => f.native.calls.cancel).toBe(1);

  await page.goto("/settings/personal");
  expect(f.native.calls.cancel).toBe(1);

  expect(f.unexpected).toEqual([]);
});

test("synthetic General lost Core acknowledgement retains exactly the same request identity", async ({
  page,
}) => {
  const f = await general(page);
  let lost = true;

  const requests: unknown[] = [];

  await page.route("**/api/capiro/meri.conversation.bootstrap.v2", (route) => {
    const { body } = route.request().postDataJSON();
    requests.push(body);

    if (lost) {
      lost = false;
      return route.abort("failed");
    }

    return reply(route, {
      ...body,
      tenantId: binding.tenantId,
      actorId: binding.actorId,
      conversationId: binding.conversationId,
    });
  });

  await page.goto("/meri?scope=general");

  await expect(
    page.getByRole("button", { name: "Retry conversation", exact: true }),
  ).toBeVisible();

  expect(f.hints).toEqual([]);
  expect(f.native.calls.allocate).toEqual([]);

  await page
    .getByRole("button", { name: "Retry conversation", exact: true })
    .click();

  await expect(composer(page)).toBeEditable();

  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);

  await expect.poll(() => f.hints.length).toBe(1);

  expect(f.unexpected).toEqual([]);
});

for (const [name, change] of [
  ["client selection", { selectedClientId: clientId }],

  ["other actor", { actorId: "10000000-0000-4000-8000-000000000099" }],
] as const)
  test(`synthetic General rejects ${name} in a session receipt before input`, async ({
    page,
  }) => {
    const f = await general(page);

    await page.route("**/api/action-followthrough/session", (route) =>
      reply(route, {
        credential: `action_session_${"s".repeat(43)}`,
        expiresAtMs: Date.now() + 60_000,

        context: { ...generalContext, ...change },
      }),
    );

    await page.goto("/meri?scope=general");

    await expect(
      page.getByRole("heading", {
        name: "Conversation connection unavailable",
        exact: true,
      }),
    ).toBeVisible();

    await expect(sendButton(page)).toBeDisabled();

    expect(f.native.calls.allocate).toEqual([]);
    expect(f.native.calls.submit).toEqual([]);

    expect(f.unexpected).toEqual([]);
  });

for (const malformed of [false, true])
  test(`synthetic General ${malformed ? "malformed" : "canonical"} revocation hides the retained answer and fences future input`, async ({
    page,
  }) => {
    const f = await general(page);

    await page.goto("/meri?scope=general");
    await composer(page).fill("General private answer");
    await sendButton(page).click();

    await expect(
      page.getByText("Initial synthetic answer", { exact: true }),
    ).toBeVisible();

    await expect(
      page.getByText("Saved conversation history loaded.", { exact: true }),
    ).toHaveCount(0);
    // A healthy conversation shows no permanent manual reload; the revocation is discovered by
    // the next real read of this exact conversation, which reopening the route performs.
    await expect(
      page.getByRole("button", { name: "Reload saved history", exact: true }),
    ).toHaveCount(0);
    await page.route("**/api/conversations/transcript", (route) =>
      malformed
        ? route.fulfill({ status: 403, body: "not JSON" })
        : reply(route, { error: { code: "MEMBERSHIP_REVOKED" } }, 403),
    );

    await page.reload();

    await expect(
      page.getByText("Initial synthetic answer", { exact: true }),
    ).toHaveCount(0);

    await expect(sendButton(page)).toBeDisabled();
    expect(f.native.calls.submit).toHaveLength(1);

    expect(f.unexpected).toEqual([]);
  });

test("synthetic General mixed selectors never bootstrap or issue a session", async ({
  page,
}) => {
  const f = await general(page);

  await page.goto(`/meri?scope=general&clientId=${clientId}`);

  await expect(
    page.getByRole("heading", {
      name: "Conversation selection unavailable",
      exact: true,
    }),
  ).toBeVisible();

  expect(f.bootstrap).toEqual([]);
  expect(f.hints).toEqual([]);
  expect(f.native.calls.allocate).toEqual([]);

  expect(f.unexpected).toEqual([]);
});

const newConversation = (page: Page) =>
  page.getByRole("button", { name: "New conversation", exact: true });

test("a send whose delivery is uncertain makes the bare General link a new conversation", async ({
  page,
}) => {
  const f = await general(page);
  const request = (index: number) =>
    (f.bootstrap[index] as { requestId: string }).requestId;
  await page.route("**/api/conversations/submit", (route) => route.abort());

  await page.goto("/meri?scope=general");
  await expect(page).toHaveURL(
    new RegExp(`conversationId=${binding.conversationId}`),
  );
  await composer(page).fill("Unconfirmed request");
  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();
  await expect(
    page.getByText("Delivery is uncertain", { exact: false }),
  ).toBeVisible();

  // Attempted is enough: the bare link never reopens a conversation holding an unconfirmed send.
  await page.goto("/meri?scope=general");
  await expect.poll(() => f.bootstrap.length).toBe(2);
  expect(request(1)).not.toBe(request(0));
  expect(f.unexpected).toEqual([]);
});

test("New conversation from a conversation with a message opens a new one", async ({
  page,
}) => {
  const f = await general(page);
  const request = (index: number) =>
    (f.bootstrap[index] as { requestId: string }).requestId;

  await page.goto("/meri?scope=general");
  await composer(page).fill("General synthetic request");
  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();
  await expect(
    page.getByText("Initial synthetic answer", { exact: true }),
  ).toBeVisible();

  await newConversation(page).click();
  await expect.poll(() => f.bootstrap.length).toBe(2);
  expect(request(1)).not.toBe(request(0));
  await expect(page).toHaveURL(
    new RegExp(`scope=general&conversationId=${binding.conversationId}`),
  );
  expect(f.unexpected).toEqual([]);
});

test("New conversation from the still-empty conversation reopens it with the composer ready", async ({
  page,
}) => {
  const f = await general(page);
  const request = (index: number) =>
    (f.bootstrap[index] as { requestId: string }).requestId;

  await page.goto("/meri?scope=general");
  await expect(page).toHaveURL(
    new RegExp(`scope=general&conversationId=${binding.conversationId}`),
  );
  await expect(composer(page)).toBeFocused();
  await newConversation(page).focus();
  await expect(composer(page)).not.toBeFocused();

  await newConversation(page).click();
  await expect.poll(() => f.bootstrap.length).toBe(2);
  expect(request(1)).toBe(request(0));
  await expect(page).toHaveURL(
    new RegExp(`scope=general&conversationId=${binding.conversationId}`),
  );
  await expect(composer(page)).toBeFocused();
  await expect(composer(page)).toHaveValue("");
  expect(f.native.calls.allocate).toEqual([]);
  expect(f.unexpected).toEqual([]);
});

test("New conversation from a conversation holding an unconfirmed send opens a new one and leaves that send in its own thread", async ({
  page,
}) => {
  const f = await general(page);
  const first = binding.conversationId;
  const second = "30000000-0000-4000-8000-000000000033";
  // Core creates one conversation per request id and reopens it for the same id.
  const requests: string[] = [];
  const byRequest = new Map<string, string>();
  await page.route("**/api/capiro/meri.conversation.bootstrap.v2", (route) => {
    const { body } = route.request().postDataJSON() as {
      body: { requestId: string };
    };
    requests.push(body.requestId);
    if (!byRequest.has(body.requestId))
      byRequest.set(body.requestId, [first, second][byRequest.size]!);
    return reply(route, {
      ...body,
      tenantId: binding.tenantId,
      actorId: binding.actorId,
      conversationId: byRequest.get(body.requestId),
    });
  });
  // Each session is issued for the conversation the page asks for.
  await page.route("**/api/action-followthrough/session", (route) => {
    const hint = route.request().postDataJSON() as { conversationId: string };
    return reply(route, {
      credential: `action_session_${"s".repeat(43)}`,
      expiresAtMs: Date.now() + 60_000,
      context: { ...generalContext, conversationId: hint.conversationId },
    });
  });
  await page.route("**/api/conversations/submit", (route) => route.abort());

  await page.goto("/meri?scope=general");
  await expect(page).toHaveURL(
    new RegExp(`scope=general&conversationId=${first}$`),
  );
  await composer(page).fill("Unconfirmed request");
  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();
  await expect(
    page.getByText("Delivery is uncertain", { exact: false }),
  ).toBeVisible();

  // Never a no-op: a new request opens a new, clean conversation.
  await newConversation(page).click();
  await expect(page).toHaveURL(
    new RegExp(`scope=general&conversationId=${second}$`),
  );
  expect(requests).toHaveLength(2);
  expect(requests[1]).not.toBe(requests[0]);
  await expect(composer(page)).toBeFocused();
  await expect(composer(page)).toHaveValue("");
  await expect(page.getByText(/Unconfirmed request/)).toHaveCount(0);
  await expect(
    page.getByText("Your last request is still unconfirmed", { exact: false }),
  ).toHaveCount(0);

  // The bare link reopens that still-empty conversation, never the one left behind.
  await page.goto("/meri?scope=general");
  await expect(page).toHaveURL(new RegExp(`conversationId=${second}$`));
  await expect.poll(() => requests.length).toBe(3);
  expect(requests[2]).toBe(requests[1]);

  // The unconfirmed send is kept in its own thread, with its recovery; nothing was discarded.
  await page.goto(`/meri?scope=general&conversationId=${first}`);
  await expect(page.getByText(/Unconfirmed request/)).toBeVisible();
  await expect(
    page.getByText("Your last request is still unconfirmed", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /Retry same request|Continue accepted request/,
    }),
  ).toBeVisible();
  expect(requests).toHaveLength(3);
  expect(f.unexpected).toEqual([]);
});

test("an idle General conversation is confirmed once: a session renewal reissues the session for the same conversation and leaves the address alone", async ({
  page,
}) => {
  // Short synthetic session cap: the owner renews halfway through, so one renewal happens while idle.
  const f = await general(page, false, 12_000);

  await page.goto("/meri?scope=general");
  await expect(page).toHaveURL(
    new RegExp(`scope=general&conversationId=${binding.conversationId}$`),
  );
  await expect(composer(page)).toBeFocused();
  const address = page.url();
  expect(f.bootstrap).toHaveLength(1);
  expect(f.hints).toHaveLength(1);
  await composer(page).evaluate((element) => {
    element.dataset["idleMarker"] = "planted";
  });

  // Nothing happens on the page until the renewal; the only idle request is that one issuance,
  // for the exact conversation and run already bound.
  await expect.poll(() => f.hints.length, { timeout: 15_000 }).toBe(2);
  expect(f.hints[1]).toEqual({
    clientId: null,
    conversationId: binding.conversationId,
    runId: binding.runId,
  });
  await expect(composer(page)).toBeEditable();
  await page.waitForTimeout(3_000);
  expect(f.hints).toHaveLength(2);
  expect(f.bootstrap).toHaveLength(1);
  expect(page.url()).toBe(address);
  await expect(
    page.getByRole("heading", { name: "Preparing conversation" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Conversation connection unavailable" }),
  ).toHaveCount(0);
  // The same document and composer: a renewal never remounts what the person is looking at.
  await expect(composer(page)).toHaveAttribute("data-idle-marker", "planted");
  expect(f.unexpected).toEqual([]);
});
