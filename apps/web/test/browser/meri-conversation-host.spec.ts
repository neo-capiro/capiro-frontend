import { test, expect } from "@playwright/test";
import { client } from "../../tests/browser/fixtures";
import {
  setupConversation,
  connect,
  clientId,
  binding,
  run,
  context,
  event,
  history,
  stream,
  reply,
} from "./meri-conversation-fixtures";
test("connects exact native account/client, renders only admitted history, reconnects from its cursor", async ({
  page,
}, info) => {
  const fixture = await setupConversation(page);
  const calls: string[] = [];
  await page.route("**/api/conversations/history", (r) => {
    calls.push("history");
    expect(r.request().postDataJSON()).toEqual({ limit: 100 });
    return reply(r, history());
  });
  await page.route(
    `**/api/conversations/events/${binding.conversationId}/stream`,
    (r) => {
      calls.push("reconnect");
      expect(r.request().method()).toBe("GET");
      expect(r.request().headers()["x-meri-resume-sequence"]).toBe("1");
      expect(r.request().headers()["last-event-id"]).toBeUndefined();
      expect(r.request().postData()).toBeNull();
      return r.fulfill({
        status: 200,
        headers: {
          "content-type": "text/event-stream",
          "x-vercel-ai-ui-message-stream": "v1",
        },
        body: stream([event(2, " plus current event")]),
      });
    },
  );
  await connect(page);
  expect(fixture.hints).toEqual([{ clientId }]);
  expect(calls).toEqual([]);
  await page
    .getByRole("button", { name: "Load current transcript", exact: true })
    .click();
  await expect(
    page.getByText("Service-backed transcript", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Observe current run", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Reconnect observed events", exact: true })
    .click();
  await expect(
    page.getByText("Service-backed transcript plus current event", {
      exact: true,
    }),
  ).toBeVisible();
  expect(calls).toEqual(["history", "reconnect"]);
  await expect(page.locator("body")).not.toContainText("Anduril");
  await expect(page.locator("body")).not.toContainText("Good morning, Jordan");
  await expect(page.locator("body")).not.toContainText("action_session_");
  await page.setViewportSize({ width: 390, height: 844 });
  const reconnect = page.getByRole("button", {
    name: "Reconnect observed events",
    exact: true,
  });
  await reconnect.focus();
  await expect(reconnect).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("meri-conversation-mobile.png"),
    fullPage: true,
  });
  expect(fixture.unexpected).toEqual([]);
});
for (const status of [401, 403, 502])
  test(`owner ${status} never supplies fixture transcript`, async ({
    page,
  }) => {
    const f = await setupConversation(page);
    await page.route("**/api/conversations/history", (r) =>
      reply(
        r,
        {
          error: {
            code:
              status === 502 ? "CONVERSATION_UNAVAILABLE" : "SESSION_REFUSED",
          },
        },
        status,
      ),
    );
    await connect(page);
    await page
      .getByRole("button", { name: "Load current transcript", exact: true })
      .click();
    if (status === 502)
      await expect(page.getByRole("alert")).toContainText(
        "CONVERSATION_UNAVAILABLE",
      );
    else
      await expect(
        page.getByRole("heading", {
          name: "Conversation session expired",
          exact: true,
        }),
      ).toBeVisible();
    await expect(
      page.getByText("Service-backed transcript", { exact: true }),
    ).toHaveCount(0);
    expect(f.unexpected).toEqual([]);
  });
