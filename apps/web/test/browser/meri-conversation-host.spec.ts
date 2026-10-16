import { test, expect } from "@playwright/test";
import { client } from "../../tests/browser/fixtures";
import {
  setupConversation,
  connect,
  clientId,
  binding,
  nextBinding,
  contextFor,
  context,
  run,
  runFor,
  event,
  eventOf,
  status,
  history,
  sse,
  reply,
  composer,
  sendButton,
  stopButton,
} from "./meri-conversation-fixtures";

const noSamples = async (page: import("@playwright/test").Page) => {
  for (const text of ["Anduril", "Good morning, Jordan", "action_session_"])
    await expect(page.locator("body")).not.toContainText(text);
};

test("connects the exact account/client, loads the admitted transcript and resumes from its cursor", async ({
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
      return sse(r, [event(2, " plus current event"), status(3, "completed")]);
    },
  );
  await connect(page);
  expect(fixture.hints).toEqual([{ clientId }]);
  const turn = page.getByRole("article", { name: "Current turn" });
  await expect(turn.getByText("Previously stored request")).toBeVisible();
  await expect(
    turn.getByText("Service-backed transcript plus current event", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(turn.getByText("Completed", { exact: true })).toBeVisible();
  expect(calls).toEqual(["history", "reconnect"]);
  await expect(sendButton(page)).toBeDisabled();
  await expect(composer(page)).toBeEnabled();
  await noSamples(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await composer(page).focus();
  await expect(composer(page)).toBeFocused();
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

test("a finished run accepts the next prompt as the conversation's next run, keeping earlier turns", async ({
  page,
}, info) => {
  const f = await setupConversation(page, undefined, [
    context,
    contextFor(nextBinding),
  ]);
  await page.route("**/api/conversations/history", (r) =>
    reply(
      r,
      history([event(1, "First answer"), status(2, "completed")], {
        state: "completed",
        prompt: "First question",
      }),
    ),
  );
  const submits: { requestId: string; prompt: string }[] = [];
  await page.route("**/api/conversations/submit", (r) => {
    const body = r.request().postDataJSON();
    submits.push(body);
    return reply(r, {
      run: runFor("queued", nextBinding),
      requestId: body.requestId,
      lastSequence: 1,
      replayed: false,
    });
  });
  let subscriptions = 0;
  await page.route("**/api/conversations/events", (r) => {
    subscriptions++;
    expect(r.request().postDataJSON()).toEqual({
      command: {
        conversationId: binding.conversationId,
        intent: "view.subscribe",
      },
    });
    return sse(r, [
      status(1, "running", nextBinding),
      event(2, "Second answer", nextBinding),
      status(3, "completed", nextBinding),
    ]);
  });
  await connect(page);
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  await composer(page).fill("Second question");
  await composer(page).press("Enter");
  await expect(page.getByText("Second answer", { exact: true })).toBeVisible();
  const earlier = page.getByRole("article", { name: "Earlier turn 1" });
  await expect(earlier.getByText("First question")).toBeVisible();
  await expect(earlier.getByText("First answer")).toBeVisible();
  const current = page.getByRole("article", { name: "Current turn" });
  await expect(current.getByText("Second question")).toBeVisible();
  expect(f.hints).toEqual([
    { clientId },
    { clientId, conversationId: binding.conversationId },
  ]);
  expect(submits).toHaveLength(1);
  expect(Object.keys(submits[0]!)).toEqual(["requestId", "prompt"]);
  expect(submits[0]!.prompt).toBe("Second question");
  expect(subscriptions).toBe(1);
  // The composer stays usable for the third turn.
  await expect(composer(page)).toBeEnabled();
  await expect(composer(page)).toHaveValue("");
  await composer(page).fill("Third question");
  await expect(sendButton(page)).toBeEnabled();
  await page.screenshot({
    path: info.outputPath("meri-conversation-multi-turn.png"),
    fullPage: true,
  });
  expect(f.unexpected).toEqual([]);
});

test("streaming resumes from the accepted cursor after a stream ends early", async ({
  page,
}) => {
  const f = await setupConversation(page);
  await page.route("**/api/conversations/history", (r) =>
    reply(r, history([status(1, "running")])),
  );
  const cursors: string[] = [];
  await page.route(
    `**/api/conversations/events/${binding.conversationId}/stream`,
    (r) => {
      const cursor = r.request().headers()["x-meri-resume-sequence"]!;
      cursors.push(cursor);
      return cursor === "1"
        ? sse(r, [event(2, "Part one")])
        : sse(r, [event(3, " and part two"), status(4, "completed")]);
    },
  );
  await connect(page);
  await expect(
    page.getByText("Part one and part two", { exact: true }),
  ).toBeVisible();
  expect(cursors).toEqual(["1", "2"]);
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  expect(f.unexpected).toEqual([]);
});

test("repeated failed reconnects stop with an explicit Reconnect that resumes the cursor", async ({
  page,
}) => {
  test.setTimeout(45_000);
  const f = await setupConversation(page);
  await page.route("**/api/conversations/history", (r) =>
    reply(r, history([status(1, "running")])),
  );
  let attempts = 0,
    recover = false;
  await page.route(
    `**/api/conversations/events/${binding.conversationId}/stream`,
    (r) => {
      attempts++;
      expect(r.request().headers()["x-meri-resume-sequence"]).toBe("1");
      return recover
        ? sse(r, [event(2, "Recovered"), status(3, "completed")])
        : reply(r, { error: { code: "CONVERSATION_UNAVAILABLE" } }, 502);
    },
  );
  await connect(page);
  await expect(
    page.getByText(
      "Updates stopped arriving. The run continues on the service.",
    ),
  ).toBeVisible({ timeout: 20_000 });
  expect(attempts).toBe(4);
  recover = true;
  await page.getByRole("button", { name: "Reconnect", exact: true }).click();
  await expect(page.getByText("Recovered", { exact: true })).toBeVisible();
  expect(f.unexpected).toEqual([]);
});

test("Stop requests durable cancellation and the run status, not the receipt, ends the run", async ({
  page,
}) => {
  const f = await setupConversation(page);
  await page.route("**/api/conversations/history", (r) =>
    reply(r, history([status(1, "running")])),
  );
  let cancelled = false;
  await page.route(
    `**/api/conversations/events/${binding.conversationId}/stream`,
    (r) => {
      const cursor = r.request().headers()["x-meri-resume-sequence"];
      if (cursor === "1")
        return sse(r, [
          eventOf(2, "usage.recorded", {
            usageId: "b0000000-0000-4000-8000-00000000000b",
          }),
        ]);
      return sse(r, cancelled ? [status(3, "cancelled")] : []);
    },
  );
  const cancels: unknown[] = [];
  await page.route("**/api/conversations/cancel", (r) => {
    cancels.push(r.request().postDataJSON());
    cancelled = true;
    return reply(r, { state: "cancelled" });
  });
  await connect(page);
  await expect(stopButton(page)).toBeEnabled();
  await composer(page).fill("Draft while running");
  await expect(
    page.getByRole("button", { name: "Send message", exact: true }),
  ).toHaveCount(0);
  await stopButton(page).click();
  await expect(
    page.getByText("Stop request answered: run cancelled."),
  ).toBeVisible();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  expect(cancels).toEqual([{}]);
  await expect(composer(page)).toHaveValue("Draft while running");
  await expect(sendButton(page)).toBeEnabled();
  expect(f.unexpected).toEqual([]);
});

test("a completed cancel receipt never pretends the run was cancelled", async ({
  page,
}) => {
  const f = await setupConversation(page);
  await page.route("**/api/conversations/history", (r) =>
    reply(r, history([status(1, "running")])),
  );
  let done = false;
  await page.route(
    `**/api/conversations/events/${binding.conversationId}/stream`,
    (r) => (done ? sse(r, [status(2, "completed")]) : sse(r, [])),
  );
  await page.route("**/api/conversations/cancel", (r) => {
    done = true;
    return reply(r, { state: "completed" });
  });
  await connect(page);
  await stopButton(page).click();
  await expect(
    page.getByText("Stop request answered: run completed."),
  ).toBeVisible();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await expect(page.getByText("Cancelled", { exact: true })).toHaveCount(0);
  expect(f.unexpected).toEqual([]);
});

for (const status of [401, 403, 502])
  test(`owner ${status} never supplies a fixture transcript`, async ({
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
    await connect(page).catch(() => undefined);
    if (status === 502) {
      await expect(page.getByRole("alert")).toContainText(
        "CONVERSATION_UNAVAILABLE",
      );
      await expect(
        page.getByRole("button", { name: "Reload transcript", exact: true }),
      ).toBeVisible();
    } else
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

test("a foreign native actor receipt cannot create a ready host or dispatch conversation reads", async ({
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
  await expect(
    page.getByText(
      "The service could not verify this conversation. No sample transcript was substituted.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(sendButton(page)).toBeDisabled();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
  expect(f.hints).toEqual([{ clientId }, { clientId }]);
  expect(calls).toBe(0);
  expect(f.unexpected).toEqual([]);
});

test("an uncertain first submit retries the exact original request, then observes without a duplicate", async ({
  page,
}) => {
  const f = await setupConversation(page);
  await page.route("**/api/conversations/history", (r) =>
    reply(r, { error: { code: "NOT_FOUND" } }, 404),
  );
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
    return sse(r, [
      event(1, "Observed native response"),
      status(2, "completed"),
    ]);
  });
  await connect(page);
  await composer(page).fill("Original prompt");
  await sendButton(page).click();
  const retry = page.getByRole("button", {
    name: "Retry same request",
    exact: true,
  });
  await expect(retry).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: "Current turn" })
      .getByText("Original prompt"),
  ).toBeVisible();
  await expect(composer(page)).toBeEnabled();
  await composer(page).fill("Something else");
  await expect(sendButton(page)).toBeDisabled();
  await retry.click();
  await expect(
    page.getByText("Observed native response", { exact: true }),
  ).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
  expect(Object.keys(requests[0]!)).toEqual(["requestId", "prompt"]);
  expect(observations).toBe(1);
  await expect(composer(page)).toHaveValue("Something else");
  expect(f.unexpected).toEqual([]);
});

test("navigation keeps the uncertain request and rebinds the exact observed run before an explicit retry", async ({
  page,
}) => {
  const f = await setupConversation(page);
  await page.route("**/api/conversations/history", (r) =>
    reply(r, { error: { code: "NOT_FOUND" } }, 404),
  );
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
  await page.route("**/api/conversations/events", (r) =>
    sse(r, [status(1, "completed")]),
  );
  await connect(page);
  await composer(page).fill("Retain across navigation");
  await sendButton(page).click();
  await expect(
    page.getByRole("button", { name: "Retry same request", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Product modes", exact: true })
    .getByRole("link", { name: "Portfolio", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/portfolio/${clientId}$`));
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "Retry same request", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: "Current turn" })
      .getByText("Retain across navigation"),
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
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  expect(requests[1]).toEqual(requests[0]);
  expect(f.unexpected).toEqual([]);
});

for (const key of ["sessionId", "orgId", "userId"])
  test(`${key} replacement drops the transcript and rejects a settled late history`, async ({
    page,
  }) => {
    const f = await setupConversation(page);
    let release!: () => void, settle!: () => void, enter!: () => void;
    const entered = new Promise<void>((r) => {
      enter = r;
    });
    const held = new Promise<void>((r) => {
        release = r;
      }),
      settled = new Promise<void>((r) => {
        settle = r;
      });
    let first = true;
    await page.route("**/api/conversations/history", async (r) => {
      if (!first) return reply(r, { error: { code: "NOT_FOUND" } }, 404);
      first = false;
      enter();
      await held;
      await reply(r, history()).catch(() => {});
      settle();
    });
    await page.goto(`/meri?clientId=${clientId}`);
    await entered;
    await page.evaluate(
      (name) =>
        dispatchEvent(
          new CustomEvent("test:session", {
            detail: { [name]: "replacement" },
          }),
        ),
      key,
    );
    release();
    await settled;
    await page.waitForTimeout(200);
    await expect(
      page.getByText("Service-backed transcript", { exact: true }),
    ).toHaveCount(0);
    expect(f.unexpected).toEqual([]);
  });

test("client replacement rejects a settled late transcript and verifies a new connection", async ({
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
  await page.goto(`/meri?clientId=${clientId}`);
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
  // The other client's session is refused by its own receipt check, never reusing the first.
  await expect(
    page.getByText(
      "The service could not verify this conversation. No sample transcript was substituted.",
    ),
  ).toBeVisible();
  expect(f.unexpected).toEqual([]);
});

test("an expired session offers Reconnect, which rebinds the exact run and resumes", async ({
  page,
}) => {
  const f = await setupConversation(page, undefined, [context], 2_500);
  await page.route("**/api/conversations/history", (r) =>
    reply(
      r,
      history([event(1, "Before expiry"), status(2, "completed")], {
        state: "completed",
      }),
    ),
  );
  await connect(page);
  await expect(page.getByText("Before expiry", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Conversation session expired",
      exact: true,
    }),
  ).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Reconnect", exact: true }).click();
  await expect(page.getByText("Before expiry", { exact: true })).toBeVisible();
  expect(f.hints).toEqual([
    { clientId },
    { clientId, conversationId: binding.conversationId, runId: binding.runId },
  ]);
  expect(f.unexpected).toEqual([]);
});

test("approval requests are shown without a decision control", async ({
  page,
}) => {
  const f = await setupConversation(page);
  await page.route("**/api/conversations/history", (r) =>
    reply(
      r,
      history(
        [
          eventOf(1, "approval.required", {
            proposalId: "c0000000-0000-4000-8000-00000000000c",
            commandSha256: "c".repeat(64),
            expiresAt: "2026-10-20T12:00:00Z",
          }),
          status(2, "waiting-for-approval"),
        ],
        { state: "waiting-for-approval" },
      ),
    ),
  );
  await connect(page);
  const notice = page
    .getByRole("region", { name: "Approval required" })
    .or(page.getByText("Approval required", { exact: true }));
  await expect(notice.first()).toBeVisible();
  await expect(
    page.getByText(/Decisions cannot be made here yet/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Approve|Reject/ }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Waiting for approval", { exact: true }),
  ).toBeVisible();
  await expect(stopButton(page)).toBeEnabled();
  expect(f.unexpected).toEqual([]);
});

test("ordinary sidebar destinations name the exact missing service", async ({
  page,
}) => {
  const f = await setupConversation(page);
  await page.route("**/api/conversations/history", (r) =>
    reply(r, history([status(1, "completed")], { state: "completed" })),
  );
  await connect(page);
  const nav = page.getByRole("navigation", { name: "Meri workspace" });
  const approvals = nav.getByRole("button", { name: "Approvals", exact: true });
  await expect(approvals).toBeDisabled();
  await expect(approvals).toHaveAttribute("title", /approval list route/);
  await expect(
    page.getByRole("button", { name: "New conversation", exact: true }),
  ).toHaveAttribute("title", /Not available yet/);
  await expect(
    page.getByText("Recent conversations unavailable"),
  ).toHaveAttribute("title", /conversation list/);
  await expect(
    page.getByRole("button", { name: "Attach", exact: true }),
  ).toBeDisabled();
  expect(f.unexpected).toEqual([]);
});