test("foreign native actor receipt cannot create a ready host or dispatch conversation reads", async ({
  page,
}) => {
  const f = await setupConversation(page, (receipt) => ({
    ...receipt,
    context: { ...context, actorId: "foreign-user" },
  }));
  let calls = 0;
  await page.route("**/api/conversations/**", (r) => {
    calls++;
    return reply(r, history());
  });
  await page.goto(`/meri?clientId=${clientId}`);
  await page
    .getByRole("button", { name: "Connect conversation service", exact: true })
    .click();
  await expect(
    page.getByText(
      "The service could not verify this conversation. No sample transcript was substituted.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(calls).toBe(0);
  expect(f.unexpected).toEqual([]);
});
test("unknown submit retries exact original request input, then observes current run without duplicate submit", async ({
  page,
}) => {
  const f = await setupConversation(page);
  const requests: { requestId: string; prompt: string }[] = [];
  await page.route("**/api/conversations/submit", (r) => {
    const body = r.request().postDataJSON();
    requests.push(body);
    return requests.length === 1
      ? reply(r, { error: { code: "CONVERSATION_UNAVAILABLE" } }, 502)
      : reply(r, {
          run,
          requestId: body.requestId,
          lastSequence: 1,
          replayed: true,
        });
  });
  let observations = 0;
  await page.route("**/api/conversations/events", (r) => {
    observations++;
    expect(r.request().postDataJSON()).toEqual({
      command: {
        conversationId: binding.conversationId,
        intent: "view.subscribe",
      },
    });
    return r.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "x-vercel-ai-ui-message-stream": "v1",
      },
      body: stream([event(1, "Observed native response")]),
    });
  });
  await connect(page);
  await page
    .getByLabel("Meri message", { exact: true })
    .fill("Original prompt");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry same request", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Meri message", { exact: true })).toBeDisabled();
  await page
    .getByRole("button", { name: "Retry same request", exact: true })
    .click();
  await expect(
    page.getByText("The submitted request was observed by the service.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
  expect(Object.keys(requests[0]!)).toEqual(["requestId", "prompt"]);
  await page
    .getByRole("button", { name: "Observe current run", exact: true })
    .click();
  await expect(
    page.getByText("Observed native response", { exact: true }),
  ).toBeVisible();
  expect(observations).toBe(1);
  expect(requests).toHaveLength(2);
  expect(f.unexpected).toEqual([]);
});
test("cancel response completed stays completed and never pretends cancellation", async ({
  page,
}) => {
  const f = await setupConversation(page);
  await page.route("**/api/conversations/history", (r) => reply(r, history()));
  let cancels = 0;
  await page.route("**/api/conversations/cancel", (r) => {
    cancels++;
    expect(r.request().postDataJSON()).toEqual({});
    return reply(r, { state: "completed" });
  });
  await connect(page);
  await page
    .getByRole("button", { name: "Load current transcript", exact: true })
    .click();
  await expect(
    page.getByText("Service-backed transcript", { exact: true }),
  ).toBeVisible();
  expect(cancels).toBe(0);
  await page
    .getByRole("button", { name: "Cancel current run", exact: true })
    .click();
  await expect(
    page.getByText("Cancellation response: completed", { exact: true }),
  ).toBeVisible();
  expect(cancels).toBe(1);
  expect(f.unexpected).toEqual([]);
});
for (const key of ["sessionId", "orgId", "userId"])
  test(`${key} replacement drops transcript and rejects settled late history`, async ({
    page,
  }) => {
    const f = await setupConversation(page);
    let release!: () => void, settle!: () => void;
    const held = new Promise<void>((r) => {
        release = r;
      }),
      settled = new Promise<void>((r) => {
        settle = r;
      });
    await page.route("**/api/conversations/history", async (r) => {
      await held;
      await reply(r, history()).catch(() => {});
      settle();
    });
    await connect(page);
    await page
      .getByRole("button", { name: "Load current transcript", exact: true })
      .click();
    await page.evaluate(
      (name) =>
        dispatchEvent(
          new CustomEvent("test:session", {
            detail: { [name]: "replacement" },
          }),
        ),
      key,
    );
    await expect(
      page.getByRole("button", {
        name: "Connect conversation service",
        exact: true,
      }),
    ).toBeVisible();
    release();
    await settled;
    await expect(
      page.getByText("Service-backed transcript", { exact: true }),
    ).toHaveCount(0);
    expect(f.unexpected).toEqual([]);
  });

test("navigation retains unknown original input and rebinds exact observed selectors before explicit retry", async ({
  page,
}) => {
  const f = await setupConversation(page);
  const requests: object[] = [];
  await page.route("**/api/conversations/submit", (r) => {
    const body = r.request().postDataJSON();
    requests.push(body);
    return requests.length === 1
      ? reply(r, { error: { code: "CONVERSATION_UNAVAILABLE" } }, 502)
      : reply(r, {
          run,
          requestId: body.requestId,
          lastSequence: 1,
          replayed: true,
        });
  });
  await connect(page);
  await page
    .getByLabel("Meri message", { exact: true })
    .fill("Retain across navigation");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry same request", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Product modes", exact: true })
    .getByRole("link", { name: "Portfolio", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/portfolio/${clientId}$`));
  await page.goBack();
  await page
    .getByRole("button", { name: "Connect conversation service", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry same request", exact: true }),
  ).toBeVisible();
  expect(f.hints[1]).toEqual({
    clientId,
    conversationId: binding.conversationId,
    runId: binding.runId,
  });
  expect(requests).toHaveLength(1);
  await page
    .getByRole("button", { name: "Retry same request", exact: true })
    .click();
  await expect(
    page.getByText("The submitted request was observed by the service.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(requests[1]).toEqual(requests[0]);
  expect(f.unexpected).toEqual([]);
});
test("client replacement rejects settled late transcript and requires a new verified connection", async ({
  page,
}) => {
  const f = await setupConversation(page);
  const otherId = "10000000-0000-4000-8000-000000000002";
  await page.route(`**/api/backend/core/clients/${otherId}`, (r) =>
    reply(r, { ...client, id: otherId, name: "Other permitted client" }),
  );
  let release!: () => void, settle!: () => void, enter!: () => void;
  const entered = new Promise<void>((resolve) => {
    enter = resolve;
  });
  const held = new Promise<void>((r) => {
      release = r;
    }),
    settled = new Promise<void>((r) => {
      settle = r;
    });
  await page.route("**/api/conversations/history", async (r) => {
    enter();
    await held;
    await reply(r, history()).catch(() => {});
    settle();
  });
  await connect(page);
  await page
    .getByRole("button", { name: "Load current transcript", exact: true })
    .click();
  await entered;
  await page.evaluate((id) => {
    window.history.pushState({}, "", `/meri?clientId=${id}`);
    dispatchEvent(new PopStateEvent("popstate"));
  }, otherId);
  await expect(page.getByText(/Other permitted client/).first()).toBeVisible();
  release();
  await settled;
  await expect(
    page.getByText("Service-backed transcript", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Connect conversation service",
      exact: true,
    }),
  ).toBeVisible();
  expect(f.unexpected).toEqual([]);
});
